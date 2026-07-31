import test from "node:test";
import assert from "node:assert/strict";
import { Router } from "express";
import { correlationId } from "../middlewares/correlationId.js";
import { gatewayAuthContext } from "../middlewares/gatewayAuthContext.js";
import { GATEWAY_ROUTE_MAP, createApiGateway } from "../gateway/apiGateway.js";

const createResponse = () => {
    const headers = {};

    return {
        headers,
        setHeader: (key, value) => {
            headers[key.toLowerCase()] = value;
        },
        on: () => {},
    };
};

test("correlation middleware preserves incoming correlation id", () => {
    const req = {
        get: () => "request-123",
    };
    const res = createResponse();

    correlationId(req, res, () => {});

    assert.equal(req.correlationId, "request-123");
    assert.equal(res.headers["x-correlation-id"], "request-123");
});

test("correlation middleware creates correlation id when missing", () => {
    const req = {
        get: () => null,
    };
    const res = createResponse();

    correlationId(req, res, () => {});

    assert.match(req.correlationId, /^[0-9a-f-]{36}$/);
    assert.equal(res.headers["x-correlation-id"], req.correlationId);
});

test("gateway auth context leaves anonymous requests non-blocking", () => {
    const req = {
        cookies: {},
    };

    gatewayAuthContext(req, createResponse(), () => {});

    assert.deepEqual(req.gatewayAuth, {
        isAuthenticated: false,
        userId: null,
        tokenValid: false,
    });
});

test("api gateway exposes future service route aliases", () => {
    const router = createApiGateway({
        userRouter: Router(),
        cartRouter: Router(),
        addressRouter: Router(),
        couponRouter: Router(),
        productRouter: Router(),
        orderRouter: Router(),
        paymentRouter: Router(),
    });
    const mountedRouters = router.stack.filter((layer) => layer.name === "router");

    assert.equal(mountedRouters.length, 7);
    assert.deepEqual(GATEWAY_ROUTE_MAP, {
        auth: "/auth",
        cart: "/cart",
        addresses: "/addresses",
        coupons: "/coupons",
        products: "/products",
        orders: "/orders",
        payments: "/payments",
    });
});
