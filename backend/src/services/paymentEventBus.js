import {
    publishBusinessEvent,
    subscribeBusinessEvent,
} from "./messageQueueService.js";

export const PAYMENT_EVENTS = {
    PAYMENT_SUCCEEDED: "PaymentSucceeded",
    PAYMENT_FAILED: "PaymentFailed",
};

const handlers = new Map();

export const subscribePaymentEvent = (eventName, handler) => {
    const eventHandlers = handlers.get(eventName) || [];
    eventHandlers.push(handler);
    handlers.set(eventName, eventHandlers);

    const rabbitMqSubscription = subscribeBusinessEvent({
        bus: "payment",
        eventName,
        handler,
        consumerName: `payment-consumer-${eventName}-${eventHandlers.length}`,
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

export const publishPaymentEvent = async (eventName, payload) => {
    const eventHandlers = handlers.get(eventName) || [];
    await publishBusinessEvent({
        bus: "payment",
        eventName,
        payload,
        handlers: eventHandlers,
    });
};

export const clearPaymentEventHandlers = () => {
    handlers.clear();
};
