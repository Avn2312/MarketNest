import test from "node:test";
import assert from "node:assert/strict";
import {
    markOrderPaidFromPayment,
    releaseOrderFromFailedPayment,
} from "../services/paymentOrderConsumer.js";

test("payment consumer marks only unpaid orders paid and increments coupon once", async () => {
    const calls = {
        orderUpdate: null,
        couponIncrements: 0,
        cartClears: 0,
    };
    const OrderModel = {
        findOneAndUpdate: async (query, update) => {
            calls.orderUpdate = { query, update };
            return { _id: query._id, couponCode: "SAVE10" };
        },
    };
    const CouponModel = {
        findOneAndUpdate: async () => {
            calls.couponIncrements += 1;
        },
    };
    const UserModel = {
        findByIdAndUpdate: async () => {
            calls.cartClears += 1;
        },
    };

    const order = await markOrderPaidFromPayment({
        orderId: "order-1",
        userId: "user-1",
        providerOrderId: "rzp-order",
        providerPaymentId: "rzp-payment",
        OrderModel,
        CouponModel,
        UserModel,
    });

    assert.equal(order._id, "order-1");
    assert.deepEqual(calls.orderUpdate.query, {
        _id: "order-1",
        isPaid: false,
        providerOrderId: "rzp-order",
    });
    assert.equal(calls.orderUpdate.update.providerPaymentId, "rzp-payment");
    assert.equal(calls.couponIncrements, 1);
    assert.equal(calls.cartClears, 1);
});

test("payment consumer skips side effects when order is already paid", async () => {
    const OrderModel = {
        findOneAndUpdate: async () => null,
    };
    const CouponModel = {
        findOneAndUpdate: async () => {
            throw new Error("coupon should not increment");
        },
    };
    const UserModel = {
        findByIdAndUpdate: async () => {
            throw new Error("cart should not clear");
        },
    };

    const order = await markOrderPaidFromPayment({
        orderId: "order-1",
        userId: "user-1",
        OrderModel,
        CouponModel,
        UserModel,
    });

    assert.equal(order, null);
});

test("payment consumer skips Mongo paid update when postgres orders are enabled", async () => {
    const order = await markOrderPaidFromPayment({
        orderId: "pg-order-1",
        shouldUsePostgresOrders: () => true,
        OrderModel: {
            findOneAndUpdate: async () => {
                throw new Error("Mongo order update should be skipped");
            },
        },
    });

    assert.equal(order, null);
});

test("payment consumer releases unpaid failed orders", async () => {
    const calls = {
        released: 0,
        deleted: null,
    };
    const order = {
        _id: "order-1",
        isPaid: false,
        populate: async () => order,
    };
    const OrderModel = {
        findOne: (query) => {
            assert.deepEqual(query, {
                _id: "order-1",
                providerOrderId: "rzp-order",
            });

            return {
                populate: async () => order,
            };
        },
        findByIdAndDelete: async (orderId) => {
            calls.deleted = orderId;
        },
    };

    const releasedOrder = await releaseOrderFromFailedPayment({
        orderId: "order-1",
        providerOrderId: "rzp-order",
        OrderModel,
        releaseInventory: async () => {
            calls.released += 1;
        },
    });

    assert.equal(releasedOrder._id, "order-1");
    assert.equal(calls.released, 1);
    assert.equal(calls.deleted, "order-1");
});

test("payment consumer skips Mongo failure release when postgres orders are enabled", async () => {
    const order = await releaseOrderFromFailedPayment({
        orderId: "pg-order-1",
        shouldUsePostgresOrders: () => true,
        OrderModel: {
            findOne: async () => {
                throw new Error("Mongo order lookup should be skipped");
            },
        },
    });

    assert.equal(order, null);
});
