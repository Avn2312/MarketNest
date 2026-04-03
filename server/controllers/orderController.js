import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import stripe from "stripe";
import CustomError from "../utils/CustomError.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import Address from "../models/Address.js";
import {
    CLIENT_URL,
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET,
} from "../config/index.js";

const getOrderTotals = async (subtotal, couponCode) => {
    const normalizedCode = String(couponCode || "").trim().toUpperCase();
    let coupon = null;
    let discountAmount = 0;

    if (normalizedCode) {
        coupon = await Coupon.findOne({ code: normalizedCode });

        if (!coupon) {
            throw new CustomError(400, "Invalid coupon code");
        }

        if (!coupon.isActive) {
            throw new CustomError(400, "This coupon is not active");
        }

        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            throw new CustomError(400, "This coupon has expired");
        }

        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            throw new CustomError(400, "This coupon usage limit has been reached");
        }

        if (subtotal < coupon.minOrder) {
            throw new CustomError(
                400,
                `This coupon requires a minimum order of INR ${coupon.minOrder}`
            );
        }

        const rawDiscount =
            coupon.type === "percent"
                ? (subtotal * coupon.value) / 100
                : coupon.value;

        discountAmount = Number(Math.min(rawDiscount, subtotal).toFixed(2));
    }

    const tax = Number((subtotal * 0.02).toFixed(2));
    const amount = Number(Math.max(subtotal + tax - discountAmount, 0).toFixed(2));

    return {
        amount,
        coupon,
        couponCode: coupon?.code || "",
        discountAmount,
        tax,
    };
};

const getAvailableStock = (product) =>
    typeof product.stockQuantity === "number"
        ? product.stockQuantity
        : product.inStock
        ? 24
        : 0;

const stockQuantityExpression = {
    $ifNull: ["$stockQuantity", { $cond: ["$inStock", 24, 0] }],
};

const incrementInventory = async (productId, quantity) =>
    Product.findByIdAndUpdate(
        productId,
        [
            {
                $set: {
                    stockQuantity: {
                        $add: [stockQuantityExpression, quantity],
                    },
                },
            },
            {
                $set: {
                    inStock: { $gt: ["$stockQuantity", 0] },
                },
            },
        ],
        { new: true }
    );

const decrementInventory = async (productId, quantity) =>
    Product.findOneAndUpdate(
        {
            _id: productId,
            $expr: {
                $gte: [stockQuantityExpression, quantity],
            },
        },
        [
            {
                $set: {
                    stockQuantity: {
                        $subtract: [stockQuantityExpression, quantity],
                    },
                },
            },
            {
                $set: {
                    inStock: { $gt: ["$stockQuantity", 0] },
                },
            },
        ],
        { new: true }
    );

const shouldReleaseInventoryForStatus = (status) =>
    !["Cancelled", "Shipped", "Delivered"].includes(status);

const reserveInventory = async (orderEntries) => {
    const reservedProducts = [];

    try {
        for (const entry of orderEntries) {
            const updatedProduct = await decrementInventory(
                entry.product._id,
                entry.item.quantity
            );

            if (!updatedProduct) {
                const latestProduct = await Product.findById(entry.product._id);
                const availableStock = latestProduct
                    ? getAvailableStock(latestProduct)
                    : 0;

                throw new CustomError(
                    400,
                    `${entry.product.name} has only ${availableStock} item(s) left in stock`
                );
            }

            reservedProducts.push({
                productId: entry.product._id,
                quantity: entry.item.quantity,
            });
        }
    } catch (error) {
        await Promise.all(
            reservedProducts.map((item) =>
                incrementInventory(item.productId, item.quantity)
            )
        );

        throw error;
    }
};

const releaseInventoryForOrder = async (order) => {
    const populatedOrder =
        order.items?.[0]?.product && typeof order.items[0].product === "object"
            ? order
            : await order.populate("items.product");

    await Promise.all(
        populatedOrder.items
            .filter((item) => item.product)
            .map(async (item) => {
                await incrementInventory(item.product._id, item.quantity);
            })
    );
};

const releaseInventoryForEntries = async (orderEntries) => {
    await Promise.all(
        orderEntries.map(async (entry) => {
            await incrementInventory(entry.product._id, entry.item.quantity);
        })
    );
};

const getValidatedItems = async (items) => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new CustomError(400, "Invalid order items");
    }

    const normalizedItems = items.map((item) => ({
        product: item?.product,
        quantity: Number(item?.quantity),
    }));

    const hasInvalidItem = normalizedItems.some(
        (item) =>
            !item.product ||
            !Number.isInteger(item.quantity) ||
            item.quantity <= 0
    );

    if (hasInvalidItem) {
        throw new CustomError(400, "Invalid order items");
    }

    const productIds = normalizedItems.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(
        products.map((product) => [product._id.toString(), product])
    );

    return normalizedItems.map((item) => {
        const product = productMap.get(item.product.toString());

        if (!product) {
            throw new CustomError(404, `Product not found: ${item.product}`);
        }

        return { item, product };
    });
};

