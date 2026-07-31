import test from "node:test";
import assert from "node:assert/strict";
import {
    createRazorpayOrder,
    processRazorpayCheckoutVerification,
    reconcileRazorpayOrderPayments,
    processRazorpayWebhook,
    signRazorpayPayload,
    toRazorpayPaise,
    verifyRazorpayCheckoutSignature,
} from "../services/razorpayPaymentService.js";

class TestError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

test("razorpay service converts rupees to paise", () => {
    assert.equal(toRazorpayPaise(123.45), 12345);
});

test("razorpay service creates provider order with internal order metadata", async () => {
    const seen = {};
    const fetchImpl = async (url, options) => {
        seen.url = url;
        seen.options = options;

        return {
            ok: true,
            json: async () => ({
                id: "order_rzp_123",
                amount: 5100,
                currency: "INR",
            }),
        };
    };

    const order = await createRazorpayOrder({
        internalOrderId: "internal-1",
        amount: 51,
        userId: "user-1",
        keyId: "rzp_test_key",
        keySecret: "rzp_secret",
        fetchImpl,
        ErrorClass: TestError,
    });

    const body = JSON.parse(seen.options.body);

    assert.equal(order.id, "order_rzp_123");
    assert.equal(body.amount, 5100);
    assert.equal(body.receipt, "internal-1");
    assert.equal(body.notes.userId, "user-1");
    assert.match(seen.options.headers.Authorization, /^Basic /);
});

test("razorpay checkout signature verification rejects tampered callback", () => {
    const keySecret = "secret";
    const validSignature = signRazorpayPayload("order_1|pay_1", keySecret);

    assert.doesNotThrow(() =>
        verifyRazorpayCheckoutSignature({
            razorpayOrderId: "order_1",
            razorpayPaymentId: "pay_1",
            razorpaySignature: validSignature,
            keySecret,
            ErrorClass: TestError,
        })
    );

    assert.throws(
        () =>
            verifyRazorpayCheckoutSignature({
                razorpayOrderId: "order_1",
                razorpayPaymentId: "pay_2",
                razorpaySignature: validSignature,
                keySecret,
                ErrorClass: TestError,
            }),
        /Invalid Razorpay payment signature/
    );
});

test("razorpay webhook persists and publishes successful payment event once", async () => {
    const webhookSecret = "whsec";
    const rawBody = JSON.stringify({
        id: "evt_1",
        event: "payment.captured",
        payload: {
            payment: {
                entity: {
                    id: "pay_1",
                    order_id: "order_rzp_1",
                    notes: {
                        internalOrderId: "507f1f77bcf86cd799439011",
                        userId: "507f1f77bcf86cd799439012",
                    },
                },
            },
        },
    });
    const published = [];
    const PaymentEventModel = {
        create: async (eventData) => ({
            ...eventData,
            updateOne: async () => {},
        }),
    };

    const result = await processRazorpayWebhook({
        rawBody,
        signature: signRazorpayPayload(rawBody, webhookSecret),
        webhookSecret,
        PaymentEventModel,
        publish: async (eventName, payload) => {
            published.push({ eventName, payload });
        },
        markPaymentSucceeded: async () => null,
        ErrorClass: TestError,
    });

    assert.equal(result.duplicate, false);
    assert.equal(published.length, 1);
    assert.equal(published[0].eventName, "PaymentSucceeded");
    assert.equal(published[0].payload.providerPaymentId, "pay_1");
});

test("razorpay webhook suppresses duplicate provider event", async () => {
    const webhookSecret = "whsec";
    const rawBody = JSON.stringify({
        id: "evt_dup",
        event: "payment.captured",
        payload: {
            payment: {
                entity: {
                    id: "pay_dup",
                    order_id: "order_rzp_dup",
                    notes: {
                        internalOrderId: "507f1f77bcf86cd799439011",
                    },
                },
            },
        },
    });
    const PaymentEventModel = {
        create: async () => {
            const error = new Error("duplicate");
            error.code = 11000;
            throw error;
        },
    };

    const result = await processRazorpayWebhook({
        rawBody,
        signature: signRazorpayPayload(rawBody, webhookSecret),
        webhookSecret,
        PaymentEventModel,
        publish: async () => {
            throw new Error("should not publish duplicate");
        },
        ErrorClass: TestError,
    });

    assert.equal(result.duplicate, true);
});

