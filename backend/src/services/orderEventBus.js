import {
    publishBusinessEvent,
    subscribeBusinessEvent,
} from "./messageQueueService.js";

export const ORDER_EVENTS = {
    ORDER_CREATED: "OrderCreated",
    INVENTORY_RESERVED: "InventoryReserved",
    PAYMENT_SUCCEEDED: "PaymentSucceeded",
    ORDER_CONFIRMED: "OrderConfirmed",
    ORDER_CANCELLED: "OrderCancelled",
    RETURN_REQUESTED: "ReturnRequested",
    ORDER_STATUS_UPDATED: "OrderStatusUpdated",
    RETURN_STATUS_UPDATED: "ReturnStatusUpdated",
};

const handlers = new Map();

export const subscribeOrderEvent = (eventName, handler) => {
    const eventHandlers = handlers.get(eventName) || [];
    eventHandlers.push(handler);
    handlers.set(eventName, eventHandlers);

    const rabbitMqSubscription = subscribeBusinessEvent({
        bus: "order",
        eventName,
        handler,
        consumerName: `order-consumer-${eventName}-${eventHandlers.length}`,
    });

    return () => {
        const nextHandlers = (handlers.get(eventName) || []).filter(
            (registeredHandler) => registeredHandler !== handler
        );
        handlers.set(eventName, nextHandlers);
        Promise.resolve(rabbitMqSubscription).then((unsubscribe) =>
            unsubscribe?.()
        );
    };
};

export const publishOrderEvent = async (eventName, payload) => {
    const eventHandlers = handlers.get(eventName) || [];
    await publishBusinessEvent({
        bus: "order",
        eventName,
        payload,
        handlers: eventHandlers,
    });
};

export const clearOrderEventHandlers = () => {
    handlers.clear();
};
