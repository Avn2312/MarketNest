import { recordHttpRequest } from "../services/observabilityService.js";

export const gatewayRequestLogger = (req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        const logEntry = {
            layer: "api-gateway",
            correlationId: req.correlationId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Number(durationMs.toFixed(2)),
            userId: req.gatewayAuth?.userId || null,
        };

        recordHttpRequest({
            method: req.method,
            route: req.route?.path || req.path,
            statusCode: res.statusCode,
            durationMs: logEntry.durationMs,
            correlationId: req.correlationId,
            userId: req.gatewayAuth?.userId || null,
        });
        console.info(JSON.stringify(logEntry));
    });

    next();
};
