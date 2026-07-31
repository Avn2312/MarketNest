import test from "node:test";
import assert from "node:assert/strict";
import {
    getObservabilitySnapshot,
    recordHttpRequest,
    resetObservability,
} from "../services/observabilityService.js";
import {
    clearProcessedBusinessEvents,
    publishBusinessEvent,
} from "../services/messageQueueService.js";
import { getServiceRegistrySnapshot } from "../services/serviceRegistry.js";

test("observability records http metrics, traces, and alerts", () => {
    resetObservability();

    recordHttpRequest({
        method: "GET",
        route: "/products/list",
        statusCode: 503,
        durationMs: 1200,
        correlationId: "request-1",
        userId: "user-1",
    });

    const snapshot = getObservabilitySnapshot();

    assert.equal(snapshot.metrics.http["GET /products/list 503"], 1);
    assert.equal(snapshot.traces[0].correlationId, "request-1");
    assert.equal(snapshot.alerts.length, 2);
});

test("business event queue retries failed handlers and deduplicates processed event handlers", async () => {
    resetObservability();
    clearProcessedBusinessEvents();
    let attempts = 0;

    await publishBusinessEvent({
        bus: "test",
        eventName: "OrderConfirmed",
        payload: { eventId: "event-1", orderId: "order-1" },
        handlers: [
            async () => {
                attempts += 1;
                if (attempts === 1) {
                    throw new Error("temporary failure");
                }
            },
        ],
    });
    await publishBusinessEvent({
        bus: "test",
        eventName: "OrderConfirmed",
        payload: { eventId: "event-1", orderId: "order-1" },
        handlers: [
            async () => {
                attempts += 1;
            },
        ],
    });

    const snapshot = getObservabilitySnapshot();

    assert.equal(attempts, 2);
    assert.equal(snapshot.metrics.events["test:OrderConfirmed:published"], 2);
    assert.equal(
        snapshot.metrics.events["test:OrderConfirmed:handler_failed"],
        1
    );
});

test("service registry exposes route and database ownership", () => {
    const snapshot = getServiceRegistrySnapshot();

    assert.deepEqual(snapshot.services.productService.tables, [
        "products",
        "categories",
    ]);
    assert.ok(snapshot.services.orderService.routes.includes("/orders"));
    assert.ok(snapshot.services.notificationService.tables.includes("notifications"));
});
