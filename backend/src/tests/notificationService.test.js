import test from "node:test";
import assert from "node:assert/strict";
import {
    NOTIFICATION_EVENT_TYPES,
    createNotificationService,
} from "../services/notificationService.js";

const createUserModel = () => ({
    findById: () => ({
        select: () => ({
            lean: async () => ({ email: "customer@example.com" }),
        }),
    }),
});

test("notification service records and sends order confirmation notifications", async () => {
    const calls = {
        created: null,
        update: null,
        sent: null,
    };
    const NotificationModel = {
        create: async (payload) => {
            calls.created = payload;
            return {
                _id: "notification-1",
                attempts: 0,
                channel: "email",
                ...payload,
            };
        },
        findByIdAndUpdate: async (id, update) => {
            calls.update = { id, update };
        },
    };
    const notificationService = createNotificationService({
        NotificationModel,
        UserModel: createUserModel(),
        sendMessage: async (message) => {
            calls.sent = message;
            return { providerMessageId: "provider-1" };
        },
    });

    await notificationService.notifyOrderConfirmed({
        orderId: "order-1",
        userId: "user-1",
    });

    assert.equal(calls.created.type, NOTIFICATION_EVENT_TYPES.ORDER_CONFIRMATION);
    assert.equal(calls.created.recipient, "customer@example.com");
    assert.match(calls.created.subject, /order-1 confirmed/i);
    assert.equal(calls.sent.recipient, "customer@example.com");
    assert.deepEqual(calls.update, {
        id: "notification-1",
        update: {
            status: "sent",
            attempts: 1,
            providerMessageId: "provider-1",
            sentAt: calls.update.update.sentAt,
        },
    });
    assert.ok(calls.update.update.sentAt instanceof Date);
});

test("notification send failures are recorded without throwing", async () => {
    const updates = [];
    const NotificationModel = {
        create: async (payload) => ({
            _id: "notification-1",
            attempts: 0,
            channel: "email",
            ...payload,
        }),
        findByIdAndUpdate: async (id, update) => {
            updates.push({ id, update });
        },
    };
    const notificationService = createNotificationService({
        NotificationModel,
        UserModel: createUserModel(),
        sendMessage: async () => {
            throw new Error("SMTP unavailable");
        },
    });

    const notification = await notificationService.notifyPaymentFailed({
        orderId: "order-1",
        userId: "user-1",
    });

    assert.equal(notification.status, "failed");
    assert.deepEqual(updates[0], {
        id: "notification-1",
        update: {
            status: "failed",
            attempts: 1,
            error: "SMTP unavailable",
        },
    });
});

test("notification service only sends shipment updates for fulfillment statuses", async () => {
    let creates = 0;
    const NotificationModel = {
        create: async (payload) => {
            creates += 1;
            return {
                _id: "notification-1",
                attempts: 0,
                channel: "email",
                ...payload,
            };
        },
        findByIdAndUpdate: async () => {},
    };
    const notificationService = createNotificationService({
        NotificationModel,
        UserModel: createUserModel(),
    });

    const ignored = await notificationService.notifyShipmentUpdated({
        orderId: "order-1",
        userId: "user-1",
        status: "Order Placed",
    });
    await notificationService.notifyShipmentUpdated({
        orderId: "order-1",
        userId: "user-1",
        status: "Shipped",
    });

    assert.equal(ignored, null);
    assert.equal(creates, 1);
});
