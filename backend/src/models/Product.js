import mongoose from "mongoose";

export const PRODUCT_STATUSES = [
    "draft",
    "pending_review",
    "active",
    "rejected",
    "archived",
];

const productSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, required: true },
        description: { type: Array, required: true },
        price: { type: Number, required: true },
        offerPrice: { type: Number, required: true },
        image: { type: Array, required: true },
        category: { type: String, required: true },
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },
        status: {
            type: String,
            enum: PRODUCT_STATUSES,
            default: "active",
            index: true,
        },
        stockQuantity: { type: Number, default: 24, min: 0 },
        inStock: { type: Boolean, default: true },
    },
    { timestamps: true }
);

productSchema.index({ category: 1, status: 1, createdAt: -1 });
productSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
productSchema.index({ name: "text", category: "text", description: "text" });

const Product =
    mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;
