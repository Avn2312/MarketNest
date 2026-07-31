import mongoose from "mongoose";

const paymentEventSchema = new mongoose.Schema(
    {
        provider: {
            type: String,
            required: true,
            enum: ["razorpay"],
        },
        providerEventId: {
            type: String,
            required: true,
            unique: true,
        },
        eventType: { type: String, required: true },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null,
        },
        providerOrderId: { type: String, trim: true, default: "" },
        providerPaymentId: { type: String, trim: true, default: "" },
        payload: { type: Object, required: true },
        processedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

paymentEventSchema.index({ provider: 1, providerOrderId: 1 });
paymentEventSchema.index({ orderId: 1, createdAt: -1 });

const PaymentEvent =
    mongoose.models.PaymentEvent ||
    mongoose.model("PaymentEvent", paymentEventSchema);

export default PaymentEvent;
