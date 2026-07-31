import { Router } from "express";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import { createRateLimiter } from "../middlewares/rateLimit.js";
import { validateObjectIdParam } from "../middlewares/validateObjectId.js";
import {
    cancelUserOrder,
    changeOrderStatus,
    deleteOrderById,
    getAllOrders,
    getUserOrders,
    placeOrderCOD,
    placeOrderRazorpay,
    requestReturnOrder,
} from "../controllers/orderController.js";

const orderRouter = Router();
const orderMutationLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: 40,
    key: "order-mutation",
});

orderRouter.post("/cod", authenticate, orderMutationLimiter, placeOrderCOD);
orderRouter.post(
    "/razorpay",
    authenticate,
    orderMutationLimiter,
    placeOrderRazorpay
);
orderRouter.get("/user", authenticate, getUserOrders);
orderRouter.patch(
    "/:orderId/cancel",
    authenticate,
    orderMutationLimiter,
    validateObjectIdParam("orderId"),
    cancelUserOrder
);
orderRouter.patch(
    "/:orderId/return",
    authenticate,
    orderMutationLimiter,
    validateObjectIdParam("orderId"),
    requestReturnOrder
);
orderRouter.get("/seller", authenticate, authorize("seller"), getAllOrders);
orderRouter.delete(
    "/:orderId",
    authenticate,
    authorize("seller"),
    validateObjectIdParam("orderId"),
    deleteOrderById
);
orderRouter.patch(
    "/:orderId",
    authenticate,
    authorize("seller"),
    validateObjectIdParam("orderId"),
    changeOrderStatus
);

export default orderRouter;
