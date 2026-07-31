import { Router } from "express";
import { correlationId } from "../middlewares/correlationId.js";
import { gatewayAuthContext } from "../middlewares/gatewayAuthContext.js";
import { gatewayRequestLogger } from "../middlewares/gatewayRequestLogger.js";
import { createRateLimiter } from "../middlewares/rateLimit.js";

export const GATEWAY_ROUTE_MAP = {
    auth: "/auth",
    cart: "/cart",
    addresses: "/addresses",
    coupons: "/coupons",
    products: "/products",
    orders: "/orders",
    payments: "/payments",
};

export const createApiGateway = ({
    userRouter,
    cartRouter,
    addressRouter,
    couponRouter,
    productRouter,
    orderRouter,
    paymentRouter,
}) => {
    const apiGateway = Router();
    const gatewayLimiter = createRateLimiter({
        windowMs: 60 * 1000,
        max: 240,
        key: "api-gateway",
    });

    apiGateway.use(correlationId);
    apiGateway.use(gatewayLimiter);
    apiGateway.use(gatewayAuthContext);
    apiGateway.use(gatewayRequestLogger);

    apiGateway.use(GATEWAY_ROUTE_MAP.auth, userRouter);
    apiGateway.use(GATEWAY_ROUTE_MAP.cart, cartRouter);
    apiGateway.use(GATEWAY_ROUTE_MAP.addresses, addressRouter);
    apiGateway.use(GATEWAY_ROUTE_MAP.coupons, couponRouter);
    apiGateway.use(GATEWAY_ROUTE_MAP.products, productRouter);
    apiGateway.use(GATEWAY_ROUTE_MAP.orders, orderRouter);
    apiGateway.use(GATEWAY_ROUTE_MAP.payments, paymentRouter);

    return apiGateway;
};
