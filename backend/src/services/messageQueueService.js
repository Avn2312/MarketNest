import crypto from "node:crypto";
import {
    recordEventHandlerFailure,
    recordEventPublished,
} from "./observabilityService.js";

const processedHandlerEvents = new Set();
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RABBITMQ_URL = "amqp://localhost:5672";
const DEFAULT_RABBITMQ_RETRY_DELAY_MS = 5_000;
const RABBITMQ_EXCHANGE = "marketnest.events";
const RABBITMQ_RETRY_EXCHANGE = "marketnest.events.retry";
const RABBITMQ_DLX_EXCHANGE = "marketnest.events.dlx";

let rabbitMqQueue;

const getEventId = ({ eventName, payload }) => {
    if (payload?.eventId) return payload.eventId;

    const stableParts = [
        eventName,
        payload?.providerEventId,
        payload?.providerOrderId,
        payload?.providerPaymentId,
        payload?.orderId,
        payload?.productId,
        payload?.status,
        payload?.returnStatus,
    ].filter(Boolean);

    return stableParts.length ? stableParts.join(":") : crypto.randomUUID();
};

const normalizeQueueSegment = (value) =>
    String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "");

const getMessageQueueMode = () => process.env.MESSAGE_QUEUE || "in-memory";

export const isRabbitMqMessageQueueEnabled = () =>
    getMessageQueueMode().toLowerCase() === "rabbitmq";

const getRoutingKey = ({ bus, eventName }) => `${bus}.${eventName}`;

const getConsumerQueueName = ({ bus, eventName, consumerName }) =>
    [
        "marketnest",
        normalizeQueueSegment(bus),
        normalizeQueueSegment(eventName),
        normalizeQueueSegment(consumerName),
    ]
        .filter(Boolean)
        .join(".");

const getRetryQueueName = ({ bus, eventName, consumerName }) =>
    `${getConsumerQueueName({ bus, eventName, consumerName })}.retry`;

const getDeadLetterQueueName = ({ bus, eventName, consumerName }) =>
    `${getConsumerQueueName({ bus, eventName, consumerName })}.dlq`;

const publishInMemoryBusinessEvent = async ({
    bus,
    eventName,
    payload,
    handlers,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
}) => {
    const eventId = getEventId({ eventName, payload });

    await Promise.all(
        handlers.map(async (handler, index) => {
            const handlerKey = `${bus}:${eventName}:${eventId}:${index}`;

            if (processedHandlerEvents.has(handlerKey)) {
                return;
            }

            let lastError;

            for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
                try {
                    await handler(payload);
                    processedHandlerEvents.add(handlerKey);
                    return;
                } catch (error) {
                    lastError = error;
                    recordEventHandlerFailure({
                        bus,
                        eventName,
                        error,
                        attempt,
                    });
                }
            }

            throw lastError;
        })
    );
};

