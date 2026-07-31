import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/index.js";

export const gatewayAuthContext = (req, res, next) => {
    const token = req.cookies?.token;

    req.gatewayAuth = {
        isAuthenticated: false,
        userId: null,
        tokenValid: false,
    };

    if (!token) {
        return next();
    }

    try {
        const decodedToken = jwt.verify(token, JWT_SECRET);
        req.gatewayAuth = {
            isAuthenticated: true,
            userId: decodedToken.id,
            tokenValid: true,
        };
    } catch {
        req.gatewayAuth = {
            isAuthenticated: false,
            userId: null,
            tokenValid: false,
        };
    }

    next();
};
