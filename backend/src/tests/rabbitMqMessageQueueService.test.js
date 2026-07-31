import test from "node:test";
import assert from "node:assert/strict";
import {
    createRabbitMqBusinessEventQueue,
    setRabbitMqMessageQueueForTests,
    resetRabbitMqMessageQueueForTests,
} from "../services/messageQueueService.js";
import {
    registerNotificationConsumers,
    resetNotificationConsumersForTests,
} from "../services/notificationService.js";

const createMockAmqp = () => {
    const calls = {
        acked: [],
        assertedExchanges: [],
        assertedQueues: [],
        binds: [],
        consumes: [],
        published: [],
        url: null,
    };

    const channel = {
        ack: (message) => calls.acked.push(message),
        assertExchange: async (exchange, type, options) => {
            calls.assertedExchanges.push({ exchange, type, options });
        },
        assertQueue: async (queue, options) => {
            calls.assertedQueues.push({ queue, options });
        },
        bindQueue: async (queue, exchange, routingKey) => {
            calls.binds.push({ queue, exchange, routingKey });
        },
        consume: async (queue, handler, options) => {
            calls.consumes.push({ queue, handler, options });
            return { consumerTag: `${queue}-tag` };
        },
        prefetch: () => {},
        publish: (exchange, routingKey, content, options) => {
            calls.published.push({ exchange, routingKey, content, options });
            return true;
        },
        waitForConfirms: async () => {},
    };

    const amqpClient = {
        connect: async (url) => {
            calls.url = url;
            return {
                createConfirmChannel: async () => channel,
            };
        },
    };

    return { amqpClient, calls };
};

const createMessage = ({ payload, headers = {} }) => ({
    content: Buffer.from(
        JSON.stringify({
            bus: "payment",
            eventName: "PaymentFailed",
            eventId: "event-1",
            payload,
        })
    ),
    properties: {
        contentType: "application/json",
        headers,
        messageId: "event-1",
    },
});

test("RabbitMQ publisher writes durable business event envelopes", async () => {
    const { amqpClient, calls } = createMockAmqp();
    const queue = createRabbitMqBusinessEventQueue({
        amqpClient,
        url: "amqp://rabbitmq.test",
    });

    await queue.publish({
        bus: "order",
        eventName: "OrderConfirmed",
        payload: { eventId: "event-1", orderId: "order-1" },
    });

    assert.equal(calls.url, "amqp://rabbitmq.test");
    assert.deepEqual(
        calls.assertedExchanges.map(({ exchange, type }) => ({
            exchange,
            type,
        })),
        [
            { exchange: "marketnest.events", type: "topic" },
            { exchange: "marketnest.events.retry", type: "topic" },
            { exchange: "marketnest.events.dlx", type: "topic" },
        ]
    );

    assert.equal(calls.published.length, 1);
    assert.equal(calls.published[0].exchange, "marketnest.events");
    assert.equal(calls.published[0].routingKey, "order.OrderConfirmed");
    assert.equal(calls.published[0].options.persistent, true);
    assert.equal(calls.published[0].options.messageId, "event-1");

    const envelope = JSON.parse(calls.published[0].content.toString("utf8"));
    assert.equal(envelope.bus, "order");
    assert.equal(envelope.eventName, "OrderConfirmed");
    assert.deepEqual(envelope.payload, {
        eventId: "event-1",
        orderId: "order-1",
    });
});

test("RabbitMQ consumer retries failed events and dead-letters after max attempts", async () => {
    const { amqpClient, calls } = createMockAmqp();
    const queue = createRabbitMqBusinessEventQueue({
        amqpClient,
        retryDelayMs: 100,
    });
    const handled = [];

    await queue.consume({
        bus: "payment",
        eventName: "PaymentFailed",
        consumerName: "notification-consumer",
        maxAttempts: 3,
        handler: async (payload) => {
            handled.push(payload);
            throw new Error("temporary notification failure");
        },
    });

    assert.ok(
        calls.assertedQueues.some(
            ({ queue: queueName, options }) =>
                queueName ===
                    "marketnest.payment.paymentfailed.notification-consumer.retry" &&
                options.arguments["x-message-ttl"] === 100 &&
                options.arguments["x-dead-letter-exchange"] ===
                    "marketnest.events"
        )
    );

    const consumeHandler = calls.consumes[0].handler;
    const firstMessage = createMessage({
        payload: { orderId: "order-1", providerOrderId: "pay-order-1" },
    });
    await consumeHandler(firstMessage);

    assert.equal(calls.published[0].exchange, "marketnest.events.retry");
    assert.equal(calls.published[0].routingKey, "payment.PaymentFailed");
    assert.equal(calls.published[0].options.headers["x-attempt"], 1);
    assert.equal(calls.acked[0], firstMessage);

    const finalMessage = createMessage({
        payload: { orderId: "order-1" },
        headers: { "x-attempt": 2 },
    });
    await consumeHandler(finalMessage);

    assert.equal(calls.published[1].exchange, "marketnest.events.dlx");
    assert.equal(calls.published[1].routingKey, "payment.PaymentFailed.dead");
    assert.equal(calls.published[1].options.headers["x-attempt"], 3);
    assert.equal(
        calls.published[1].options.headers["x-dead-letter-reason"],
        "temporary notification failure"
    );
    assert.deepEqual(handled, [
        { orderId: "order-1", providerOrderId: "pay-order-1" },
        { orderId: "order-1" },
    ]);
});

test("notification consumers register RabbitMQ consumers when enabled", async () => {
    const originalMode = process.env.MESSAGE_QUEUE;
    const subscriptions = [];
    process.env.MESSAGE_QUEUE = "rabbitmq";
    resetNotificationConsumersForTests();
    setRabbitMqMessageQueueForTests({
        consume: (subscription) => {
            subscriptions.push(subscription);
            return () => {};
        },
    });

    registerNotificationConsumers({
        service: {
            notifyOrderCancelled: async () => {},
            notifyOrderConfirmed: async () => {},
            notifyPaymentFailed: async () => {},
            notifyPaymentSucceeded: async () => {},
            notifyReturnUpdated: async () => {},
            notifyShipmentUpdated: async () => {},
        },
    });

    assert.ok(
        subscriptions.some(
            ({ bus, eventName }) =>
                bus === "order" && eventName === "OrderConfirmed"
        )
    );
    assert.ok(
        subscriptions.some(
            ({ bus, eventName }) =>
                bus === "payment" && eventName === "PaymentFailed"
        )
    );

    await resetRabbitMqMessageQueueForTests();
    resetNotificationConsumersForTests();
    if (originalMode === undefined) {
        delete process.env.MESSAGE_QUEUE;
    } else {
        process.env.MESSAGE_QUEUE = originalMode;
    }
});