const getValidatedAddress = async (addressId, userId) => {
    if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
        throw new CustomError(400, "Invalid order data");
    }

    const address = await Address.findOne({
        _id: addressId,
        userId,
    }).select("_id");

    if (!address) {
        throw new CustomError(404, "Address not found");
    }

    return address;
};

//! Place Order COD: /api/order/cod

export const placeOrderCOD = asyncHandler(async (req, res, next) => {
    const { items, address, couponCode } = req.body;

    if (!address || !items || items.length === 0) {
        return next(new CustomError(400, "Invalid order data"));
    }

    const [orderEntries, validatedAddress] = await Promise.all([
        getValidatedItems(items),
        getValidatedAddress(address, req.user._id),
    ]);
    const subtotal = orderEntries.reduce(
        (total, entry) => total + entry.product.offerPrice * entry.item.quantity,
        0
    );
    const {
        amount,
        coupon,
        couponCode: appliedCouponCode,
        discountAmount,
    } = await getOrderTotals(subtotal, couponCode);

    await reserveInventory(orderEntries);

    let newOrder;

    try {
        newOrder = await Order.create({
            userId: req.user._id,
            items: orderEntries.map(({ item }) => item),
            amount,
            address: validatedAddress._id,
            couponCode: appliedCouponCode,
            discountAmount,
            paymentType: "COD",
        });
    } catch (error) {
        await releaseInventoryForEntries(orderEntries);
        throw error;
    }

    await User.findByIdAndUpdate(req.user._id, { cartItems: {} });
    if (coupon) {
        await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
    }

    res.status(201).json({
        success: true,
        message: "Order Placed Successfully",
        newOrder,
    });
});

//! Place Order Stripe: /api/order/stripe

export const placeOrderStripe = asyncHandler(async (req, res, next) => {
    const { items, address, couponCode } = req.body;
    const origin = req.headers.origin || CLIENT_URL;

    if (!address || !items || items.length === 0) {
        return next(new CustomError(400, "Invalid order data"));
    }

    if (!STRIPE_SECRET_KEY) {
        return next(new CustomError(500, "Stripe is not configured"));
    }

    const [orderEntries, validatedAddress] = await Promise.all([
        getValidatedItems(items),
        getValidatedAddress(address, req.user._id),
    ]);
    const productData = orderEntries.map(({ item, product }) => ({
        name: product.name,
        price: product.offerPrice,
        quantity: item.quantity,
    }));
    const subtotal = orderEntries.reduce(
        (total, entry) => total + entry.product.offerPrice * entry.item.quantity,
        0
    );
    const {
        amount,
        coupon,
        couponCode: appliedCouponCode,
        discountAmount,
        tax,
    } = await getOrderTotals(subtotal, couponCode);

    await reserveInventory(orderEntries);

    let newOrder;

    try {
        newOrder = await Order.create({
            userId: req.user._id,
            items: orderEntries.map(({ item }) => item),
            amount,
            address: validatedAddress._id,
            couponCode: appliedCouponCode,
            discountAmount,
            paymentType: "Online",
        });
    } catch (error) {
        await releaseInventoryForEntries(orderEntries);
        throw error;
    }

    // Stripe Gateway Initialize
    const stripeInstance = new stripe(STRIPE_SECRET_KEY);

    const line_items = productData.map((item) => ({
        price_data: {
            currency: "usd",
            product_data: {
                name: item.name,
            },
            unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
    }));

    if (tax > 0) {
        line_items.push({
            price_data: {
                currency: "usd",
                product_data: {
                    name: "Taxes and handling",
                },
                unit_amount: Math.round(tax * 100),
            },
            quantity: 1,
        });
    }

    let stripeCouponId = null;

    if (discountAmount > 0) {
        const stripeCoupon = await stripeInstance.coupons.create({
            amount_off: Math.round(discountAmount * 100),
            currency: "usd",
            duration: "once",
            name: `MarketNest ${appliedCouponCode}`,
        });

        stripeCouponId = stripeCoupon.id;
    }

    // Create Session
    let session;

    try {
        session = await stripeInstance.checkout.sessions.create({
            line_items,
            mode: "payment",
            discounts: stripeCouponId ? [{ coupon: stripeCouponId }] : [],
            success_url: `${origin}/loader?next=my-orders`,
            cancel_url: `${origin}/cart`,
            metadata: {
                orderId: newOrder._id.toString(),
                userId: req.user._id.toString(),
            },
        });
    } catch (error) {
        await releaseInventoryForEntries(orderEntries);
        await Order.findByIdAndDelete(newOrder._id);
        throw error;
    }

    res.status(201).json({
        success: true,
        url: session.url,
    });
});

//! Stripe Webhooks to Verify Payments Action : /stripe

export const stripeWebhooks = asyncHandler(async (request, response, next) => {
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
        return response.status(500).json({
            success: false,
            message: "Stripe webhook is not configured",
        });
    }

    // Stripe Gateway Initialize
    const stripeInstance = new stripe(STRIPE_SECRET_KEY);

    const signature = request.headers["stripe-signature"];
    let event;

    try {
        event = stripeInstance.webhooks.constructEvent(
            request.body,
            signature,
            STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        return response.status(400).json({
            success: false,
            message: `Webhook Error: ${error.message}`,
        });
    }

    // Handle the event
    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object;
            const { orderId, userId } = session.metadata || {};

            if (!orderId || !userId) {
                break;
            }

            const order = await Order.findByIdAndUpdate(
                orderId,
                { isPaid: true },
                { new: true }
            );

            if (order?.couponCode) {
                await Coupon.findOneAndUpdate(
                    { code: order.couponCode },
                    { $inc: { usedCount: 1 } }
                );
            }

            // Clear user cart
            await User.findByIdAndUpdate(userId, { cartItems: {} });
            break;
        }

        case "checkout.session.expired": {
            const session = event.data.object;
            const { orderId } = session.metadata || {};

            if (orderId) {
                const order = await Order.findById(orderId).populate("items.product");

                if (order) {
                    await releaseInventoryForOrder(order);
                    await Order.findByIdAndDelete(orderId);
                }
            }
            break;
        }
        default:
            console.log(`Unhandled event type ${event.type}`);
            break;
    }

    response.json({ received: true });
});

