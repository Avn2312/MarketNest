import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { ORDER_EVENTS, subscribeOrderEvent } from "./orderEventBus.js";
import { PAYMENT_EVENTS, subscribePaymentEvent } from "./paymentEventBus.js";

export const NOTIFICATION_EVENT_TYPES = {
    ORDER_CONFIRMATION: "order_confirmation",
    PAYMENT_SUCCESS: "payment_success",
    PAYMENT_FAILURE: "payment_failure",
    SHIPMENT_UPDATE: "shipment_update",
    RETURN_UPDATE: "return_update",
    ORDER_CANCELLED: "order_cancelled",
};

const SHIPMENT_STATUSES = new Set(["Processing", "Shipped", "Delivered"]);

const defaultSendMessage = async () => ({
    providerMessageId: "",
});

const buildSubject = ({ type, orderId, status, returnStatus }) => {
    switch (type) {
        case NOTIFICATION_EVENT_TYPES.ORDER_CONFIRMATION:
            return `Order ${orderId} confirmed`;
        case NOTIFICATION_EVENT_TYPES.PAYMENT_SUCCESS:
            return `Payment received for order ${orderId}`;
        case NOTIFICATION_EVENT_TYPES.PAYMENT_FAILURE:
            return `Payment failed for order ${orderId}`;
        case NOTIFICATION_EVENT_TYPES.SHIPMENT_UPDATE:
            return `Order ${orderId} is ${status}`;
        case NOTIFICATION_EVENT_TYPES.RETURN_UPDATE:
            return `Return update for order ${orderId}: ${returnStatus}`;
        case NOTIFICATION_EVENT_TYPES.ORDER_CANCELLED:
            return `Order ${orderId} cancelled`;
        default:
            return `MarketNest update for order ${orderId}`;
    }
};

const buildMessage = ({ type, orderId, status, returnStatus, reason }) => {
    switch (type) {
        case NOTIFICATION_EVENT_TYPES.ORDER_CONFIRMATION:
            return `Your order ${orderId} has been confirmed.`;
        case NOTIFICATION_EVENT_TYPES.PAYMENT_SUCCESS:
            return `We received your payment for order ${orderId}.`;
        case NOTIFICATION_EVENT_TYPES.PAYMENT_FAILURE:
            return `Payment for order ${orderId} could not be completed.`;
        case NOTIFICATION_EVENT_TYPES.SHIPMENT_UPDATE:
            return `Your order ${orderId} status is now ${status}.`;
        case NOTIFICATION_EVENT_TYPES.RETURN_UPDATE:
            return `Your return for order ${orderId} is now ${returnStatus}.`;
        case NOTIFICATION_EVENT_TYPES.ORDER_CANCELLED:
            return reason
                ? `Your order ${orderId} was cancelled. Reason: ${reason}.`
                : `Your order ${orderId} was cancelled.`;
        default:
            return `There is an update for order ${orderId}.`;
    }
};