export const createRabbitMqBusinessEventQueue = ({
    amqpClient,
    url = DEFAULT_RABBITMQ_URL,
    retryDelayMs = DEFAULT_RABBITMQ_RETRY_DELAY_MS,
} = {}) => {
    let connectionPromise;
    let channelPromise;

    const loadAmqpClient = async () => {
        if (amqpClient) return amqpClient;

        const module = await import("amqplib");

        return module.default || module;
    };

    const getConnection = async () => {
        if (!connectionPromise) {
            connectionPromise = loadAmqpClient().then((client) =>
                client.connect(url)
            );
        }

        return connectionPromise;
    };

    const getChannel = async () => {
        if (!channelPromise) {
            channelPromise = getConnection().then(async (connection) => {
                const channel =
                    typeof connection.createConfirmChannel === "function"
                        ? await connection.createConfirmChannel()
                        : await connection.createChannel();

                channel.prefetch?.(10);

                return channel;
            });
        }

        return channelPromise;
    };

    const assertSharedTopology = async (channel) => {
        await channel.assertExchange(RABBITMQ_EXCHANGE, "topic", {
            durable: true,
        });
        await channel.assertExchange(RABBITMQ_RETRY_EXCHANGE, "topic", {
            durable: true,
        });
        await channel.assertExchange(RABBITMQ_DLX_EXCHANGE, "topic", {
            durable: true,
        });
    };

    const assertConsumerTopology = async ({
        channel,
        bus,
        eventName,
        consumerName,
    }) => {
        await assertSharedTopology(channel);

        const routingKey = getRoutingKey({ bus, eventName });
        const deadLetterRoutingKey = `${routingKey}.dead`;
        const queue = getConsumerQueueName({ bus, eventName, consumerName });
        const retryQueue = getRetryQueueName({ bus, eventName, consumerName });
        const deadLetterQueue = getDeadLetterQueueName({
            bus,
            eventName,
            consumerName,
        });

        await channel.assertQueue(queue, {
            durable: true,
        });
        await channel.bindQueue(queue, RABBITMQ_EXCHANGE, routingKey);

        await channel.assertQueue(retryQueue, {
            durable: true,
            arguments: {
                "x-message-ttl": retryDelayMs,
                "x-dead-letter-exchange": RABBITMQ_EXCHANGE,
                "x-dead-letter-routing-key": routingKey,
            },
        });
        await channel.bindQueue(retryQueue, RABBITMQ_RETRY_EXCHANGE, routingKey);

        await channel.assertQueue(deadLetterQueue, {
            durable: true,
        });
        await channel.bindQueue(
            deadLetterQueue,
            RABBITMQ_DLX_EXCHANGE,
            deadLetterRoutingKey
        );

        return {
            deadLetterRoutingKey,
            queue,
            routingKey,
        };
    };

    const publish = async ({ bus, eventName, payload }) => {
        const eventId = getEventId({ eventName, payload });
        const channel = await getChannel();
        await assertSharedTopology(channel);

        const envelope = {
            bus,
            eventName,
            eventId,
            payload,
            publishedAt: new Date().toISOString(),
        };

        channel.publish(
            RABBITMQ_EXCHANGE,
            getRoutingKey({ bus, eventName }),
            Buffer.from(JSON.stringify(envelope)),
            {
                contentType: "application/json",
                messageId: eventId,
                persistent: true,
                timestamp: Date.now(),
            }
        );
        await channel.waitForConfirms?.();
    };

    const consume = async ({
        bus,
        eventName,
        handler,
        consumerName = "default",
        maxAttempts = DEFAULT_MAX_ATTEMPTS,
    }) => {
        const channel = await getChannel();
        const { deadLetterRoutingKey, queue, routingKey } =
            await assertConsumerTopology({
                channel,
                bus,
                eventName,
                consumerName,
            });

        const consumer = await channel.consume(
            queue,
            async (message) => {
                if (!message) return;

                const headers = message.properties?.headers || {};
                const attempt = Number(headers["x-attempt"] || 0) + 1;
                let envelope;

                try {
                    envelope = JSON.parse(message.content.toString("utf8"));
                    await handler(envelope.payload);
                    channel.ack(message);
                } catch (error) {
                    recordEventHandlerFailure({
                        bus,
                        eventName,
                        error,
                        attempt,
                    });

                    if (attempt >= maxAttempts) {
                        channel.publish(
                            RABBITMQ_DLX_EXCHANGE,
                            deadLetterRoutingKey,
                            message.content,
                            {
                                contentType:
                                    message.properties?.contentType ||
                                    "application/json",
                                headers: {
                                    ...headers,
                                    "x-attempt": attempt,
                                    "x-dead-letter-reason": error.message,
                                },
                                messageId: message.properties?.messageId,
                                persistent: true,
                                timestamp: Date.now(),
                            }
                        );
                        channel.ack(message);
                        return;
                    }

                    channel.publish(
                        RABBITMQ_RETRY_EXCHANGE,
                        routingKey,
                        message.content,
                        {
                            contentType:
                                message.properties?.contentType ||
                                "application/json",
                            headers: {
                                ...headers,
                                "x-attempt": attempt,
                            },
                            messageId: message.properties?.messageId,
                            persistent: true,
                            timestamp: Date.now(),
                        }
                    );
                    channel.ack(message);
                }
            },
            { noAck: false }
        );

        return () => channel.cancel?.(consumer.consumerTag);
    };

    const close = async () => {
        const channel = channelPromise ? await channelPromise : null;
        const connection = connectionPromise ? await connectionPromise : null;

        await channel?.close?.();
        await connection?.close?.();

        channelPromise = null;
        connectionPromise = null;
    };

    return {
        close,
        consume,
        publish,
    };
};

const getRabbitMqQueue = () => {
    if (!rabbitMqQueue) {
        rabbitMqQueue = createRabbitMqBusinessEventQueue({
            url: process.env.RABBITMQ_URL || DEFAULT_RABBITMQ_URL,
        });
    }

    return rabbitMqQueue;
};

export const publishBusinessEvent = async ({
    bus,
    eventName,
    payload,
    handlers = [],
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
}) => {
    recordEventPublished({ bus, eventName });

    if (isRabbitMqMessageQueueEnabled()) {
        await getRabbitMqQueue().publish({ bus, eventName, payload });
        return;
    }

    await publishInMemoryBusinessEvent({
        bus,
        eventName,
        payload,
        handlers,
        maxAttempts,
    });
};

export const subscribeBusinessEvent = ({
    bus,
    eventName,
    handler,
    consumerName,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
}) => {
    if (!isRabbitMqMessageQueueEnabled()) {
        return null;
    }

    return getRabbitMqQueue().consume({
        bus,
        eventName,
        handler,
        consumerName,
        maxAttempts,
    });
};

export const clearProcessedBusinessEvents = () => {
    processedHandlerEvents.clear();
};

export const resetRabbitMqMessageQueueForTests = async () => {
    if (!rabbitMqQueue) return;

    await rabbitMqQueue.close?.();
    rabbitMqQueue = null;
};

export const setRabbitMqMessageQueueForTests = (queue) => {
    rabbitMqQueue = queue;
};