//! Get Orders by UserId : /api/order/user

export const getUserOrders = asyncHandler(async (req, res, next) => {
    const orders = await Order.find({
        userId: req.user._id,
        $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
        .populate("items.product address")
        .sort({ createdAt: -1 });

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
    const orders = await Order.find({
        $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
        .populate("items.product address")
        .sort({ createdAt: -1 });

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

    const order = await Order.findOne({
        _id: orderId,
        userId: req.user._id,
    });

    if (!order) {
        return next(new CustomError(404, "Order not found"));
    }

    if (["Shipped", "Delivered"].includes(order.status)) {
        return next(
            new CustomError(400, "This order can no longer be cancelled")
        );
    }

    if (order.status === "Cancelled") {
        return next(new CustomError(400, "Order is already cancelled"));
    }

    await releaseInventoryForOrder(order);

    await Order.findByIdAndUpdate(orderId, {
        status: "Cancelled",
        cancelReason: reason,
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

    const order = await Order.findOne({
        _id: orderId,
        userId: req.user._id,
    });

    if (!order) {
        return next(new CustomError(404, "Order not found"));
    }

    if (order.status !== "Delivered") {
        return next(
            new CustomError(400, "Return requests are available after delivery")
        );
    }

    if (order.returnStatus !== "none") {
        return next(new CustomError(400, "Return request already submitted"));
    }

    await Order.findByIdAndUpdate(orderId, {
        returnStatus: "requested",
        returnReason: reason,
    });

    res.status(200).json({
        success: true,
        message: "Return request submitted",
    });
});

//! Delete Order by ID : /api/order/:orderId [DELETE]

export const deleteOrderById = asyncHandler(async (req, res, next) => {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
        return next(new CustomError(404, "Order not found"));
    }

    if (shouldReleaseInventoryForStatus(order.status)) {
        await releaseInventoryForOrder(order);
    }
    await Order.findByIdAndDelete(orderId);

    res.status(200).json({
        success: true,
        message: "Order deleted successfully",
    });
});

//! Change Order Status: /api/order/:orderId [PATCH]
export const changeOrderStatus = asyncHandler(async (req, res, next) => {
    const { orderId } = req.params;
    const { status, returnStatus } = req.body;

    if (!status && !returnStatus) {
        return next(new CustomError(400, "Invalid update payload"));
    }

    const order = await Order.findById(orderId);

    if (!order) {
        return next(new CustomError(404, "Order not found"));
    }

    if (status && order.status !== "Cancelled" && status === "Cancelled") {
        await releaseInventoryForOrder(order);
    }

    if (status && order.status === "Cancelled" && status !== "Cancelled") {
        const replenishedOrder = await order.populate("items.product");
        const orderEntries = replenishedOrder.items
            .filter((item) => item.product)
            .map((item) => ({
                item: {
                    product: item.product._id,
                    quantity: item.quantity,
                },
                product: item.product,
            }));

        await reserveInventory(orderEntries);
    }

    const updates = {};

    if (status) {
        updates.status = status;
    }

    if (returnStatus) {
        updates.returnStatus = returnStatus;

        if (returnStatus === "completed") {
            if (order.returnStatus !== "completed") {
                await releaseInventoryForOrder(order);
            }
            updates.status = "Cancelled";
        }
    }

    await Order.findByIdAndUpdate(orderId, updates);

    res.status(200).json({
        success: true,
        message: "Order updated successfully",
    });
});
