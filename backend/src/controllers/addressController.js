import asyncHandler from "express-async-handler";
import CustomError from "../utils/CustomError.js";
import Address from "../models/Address.js";

//! Add Address : /api/address/add

export const addAddress = asyncHandler(async (req, res, next) => {
    const { address } = req.body;

    if (!address || typeof address !== "object") {
        return next(new CustomError(400, "Invalid address data"));
    }

    const newAddress = await Address.create({
        ...address,
        userId: req.user._id,
    });
    if (!newAddress) {
        return next(new CustomError(500, "Error while adding address"));
    }

    res.status(200).json({
        success: true,
        message: "Address added successfully",
        newAddress,
    });
});

//! Get Address : /api/address/get

export const getAddress = asyncHandler(async (req, res, next) => {
    const addresses = await Address.find({ userId: req.user._id });

    res.status(200).json({
        success: true,
        message: "Addresses fetched successfully",
        addresses,
    });
});
