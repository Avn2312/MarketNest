import asyncHandler from "express-async-handler";
import {
    processRazorpayWebhook,
    processRazorpayCheckoutVerification,
    reconcileRazorpayOrderPayments,
} from "../services/razorpayPaymentService.js";

export const razorpayWebhooks = asyncHandler(async (req, res) => {
    const result = await processRazorpayWebhook({
        rawBody: req.body,
        signature: req.headers["x-razorpay-signature"],
    });

    res.status(200).json({
        success: true,
        received: true,
        duplicate: result.duplicate,
    });
});

export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
    const {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        orderId,
    } = req.body;

    const result = await processRazorpayCheckoutVerification({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        orderId,
        userId: req.user?._id,
    });

    res.status(200).json({
        success: true,
        duplicate: result.duplicate,
        paymentStatus: result.paymentStatus,
        message:
            result.paymentStatus === "captured"
                ? "Payment verified successfully"
                : "Payment verification recorded; waiting for capture webhook",
    });
});

export const reconcileRazorpayPayment = asyncHandler(async (req, res) => {
    const { razorpay_order_id: razorpayOrderId, orderId, userId } = req.body;

    const result = await reconcileRazorpayOrderPayments({
        razorpayOrderId,
        orderId,
        userId: userId || req.user?._id,
    });

    res.status(200).json({
        success: true,
        ...result,
    });
});