test("razorpay frontend verification persists idempotency event before publishing", async () => {
    const keySecret = "secret";
    const signature = signRazorpayPayload("order_1|pay_1", keySecret);
    const createdEvents = [];
    const published = [];
    const PaymentEventModel = {
        create: async (eventData) => {
            createdEvents.push(eventData);
            return { updateOne: async () => {} };
        },
    };

    const result = await processRazorpayCheckoutVerification({
        razorpayOrderId: "order_1",
        razorpayPaymentId: "pay_1",
        razorpaySignature: signature,
        orderId: "507f1f77bcf86cd799439011",
        userId: "507f1f77bcf86cd799439012",
        keyId: "rzp_key",
        keySecret,
        fetchPayment: async () => ({
            id: "pay_1",
            order_id: "order_1",
            status: "captured",
            amount: 5100,
            currency: "INR",
        }),
        PaymentEventModel,
        publish: async (eventName, payload) => {
            published.push({ eventName, payload });
        },
        markPaymentSucceeded: async () => null,
        ErrorClass: TestError,
    });

    assert.equal(result.duplicate, false);
    assert.equal(createdEvents[0].providerEventId, "frontend:pay_1");
    assert.equal(createdEvents[0].eventType, "payment.frontend_verified_captured");
    assert.equal(published[0].eventName, "PaymentSucceeded");
});

test("razorpay frontend verification does not publish success until payment is captured", async () => {
    const keySecret = "secret";
    const signature = signRazorpayPayload("order_1|pay_1", keySecret);
    const published = [];

    const result = await processRazorpayCheckoutVerification({
        razorpayOrderId: "order_1",
        razorpayPaymentId: "pay_1",
        razorpaySignature: signature,
        orderId: "507f1f77bcf86cd799439011",
        userId: "507f1f77bcf86cd799439012",
        keyId: "rzp_key",
        keySecret,
        fetchPayment: async () => ({
            id: "pay_1",
            order_id: "order_1",
            status: "authorized",
            amount: 5100,
            currency: "INR",
        }),
        PaymentEventModel: {
            create: async (eventData) => ({
                ...eventData,
                updateOne: async () => {},
            }),
        },
        publish: async (eventName, payload) => {
            published.push({ eventName, payload });
        },
        markPaymentSucceeded: async () => null,
        ErrorClass: TestError,
    });

    assert.equal(result.paymentStatus, "authorized");
    assert.equal(published.length, 0);
});

test("razorpay frontend verification rejects provider payment mismatch", async () => {
    const keySecret = "secret";
    const signature = signRazorpayPayload("order_1|pay_1", keySecret);

    await assert.rejects(
        () =>
            processRazorpayCheckoutVerification({
                razorpayOrderId: "order_1",
                razorpayPaymentId: "pay_1",
                razorpaySignature: signature,
                orderId: "507f1f77bcf86cd799439011",
                userId: "507f1f77bcf86cd799439012",
                keyId: "rzp_key",
                keySecret,
                fetchPayment: async () => ({
                    id: "pay_1",
                    order_id: "order_other",
                    status: "captured",
                }),
                PaymentEventModel: { create: async () => ({}) },
                ErrorClass: TestError,
            }),
        /does not match/
    );
});

test("razorpay reconciliation publishes captured payment for stuck orders", async () => {
    const published = [];
    const result = await reconcileRazorpayOrderPayments({
        razorpayOrderId: "order_1",
        orderId: "507f1f77bcf86cd799439011",
        userId: "507f1f77bcf86cd799439012",
        keyId: "rzp_key",
        keySecret: "secret",
        fetchOrderPayments: async () => [
            {
                id: "pay_1",
                order_id: "order_1",
                status: "captured",
                amount: 5100,
                currency: "INR",
            },
        ],
        PaymentEventModel: {
            create: async (eventData) => ({
                ...eventData,
                updateOne: async () => {},
            }),
        },
        publish: async (eventName, payload) => {
            published.push({ eventName, payload });
        },
        markPaymentSucceeded: async () => null,
        ErrorClass: TestError,
    });

    assert.equal(result.reconciled, true);
    assert.equal(result.event.providerEventId, "reconciliation:pay_1");
    assert.equal(published[0].eventName, "PaymentSucceeded");
});
