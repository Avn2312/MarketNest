import test from "node:test";
import assert from "node:assert/strict";
import {
    markRazorpayPaymentFailedIfConfigured,
    markRazorpayPaymentSucceededIfConfigured,
    updateRazorpayProviderOrderIdIfConfigured,
} from "../repositories/postgresPaymentRepository.js";

test("postgres payment success update is skipped when postgres payments are disabled", async () => {
    const result = await markRazorpayPaymentSucceededIfConfigured({
        providerOrderId: "order_1",
        providerPaymentId: "pay_1",
        enabled: false,
        transaction: async () => {
            throw new Error("should not open postgres without DATABASE_URL");
        },
    });

    assert.equal(result, null);
});

test("postgres payment success updates payment and confirms pending order when configured", async () => {
    const queries = [];
    const transaction = async (operation) =>
        operation({
            query: async (sql, params = []) => {
                queries.push({ sql, params });

                if (sql.includes("UPDATE payments")) {
                    return {
                        rows: [
                            {
                                id: "payment-1",
                                order_id: "order-1",
                                status: "succeeded",
                            },
                        ],
                    };
                }

                return { rows: [] };
            },
        });

    const payment = await markRazorpayPaymentSucceededIfConfigured({
        providerOrderId: "order_1",
        providerPaymentId: "pay_1",
        amount: 5100,
        transaction,
        enabled: true,
    });

    assert.equal(payment.status, "succeeded");
    assert.equal(queries.length, 2);
    assert.ok(queries[1].sql.includes("status = 'confirmed'"));
    assert.ok(queries[1].sql.includes("status = 'payment_pending'"));
});

test("postgres payment failure cancels pending order when configured", async () => {
    const queries = [];
    const transaction = async (operation) =>
        operation({
            query: async (sql, params = []) => {
                queries.push({ sql, params });

                if (sql.includes("UPDATE payments")) {
                    return {
                        rows: [
                            {
                                id: "payment-1",
                                order_id: "order-1",
                                status: "failed",
                            },
                        ],
                    };
                }

                return { rows: [] };
            },
        });

    const payment = await markRazorpayPaymentFailedIfConfigured({
        providerOrderId: "order_1",
        providerPaymentId: "pay_1",
        transaction,
        enabled: true,
    });

    assert.equal(payment.status, "failed");
    assert.ok(queries[1].sql.includes("status = 'cancelled'"));
});

test("postgres payment repository stores Razorpay provider order after checkout creation", async () => {
    const queries = [];
    const transaction = async (operation) =>
        operation({
            query: async (sql, params = []) => {
                queries.push({ sql, params });

                return {
                    rows: [
                        {
                            id: "payment-1",
                            order_id: "order-1",
                            provider: "razorpay",
                            provider_order_id: "order_rzp_1",
                        },
                    ],
                };
            },
        });

    const payment = await updateRazorpayProviderOrderIdIfConfigured({
        internalOrderId: "order-1",
        providerOrderId: "order_rzp_1",
        transaction,
        enabled: true,
    });

    assert.equal(payment.provider_order_id, "order_rzp_1");
    assert.ok(queries[0].sql.includes("UPDATE payments"));
    assert.deepEqual(queries[0].params, ["order-1", "order_rzp_1"]);
});
