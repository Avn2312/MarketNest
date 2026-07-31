import crypto from "node:crypto";

export const CORRELATION_ID_HEADER = "x-correlation-id";

export const correlationId = (req, res, next) => {
    const incomingCorrelationId = req.get(CORRELATION_ID_HEADER);
    const requestId = incomingCorrelationId || crypto.randomUUID();

    req.correlationId = requestId;
    res.setHeader(CORRELATION_ID_HEADER, requestId);
    next();
};
