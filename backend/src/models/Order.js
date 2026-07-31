import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true,
                },
                quantity: { type: Number, required: true },
            },
        ],
        amount: { type: Number, required: true },
        address: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Address",
            required: true,
        },
        couponCode: { type: String, trim: true, default: "" },
        discountAmount: { type: Number, default: 0 },
        status: { type: String, default: "Order Placed" },
        cancelReason: { type: String, trim: true, default: "" },
        returnReason: { type: String, trim: true, default: "" },
        returnStatus: {
            type: String,
            default: "none",
            enum: ["none", "requested", "approved", "rejected", "completed"],
        },
        paymentType: { type: String, required: true },
        paymentProvider: { type: String, trim: true, default: "" },
        providerOrderId: { type: String, trim: true, default: "" },
        providerPaymentId: { type: String, trim: true, default: "" },
        isPaid: { type: Boolean, default: false, required: true },
    },
    { timestamps: true }
);

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;
