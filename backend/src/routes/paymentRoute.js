import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import { createRateLimiter } from "../middlewares/rateLimit.js";
import {
    reconcileRazorpayPayment,
    verifyRazorpayPayment,
} from "../controllers/paymentController.js";

const paymentRouter = Router();
const paymentMutationLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: 60,
    key: "payment-mutation",
});

paymentRouter.post(
    "/razorpay/verify",
    authenticate,
    paymentMutationLimiter,
    verifyRazorpayPayment
);
paymentRouter.post(
    "/razorpay/reconcile",
    authenticate,
    paymentMutationLimiter,
    reconcileRazorpayPayment
);
export default paymentRouter;
