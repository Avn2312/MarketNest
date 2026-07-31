import test from "node:test";
import assert from "node:assert/strict";
import { ORDER_STATUS } from "../domain/orderState.js";
import {
    ORDER_EVENTS,
    clearOrderEventHandlers,
    publishOrderEvent,
    subscribeOrderEvent,
} from "../services/orderEventBus.js";
import { createOrderService } from "../services/orderService.js";

class TestError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

const createAddressModel = () => ({
    findOne: () => ({
        select: async () => ({ _id: "addr-1" }),
    }),
});

test("order service creates COD orders and publishes order lifecycle events", async () => {
    const events = [];
    const calls = {
        reserved: false,
        cartClears: 0,
        couponIncrements: 0,
    };
    const orderEntries = [
        {
            item: { product: "p1", quantity: 2 },
            product: { _id: "p1", name: "Milk", offerPrice: 40 },
        },
    ];
    const OrderModel = {
        create: async (payload) => ({
            _id: "order-1",
            ...payload,
        }),
    };
    const UserModel = {
        findByIdAndUpdate: async () => {
            calls.cartClears += 1;
        },
    };
    const CouponModel = {
        findByIdAndUpdate: async () => {
            calls.couponIncrements += 1;
        },
    };
    const orderService = createOrderService({
        OrderModel,
        UserModel,
        CouponModel,
        AddressModel: createAddressModel(),
        ErrorClass: TestError,
        isValidObjectId: () => true,
        getItems: async () => orderEntries,
        calculateTotals: async () => ({
            amount: 80,
            coupon: { _id: "coupon-1" },
            couponCode: "SAVE",
            discountAmount: 10,
        }),
        reserveInventoryForEntries: async () => {
            calls.reserved = true;
        },
        publishEvent: async (eventName, payload) => {
            events.push({ eventName, payload });
        },
    });

    const order = await orderService.createCodOrder({
        items: [{ product: "p1", quantity: 2 }],
        address: "addr-1",
        couponCode: "SAVE",
        userId: "user-1",
    });

    assert.equal(order._id, "order-1");
    assert.equal(order.paymentType, "COD");
    assert.equal(calls.reserved, true);
    assert.equal(calls.cartClears, 1);
    assert.equal(calls.couponIncrements, 1);
    assert.deepEqual(
        events.map((event) => event.eventName),
        [
            ORDER_EVENTS.INVENTORY_RESERVED,
            ORDER_EVENTS.ORDER_CREATED,
            ORDER_EVENTS.ORDER_CONFIRMED,
        ]
    );
});

test("order service creates COD orders through postgres storage when enabled", async () => {
    const events = [];
    const postgresCheckout = {
        createOrderWithInventoryReservation: async (payload) => {
            assert.equal(payload.paymentProvider, "cod");
            assert.equal(payload.userId, "user-1");
            return {
                order: {
                    id: "pg-order-1",
                    user_id: "user-1",
                    address_id: "addr-1",
                    total_cents: 5100,
                    discount_cents: 0,
                    coupon_code: "",
                    status: "order_placed",
                },
                payment: {
                    provider: "cod",
                    provider_order_id: "cod_pg-order-1",
                    status: "succeeded",
                },
            };
        },
    };
    const orderService = createOrderService({
        ErrorClass: TestError,
        shouldUsePostgresOrders: () => true,
        postgresCheckout,
        publishEvent: async (eventName, payload) => {
            events.push({ eventName, payload });
        },
    });

    const order = await orderService.createCodOrder({
        items: [{ productId: "p1", quantity: 1 }],
        address: "addr-1",
        userId: "user-1",
    });

    assert.equal(order._id, "pg-order-1");
    assert.equal(order.paymentType, "COD");
    assert.equal(order.amount, 51);
    assert.equal(order.isPaid, true);
    assert.deepEqual(
        events.map((event) => event.eventName),
        [ORDER_EVENTS.ORDER_CREATED, ORDER_EVENTS.ORDER_CONFIRMED]
    );
});

test("order service creates Razorpay checkout through postgres storage when enabled", async () => {
    const events = [];
    const calls = {
        providerOrderPayload: null,
        providerOrderUpdate: null,
    };
    const postgresCheckout = {
        createOrderWithInventoryReservation: async (payload) => {
            assert.equal(payload.paymentProvider, "razorpay");
            return {
                order: {
                    id: "pg-order-2",
                    user_id: "user-1",
                    address_id: "addr-1",
                    total_cents: 7360,
                    discount_cents: 800,
                    coupon_code: "SAVE10",
                    status: "payment_pending",
                },
                payment: {
                    provider: "razorpay",
                    provider_order_id: "razorpay_pg-order-2",
                    status: "created",
                },
            };
        },
    };
    const orderService = createOrderService({
        ErrorClass: TestError,
        shouldUsePostgresOrders: () => true,
        postgresCheckout,
        razorpayKeyId: "rzp_key",
        createRazorpayProviderOrder: async (payload) => {
            calls.providerOrderPayload = payload;
            return {
                id: "order_rzp_123",
                amount: 7360,
                currency: "INR",
            };
        },
        updateRazorpayProviderOrderId: async (payload) => {
            calls.providerOrderUpdate = payload;
        },
        publishEvent: async (eventName, payload) => {
            events.push({ eventName, payload });
        },
    });

    const checkout = await orderService.createRazorpayOrderForCheckout({
        items: [{ productId: "p1", quantity: 2 }],
        address: "addr-1",
        couponCode: "SAVE10",
        userId: "user-1",
    });

    assert.equal(checkout.key, "rzp_key");
    assert.equal(checkout.orderId, "pg-order-2");
    assert.equal(checkout.razorpayOrderId, "order_rzp_123");
    assert.equal(checkout.newOrder.providerOrderId, "order_rzp_123");
    assert.deepEqual(calls.providerOrderPayload, {
        internalOrderId: "pg-order-2",
        amount: 73.6,
        userId: "user-1",
    });
    assert.deepEqual(calls.providerOrderUpdate, {
        internalOrderId: "pg-order-2",
        providerOrderId: "order_rzp_123",
    });
    assert.equal(events[0].eventName, ORDER_EVENTS.ORDER_CREATED);
});

