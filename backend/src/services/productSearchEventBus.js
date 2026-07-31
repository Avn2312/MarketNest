import {
    publishBusinessEvent,
    subscribeBusinessEvent,
} from "./messageQueueService.js";

export const PRODUCT_SEARCH_EVENTS = {
    PRODUCT_CREATED: "ProductCreated",
    PRODUCT_UPDATED: "ProductUpdated",
    PRODUCT_DELETED: "ProductDeleted",
    PRODUCT_STATUS_CHANGED: "ProductStatusChanged",
};

const handlers = new Map();

export const subscribeProductSearchEvent = (eventName, handler) => {
    const eventHandlers = handlers.get(eventName) || [];
    eventHandlers.push(handler);
    handlers.set(eventName, eventHandlers);

    const rabbitMqSubscription = subscribeBusinessEvent({
        bus: "product-search",
        eventName,
        handler,
        consumerName: `product-search-consumer-${eventName}-${eventHandlers.length}`,
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

export const publishProductSearchEvent = async (eventName, payload) => {
    const eventHandlers = handlers.get(eventName) || [];
    await publishBusinessEvent({
        bus: "product-search",
        eventName,
        payload,
        handlers: eventHandlers,
    });
};

export const clearProductSearchEventHandlers = () => {
    handlers.clear();
};
