const stores = new Map();

export const createRateLimiter = ({ windowMs, max, key = "global" }) => {
    return (req, res, next) => {
        const identifier = `${key}:${req.ip || "unknown"}`;
        const now = Date.now();
        const entry = stores.get(identifier);

        if (!entry || now > entry.expiresAt) {
            stores.set(identifier, {
                count: 1,
                expiresAt: now + windowMs,
            });
            return next();
        }

        if (entry.count >= max) {
            return res.status(429).json({
                success: false,
                message: "Too many requests, please try again later",
            });
        }

        entry.count += 1;
        stores.set(identifier, entry);
        next();
    };
};