test("order service compensates postgres Razorpay checkout when provider order creation fails", async () => {
    const calls = {
        releasedOrderId: null,
    };
    const postgresCheckout = {
        createOrderWithInventoryReservation: async () => ({
            order: {
                id: "pg-order-failed",
                user_id: "user-1",
                total_cents: 5100,
                status: "payment_pending",
            },
            payment: {
                provider: "razorpay",
                provider_order_id: "razorpay_pg-order-failed",
                status: "created",
            },
        }),
        releasePendingOrderInventory: async ({ orderId }) => {
            calls.releasedOrderId = orderId;
        },
    };
    const orderService = createOrderService({
        ErrorClass: TestError,
        shouldUsePostgresOrders: () => true,
        postgresCheckout,
        createRazorpayProviderOrder: async () => {
            throw new Error("provider down");
        },
    });

    await assert.rejects(
        () =>
            orderService.createRazorpayOrderForCheckout({
                items: [{ productId: "p1", quantity: 1 }],
                address: "addr-1",
                userId: "user-1",
            }),
        /provider down/
    );
    assert.equal(calls.releasedOrderId, "pg-order-failed");
});

test("order service emits payment success and confirmation after paid update", async () => {
    const events = [];
    const OrderModel = {
        findOneAndUpdate: async (query, update) => ({
            _id: query._id,
            couponCode: "SAVE",
            paymentType: "Online",
            ...update,
        }),
    };
    const CouponModel = {
        findOneAndUpdate: async () => {},
    };
    const UserModel = {
        findByIdAndUpdate: async () => {},
    };
    const orderService = createOrderService({
        OrderModel,
        CouponModel,
        UserModel,
        ErrorClass: TestError,
        publishEvent: async (eventName, payload) => {
            events.push({ eventName, payload });
        },
    });

    await orderService.markOrderPaidFromPayment({
        orderId: "order-1",
        userId: "user-1",
        providerOrderId: "provider-order",
        providerPaymentId: "provider-payment",
    });

    assert.deepEqual(
        events.map((event) => event.eventName),
        [ORDER_EVENTS.PAYMENT_SUCCEEDED, ORDER_EVENTS.ORDER_CONFIRMED]
    );
    assert.equal(events[0].payload.providerPaymentId, "provider-payment");
});

test("order service keeps cancellation transition and event inside order boundary", async () => {
    const events = [];
    const calls = {
        released: false,
        update: null,
    };
    const order = {
        _id: "order-1",
        userId: "user-1",
        status: ORDER_STATUS.PROCESSING,
        returnStatus: "none",
    };
    const OrderModel = {
        findOne: async () => order,
        findByIdAndUpdate: async (orderId, update) => {
            calls.update = { orderId, update };
        },
    };
    const orderService = createOrderService({
        OrderModel,
        ErrorClass: TestError,
        releaseInventoryOrder: async () => {
            calls.released = true;
        },
        publishEvent: async (eventName, payload) => {
            events.push({ eventName, payload });
        },
    });

    await orderService.cancelUserOrder({
        orderId: "order-1",
        userId: "user-1",
        reason: "changed mind",
    });

    assert.equal(calls.released, true);
    assert.deepEqual(calls.update, {
        orderId: "order-1",
        update: {
            status: ORDER_STATUS.CANCELLED,
            cancelReason: "changed mind",
        },
    });
    assert.equal(events[0].eventName, ORDER_EVENTS.ORDER_CANCELLED);
    assert.equal(events[0].payload.reason, "changed mind");
});

test("order event bus fan-outs events to subscribers", async () => {
    clearOrderEventHandlers();
    const received = [];
    const unsubscribe = subscribeOrderEvent(
        ORDER_EVENTS.RETURN_REQUESTED,
        async (payload) => {
            received.push(payload);
        }
    );

    await publishOrderEvent(ORDER_EVENTS.RETURN_REQUESTED, {
        orderId: "order-1",
    });
    unsubscribe();
    await publishOrderEvent(ORDER_EVENTS.RETURN_REQUESTED, {
        orderId: "order-2",
    });

    assert.deepEqual(received, [{ orderId: "order-1" }]);
});

test("order service publishes shipment status updates for notification consumers", async () => {
    const events = [];
    const OrderModel = {
        findById: async () => ({
            _id: "order-1",
            userId: "user-1",
            status: ORDER_STATUS.PROCESSING,
            returnStatus: "none",
        }),
        findByIdAndUpdate: async () => {},
    };
    const orderService = createOrderService({
        OrderModel,
        ErrorClass: TestError,
        publishEvent: async (eventName, payload) => {
            events.push({ eventName, payload });
        },
    });

    await orderService.changeOrderStatus({
        orderId: "order-1",
        status: ORDER_STATUS.SHIPPED,
    });

    assert.deepEqual(events, [
        {
            eventName: ORDER_EVENTS.ORDER_STATUS_UPDATED,
            payload: {
                orderId: "order-1",
                userId: "user-1",
                status: ORDER_STATUS.SHIPPED,
                previousStatus: ORDER_STATUS.PROCESSING,
            },
        },
    ]);
});
