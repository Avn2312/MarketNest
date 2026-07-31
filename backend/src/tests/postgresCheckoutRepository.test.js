import test from "node:test";
import assert from "node:assert/strict";
import {
    createPostgresCheckoutRepository,
    toCents,
} from "../repositories/postgresCheckoutRepository.js";
import { withPostgresTransaction } from "../db/postgres.js";

class TestError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

const createClient = ({ productStock = 5, coupon = null } = {}) => {
    const calls = [];

    return {
        calls,
        async query(sql, params = []) {
            calls.push({ sql, params });

            if (sql.includes("FROM products")) {
                return {
                    rows: [
                        {
                            id: "11111111-1111-4111-8111-111111111111",
                            seller_id: "22222222-2222-4222-8222-222222222222",
                            name: "Milk",
                            offer_price_cents: 4000,
                            stock_quantity: productStock,
                            status: "active",
                        },
                    ],
                };
            }

            if (sql.includes("FROM coupons")) {
                return { rows: coupon ? [coupon] : [] };
            }

            if (sql.includes("INSERT INTO orders")) {
                return {
                    rows: [
                        {
                            id: "33333333-3333-4333-8333-333333333333",
                            total_cents: params[6],
                        },
                    ],
                };
            }

            if (sql.includes("INSERT INTO payments")) {
                return {
                    rows: [
                        {
                            id: "44444444-4444-4444-8444-444444444444",
                            order_id: params[0],
                            provider: params[1],
                            provider_order_id: params[2],
                            status: params[3],
                            amount_cents: params[4],
                        },
                    ],
                };
            }

            return { rows: [] };
        },
    };
};

test("postgres checkout atomically creates order, reserves stock, records payment, and clears cart", async () => {
    const client = createClient({
        coupon: {
            id: "55555555-5555-4555-8555-555555555555",
            code: "SAVE10",
            type: "percent",
            value: 10,
            min_order_cents: 0,
            usage_limit: 5,
            used_count: 0,
            is_active: true,
            expires_at: null,
        },
    });
    const repository = createPostgresCheckoutRepository({
        ErrorClass: TestError,
        transaction: (operation) => operation(client),
    });

    const result = await repository.createOrderWithInventoryReservation({
        userId: "66666666-6666-4666-8666-666666666666",
        addressId: "77777777-7777-4777-8777-777777777777",
        items: [
            {
                productId: "11111111-1111-4111-8111-111111111111",
                quantity: 2,
            },
        ],
        couponCode: "save10",
        paymentProvider: "razorpay",
        providerOrderId: "order_provider_1",
    });

    assert.equal(result.totals.subtotalCents, 8000);
    assert.equal(result.totals.discountCents, 800);
    assert.equal(result.totals.taxCents, 160);
    assert.equal(result.totals.totalCents, 7360);
    assert.equal(result.payment.status, "created");
    assert.ok(
        client.calls.some((call) => call.sql.includes("FOR UPDATE")),
        "products and coupon rows are locked during checkout"
    );
    assert.ok(
        client.calls.some((call) => call.sql.includes("stock_quantity - $2")),
        "inventory is decremented inside the transaction"
    );
    assert.ok(
        client.calls.some((call) => call.sql.includes("cart_items = '{}'::jsonb")),
        "cart is cleared after order creation"
    );
});

test("postgres checkout rejects insufficient stock before creating the order", async () => {
    const client = createClient({ productStock: 1 });
    const repository = createPostgresCheckoutRepository({
        ErrorClass: TestError,
        transaction: (operation) => operation(client),
    });

    await assert.rejects(
        () =>
            repository.createOrderWithInventoryReservation({
                userId: "66666666-6666-4666-8666-666666666666",
                addressId: "77777777-7777-4777-8777-777777777777",
                items: [
                    {
                        productId: "11111111-1111-4111-8111-111111111111",
                        quantity: 2,
                    },
                ],
            }),
        /only 1 item/
    );
    assert.equal(
        client.calls.some((call) => call.sql.includes("INSERT INTO orders")),
        false
    );
});

test("postgres checkout releases reserved inventory when provider order setup fails", async () => {
    const calls = [];
    const repository = createPostgresCheckoutRepository({
        ErrorClass: TestError,
        transaction: (operation) =>
            operation({
                query: async (sql, params = []) => {
                    calls.push({ sql, params });

                    if (sql.includes("FROM orders")) {
                        return {
                            rows: [
                                {
                                    id: "33333333-3333-4333-8333-333333333333",
                                    status: "payment_pending",
                                },
                            ],
                        };
                    }

                    if (sql.includes("UPDATE orders")) {
                        return {
                            rows: [
                                {
                                    id: params[0],
                                    status: "cancelled",
                                    cancel_reason: params[1],
                                },
                            ],
                        };
                    }

                    return { rows: [] };
                },
            }),
    });

    const order = await repository.releasePendingOrderInventory({
        orderId: "33333333-3333-4333-8333-333333333333",
    });

    assert.equal(order.status, "cancelled");
    assert.ok(
        calls.some((call) =>
            call.sql.includes("stock_quantity + order_items.quantity")
        ),
        "reserved stock is restored"
    );
    assert.ok(
        calls.some((call) => call.sql.includes("SET status = 'failed'")),
        "created payment is marked failed"
    );
});

test("postgres checkout aggregates duplicate product lines before stock checks", async () => {
    const client = createClient({ productStock: 3 });
    const repository = createPostgresCheckoutRepository({
        ErrorClass: TestError,
        transaction: (operation) => operation(client),
    });

    await assert.rejects(
        () =>
            repository.createOrderWithInventoryReservation({
                userId: "66666666-6666-4666-8666-666666666666",
                addressId: "77777777-7777-4777-8777-777777777777",
                items: [
                    {
                        productId: "11111111-1111-4111-8111-111111111111",
                        quantity: 2,
                    },
                    {
                        productId: "11111111-1111-4111-8111-111111111111",
                        quantity: 2,
                    },
                ],
            }),
        /only 3 item/
    );
});

test("postgres transaction helper rolls back on failure", async () => {
    const calls = [];
    const client = {
        async query(sql) {
            calls.push(sql);
            return { rows: [] };
        },
        release() {
            calls.push("release");
        },
    };

    await assert.rejects(
        () =>
            withPostgresTransaction(async () => {
                throw new Error("boom");
            }, client),
        /boom/
    );

    assert.deepEqual(calls, ["BEGIN", "ROLLBACK"]);
});

test("money helper converts rupees to integer cents", () => {
    assert.equal(toCents(99.99), 9999);
});
