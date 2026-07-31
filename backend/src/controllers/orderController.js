import asyncHandler from "express-async-handler";
import CustomError from "../utils/CustomError.js";
import {
    assertRazorpayConfigured,
} from "../services/razorpayPaymentService.js";
import {
    cancelUserOrder as cancelOrder,
    changeOrderStatusBySeller,
    createCodOrder,
    createRazorpayOrderForCheckout,
    deleteOrder,
    getAllOrders as getSellerOrders,
    getUserOrders as getOrdersForUser,
    requestReturn,
} from "../services/orderService.js";

//! Place Order COD: /api/order/cod

export const placeOrderCOD = asyncHandler(async (req, res) => {
    const { items, address, couponCode } = req.body;
    const newOrder = await createCodOrder({
        items,
        address,
        couponCode,
        userId: req.user._id,
    });

    res.status(201).json({
        success: true,
        message: "Order Placed Successfully",
        newOrder,
    });
});

//! Place Order Razorpay: /api/order/razorpay

export const placeOrderRazorpay = asyncHandler(async (req, res) => {
    const { items, address, couponCode } = req.body;

    assertRazorpayConfigured();

    const razorpayOrder = await createRazorpayOrderForCheckout({
        items,
        address,
        couponCode,
        userId: req.user._id,
    });

    res.status(201).json({
        success: true,
        message: "Razorpay order created successfully",
        ...razorpayOrder,
    });
});

//! Get Orders by UserId : /api/order/user

export const getUserOrders = asyncHandler(async (req, res, next) => {
    const orders = await getOrdersForUser(req.user._id);

    if (!orders) {
        return next(new CustomError(404, "Orders not found"));
    }

    res.status(200).json({
        success: true,
        message: "User orders fetched successfully",
        orders,
    });
});

//! Get All Orders (for seller / admin) : /api/order/seller

export const getAllOrders = asyncHandler(async (req, res, next) => {
    const orders = await getSellerOrders();

    if (!orders) {
        return next(new CustomError(404, "Orders not found"));
    }

    res.status(200).json({
        success: true,
        message: "All orders fetched successfully",
        orders,
    });
});

//! Cancel user order : /api/order/:orderId/cancel

export const cancelUserOrder = asyncHandler(async (req, res, next) => {
    const { orderId } = req.params;
    const { reason = "" } = req.body;

    await cancelOrder({
        orderId,
        userId: req.user._id,
        reason,
    });

    res.status(200).json({
        success: true,
        message: "Order cancelled successfully",
    });
});

//! Request return : /api/order/:orderId/return

export const requestReturnOrder = asyncHandler(async (req, res, next) => {
    const { orderId } = req.params;
    const { reason = "" } = req.body;

    await requestReturn({
        orderId,
        userId: req.user._id,
        reason,
    });

    res.status(200).json({
        success: true,
        message: "Return request submitted",
    });
});

//! Delete Order by ID : /api/order/:orderId [DELETE]

export const deleteOrderById = asyncHandler(async (req, res, next) => {
    const { orderId } = req.params;

    await deleteOrder(orderId);

    res.status(200).json({
        success: true,
        message: "Order deleted successfully",
    });
});

//! Change Order Status: /api/order/:orderId [PATCH]
export const changeOrderStatus = asyncHandler(async (req, res, next) => {
    const { orderId } = req.params;
    const { status, returnStatus } = req.body;

    await changeOrderStatusBySeller({
        orderId,
        status,
        returnStatus,
    });

    res.status(200).json({
        success: true,
        message: "Order updated successfully",
    });
});