export const createNotificationService = ({
    NotificationModel = Notification,
    UserModel = User,
    sendMessage = defaultSendMessage,
} = {}) => {
    const resolveRecipient = async ({ userId, recipient }) => {
        if (recipient) return recipient;
        if (!userId) return "";

        const userQuery = UserModel.findById(userId).select("email");
        const user =
            typeof userQuery.lean === "function" ? await userQuery.lean() : await userQuery;

        return user?.email || "";
    };

    const sendNotification = async ({ type, payload }) => {
        const orderId = payload.orderId || "";
        const recipient = await resolveRecipient(payload);
        const subject = buildSubject({
            type,
            orderId,
            status: payload.status,
            returnStatus: payload.returnStatus,
        });
        const message = buildMessage({
            type,
            orderId,
            status: payload.status,
            returnStatus: payload.returnStatus,
            reason: payload.reason,
        });

        const notification = await NotificationModel.create({
            userId: payload.userId,
            orderId,
            type,
            recipient,
            subject,
            message,
            payload,
        });

        try {
            const result = await sendMessage({
                channel: notification.channel || "email",
                recipient,
                subject,
                message,
                payload,
                type,
            });

            await NotificationModel.findByIdAndUpdate(notification._id, {
                status: "sent",
                attempts: (notification.attempts || 0) + 1,
                providerMessageId: result?.providerMessageId || "",
                sentAt: new Date(),
            });

            return {
                ...notification,
                status: "sent",
            };
        } catch (error) {
            await NotificationModel.findByIdAndUpdate(notification._id, {
                status: "failed",
                attempts: (notification.attempts || 0) + 1,
                error: error.message,
            });

            return {
                ...notification,
                status: "failed",
                error: error.message,
            };
        }
    };

    const notifyOrderConfirmed = (payload) =>
        sendNotification({
            type: NOTIFICATION_EVENT_TYPES.ORDER_CONFIRMATION,
            payload,
        });

    const notifyPaymentSucceeded = (payload) =>
        sendNotification({
            type: NOTIFICATION_EVENT_TYPES.PAYMENT_SUCCESS,
            payload,
        });

    const notifyPaymentFailed = (payload) =>
        sendNotification({
            type: NOTIFICATION_EVENT_TYPES.PAYMENT_FAILURE,
            payload,
        });

    const notifyShipmentUpdated = (payload) => {
        if (!SHIPMENT_STATUSES.has(payload.status)) {
            return null;
        }

        return sendNotification({
            type: NOTIFICATION_EVENT_TYPES.SHIPMENT_UPDATE,
            payload,
        });
    };

    const notifyReturnUpdated = (payload) =>
        sendNotification({
            type: NOTIFICATION_EVENT_TYPES.RETURN_UPDATE,
            payload,
        });

    const notifyOrderCancelled = (payload) =>
        sendNotification({
            type: NOTIFICATION_EVENT_TYPES.ORDER_CANCELLED,
            payload,
        });

    return {
        notifyOrderCancelled,
        notifyOrderConfirmed,
        notifyPaymentFailed,
        notifyPaymentSucceeded,
        notifyReturnUpdated,
        notifyShipmentUpdated,
        sendNotification,
    };
};

const notificationService = createNotificationService();

export const notifyOrderCancelled = notificationService.notifyOrderCancelled;
export const notifyOrderConfirmed = notificationService.notifyOrderConfirmed;
export const notifyPaymentFailed = notificationService.notifyPaymentFailed;
export const notifyPaymentSucceeded = notificationService.notifyPaymentSucceeded;
export const notifyReturnUpdated = notificationService.notifyReturnUpdated;
export const notifyShipmentUpdated = notificationService.notifyShipmentUpdated;

let isRegistered = false;

const safeConsume = (handler) => async (payload) => {
    try {
        await handler(payload);
    } catch {
        // Notification failures are intentionally isolated from checkout/order flow.
    }
};

export const registerNotificationConsumers = ({
    service = notificationService,
} = {}) => {
    if (isRegistered) return;

    subscribeOrderEvent(
        ORDER_EVENTS.ORDER_CONFIRMED,
        safeConsume(service.notifyOrderConfirmed)
    );
    subscribeOrderEvent(
        ORDER_EVENTS.PAYMENT_SUCCEEDED,
        safeConsume(service.notifyPaymentSucceeded)
    );
    subscribePaymentEvent(
        PAYMENT_EVENTS.PAYMENT_FAILED,
        safeConsume(service.notifyPaymentFailed)
    );
    subscribeOrderEvent(
        ORDER_EVENTS.ORDER_STATUS_UPDATED,
        safeConsume(service.notifyShipmentUpdated)
    );
    subscribeOrderEvent(
        ORDER_EVENTS.RETURN_REQUESTED,
        safeConsume(service.notifyReturnUpdated)
    );
    subscribeOrderEvent(
        ORDER_EVENTS.RETURN_STATUS_UPDATED,
        safeConsume(service.notifyReturnUpdated)
    );
    subscribeOrderEvent(
        ORDER_EVENTS.ORDER_CANCELLED,
        safeConsume(service.notifyOrderCancelled)
    );

    isRegistered = true;
};

export const resetNotificationConsumersForTests = () => {
    isRegistered = false;
};
