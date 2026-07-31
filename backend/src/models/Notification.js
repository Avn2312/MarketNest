import mongoose from "mongoose";

export const NOTIFICATION_STATUSES = ["queued", "sent", "failed"];

export const NOTIFICATION_TYPES = [
    "order_confirmation",
    "payment_success",
    "payment_failure",
    "shipment_update",
    "return_update",
    "order_cancelled",
];

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            index: true,
        },
        type: {
            type: String,
            enum: NOTIFICATION_TYPES,
            required: true,
            index: true,
        },
        channel: { type: String, default: "email" },
        recipient: { type: String, trim: true, default: "" },
        subject: { type: String, trim: true, required: true },
        message: { type: String, trim: true, required: true },
        status: {
            type: String,
            enum: NOTIFICATION_STATUSES,
            default: "queued",
            index: true,
        },
        attempts: { type: Number, default: 0 },
        providerMessageId: { type: String, trim: true, default: "" },
        error: { type: String, trim: true, default: "" },
        payload: { type: Object, default: {} },
        sentAt: { type: Date },
    },
    { minimize: false, timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ orderId: 1, type: 1, createdAt: -1 });

const Notification =
    mongoose.models.Notification ||
    mongoose.model("Notification", notificationSchema);

export default Notification;
