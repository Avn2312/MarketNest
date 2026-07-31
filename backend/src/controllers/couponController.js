import asyncHandler from "express-async-handler";
import Coupon from "../models/Coupon.js";
import CustomError from "../utils/CustomError.js";
import { couponValidationSchema } from "../utils/couponValidation.js";

const normalizeCoupon = (coupon) => ({
  ...coupon.toObject(),
  code: coupon.code.toUpperCase(),
  isExpired: Boolean(
    coupon.expiresAt && new Date(coupon.expiresAt) < new Date(),
  ),
});

export const getPublicCoupons = asyncHandler(async (req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({
    isActive: true,
    $and: [
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      {
        $or: [
          { usageLimit: null },
          { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
        ],
      },
    ],
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    coupons: coupons.map(normalizeCoupon),
  });
});

export const getSellerCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find({}).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    coupons: coupons.map(normalizeCoupon),
  });
});

export const createCoupon = asyncHandler(async (req, res, next) => {
  const { error, value } = couponValidationSchema.validate(req.body, {
    convert: true,
  });

  if (error) {
    return next(
      new CustomError(
        400,
        error.details[0].context?.message ||
          error.details[0].message ||
          "Invalid coupon payload",
      ),
    );
  }

  const normalizedCode = value.code.toUpperCase();
  const existingCoupon = await Coupon.findOne({ code: normalizedCode });
  if (existingCoupon) {
    return next(new CustomError(400, "Coupon code already exists"));
  }

  const coupon = await Coupon.create({
    ...value,
    code: normalizedCode,
    expiresAt: value.expiresAt || null,
    usageLimit: value.usageLimit || null,
  });

  res.status(201).json({
    success: true,
    message: "Coupon created successfully",
    coupon: normalizeCoupon(coupon),
  });
});

export const updateCoupon = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { error, value } = couponValidationSchema.validate(req.body, {
    convert: true,
  });

  if (error) {
    return next(
      new CustomError(
        400,
        error.details[0].context?.message ||
          error.details[0].message ||
          "Invalid coupon payload",
      ),
    );
  }

  const normalizedCode = value.code.toUpperCase();
  const existingCoupon = await Coupon.findOne({
    code: normalizedCode,
    _id: { $ne: id },
  });
  if (existingCoupon) {
    return next(new CustomError(400, "Coupon code already exists"));
  }

  const coupon = await Coupon.findByIdAndUpdate(
    id,
    {
      ...value,
      code: normalizedCode,
      expiresAt: value.expiresAt || null,
      usageLimit: value.usageLimit || null,
    },
    { new: true },
  );

  if (!coupon) {
    return next(new CustomError(404, "Coupon not found"));
  }

  res.status(200).json({
    success: true,
    message: "Coupon updated successfully",
    coupon: normalizeCoupon(coupon),
  });
});

export const deleteCoupon = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const coupon = await Coupon.findById(id);

  if (!coupon) {
    return next(new CustomError(404, "Coupon not found"));
  }

  await Coupon.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "Coupon deleted successfully",
  });
});
