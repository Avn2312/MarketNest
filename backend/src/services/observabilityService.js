const MAX_RECENT_TRACES = 50;
const httpMetrics = new Map();
const eventMetrics = new Map();
const recentTraces = [];
const alerts = [];

const increment = (map, key, amount = 1) => {
    map.set(key, (map.get(key) || 0) + amount);
};

const pushTrace = (trace) => {
    recentTraces.push({
        timestamp: new Date().toISOString(),
        ...trace,
    });

    if (recentTraces.length > MAX_RECENT_TRACES) {
        recentTraces.shift();
    }
};

const maybeRecordHttpAlert = ({ route, statusCode, durationMs }) => {
    if (statusCode >= 500) {
        alerts.push({
            type: "http_5xx",
            route,
            statusCode,
            timestamp: new Date().toISOString(),
        });
    }

    if (durationMs >= 1_000) {
        alerts.push({
            type: "slow_request",
            route,
            durationMs,
            timestamp: new Date().toISOString(),
        });
    }
};

export const recordHttpRequest = ({
    method,
    route,
    statusCode,
    durationMs,
    correlationId,
    userId,
}) => {
    const key = `${method} ${route} ${statusCode}`;
    increment(httpMetrics, key);
    pushTrace({
        kind: "http",
        method,
        route,
        statusCode,
        durationMs,
        correlationId,
        userId,
    });
    maybeRecordHttpAlert({ route, statusCode, durationMs });
};

export const recordEventPublished = ({ bus, eventName }) => {
    increment(eventMetrics, `${bus}:${eventName}:published`);
    pushTrace({
        kind: "event",
        bus,
        eventName,
        action: "published",
    });
};

export const recordEventHandlerFailure = ({ bus, eventName, error, attempt }) => {
    increment(eventMetrics, `${bus}:${eventName}:handler_failed`);
    const alert = {
        type: "event_handler_failure",
        bus,
        eventName,
        message: error?.message || "Unknown event handler failure",
        attempt,
        timestamp: new Date().toISOString(),
    };
    alerts.push(alert);
    pushTrace({
        kind: "event",
        bus,
        eventName,
        action: "handler_failed",
        message: alert.message,
    });
};

export const getObservabilitySnapshot = () => ({
    generatedAt: new Date().toISOString(),
    metrics: {
        http: Object.fromEntries(httpMetrics),
        events: Object.fromEntries(eventMetrics),
    },
    traces: recentTraces,
    alerts: alerts.slice(-50),
});

export const resetObservability = () => {
    httpMetrics.clear();
    eventMetrics.clear();
    recentTraces.length = 0;
    alerts.length = 0;
};
