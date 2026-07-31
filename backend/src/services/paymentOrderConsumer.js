import {
    PAYMENT_EVENTS,
    subscribePaymentEvent,
} from "./paymentEventBus.js";
import { createOrderService } from "./orderService.js";
import { usePostgresOrderStorage } from "../config/orderStorage.js";

let isRegistered = false;

export const markOrderPaidFromPayment = async ({
    orderId,
    userId,
    providerPaymentId,
    providerOrderId,
    OrderModel,
    UserModel,
    CouponModel,
    publishEvent,
    shouldUsePostgresOrders = usePostgresOrderStorage,
}) => {
    if (shouldUsePostgresOrders()) return null;

    const orderService = createOrderService({
        OrderModel,
        UserModel,
        CouponModel,
        publishEvent,
    });

    return orderService.markOrderPaidFromPayment({
        orderId,
        userId,
        providerPaymentId,
        providerOrderId,
    });
};

export const releaseOrderFromFailedPayment = async ({
    orderId,
    providerOrderId,
    OrderModel,
    releaseInventory,
    publishEvent,
    shouldUsePostgresOrders = usePostgresOrderStorage,
}) => {
    if (shouldUsePostgresOrders()) return null;

    const orderService = createOrderService({
        OrderModel,
        releaseInventoryOrder: releaseInventory,
        publishEvent,
    });

    return orderService.releaseOrderFromFailedPayment({
        orderId,
        providerOrderId,
    });
};

export const registerPaymentOrderConsumers = () => {
    if (isRegistered) return;

    subscribePaymentEvent(PAYMENT_EVENTS.PAYMENT_SUCCEEDED, markOrderPaidFromPayment);
    subscribePaymentEvent(PAYMENT_EVENTS.PAYMENT_FAILED, releaseOrderFromFailedPayment);
    isRegistered = true;
};
