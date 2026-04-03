import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
    {
        code: { type: String, trim: true, required: true, unique: true },
        type: {
            type: String,
            enum: ["flat", "percent"],
            required: true,
        },
        value: { type: Number, required: true, min: 0 },
        minOrder: { type: Number, default: 0, min: 0 },
        description: { type: String, trim: true, default: "" },
        expiresAt: { type: Date, default: null },
        usageLimit: { type: Number, default: null, min: 1 },
        usedCount: { type: Number, default: 0, min: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);

export default Coupon;
