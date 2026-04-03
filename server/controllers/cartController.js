import asyncHandler from "express-async-handler";
import CustomError from "../utils/CustomError.js";
import User from "../models/User.js";

//! Update User CartData : /api/cart/update

export const updateCart = asyncHandler(async (req, res, next) => {
    const { cartItems } = req.body;

    if (!cartItems || typeof cartItems !== "object" || Array.isArray(cartItems)) {
        return next(new CustomError(400, "Invalid cart data"));
    }

    const sanitizedCartItems = Object.entries(cartItems).reduce(
        (accumulator, [productId, quantity]) => {
            const parsedQuantity = Number(quantity);

            if (
                productId &&
                Number.isInteger(parsedQuantity) &&
                parsedQuantity > 0
            ) {
                accumulator[productId] = parsedQuantity;
            }

            return accumulator;
        },
        {}
    );

    const updateResult = await User.updateOne(
        { _id: req.user._id },
        { $set: { cartItems: sanitizedCartItems } }
    );

    if (!updateResult.matchedCount) {
        return next(new CustomError(404, "User not found"));
    }

    res.status(200).json({
        success: true,
        message: "Cart updated successfully",
        cartItems: sanitizedCartItems,
    });
});
