import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, required: true },
        description: { type: Array, required: true },
        price: { type: Number, required: true },
        offerPrice: { type: Number, required: true },
        image: { type: Array, required: true },
        category: { type: String, required: true },
        stockQuantity: { type: Number, default: 24, min: 0 },
        inStock: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const Product =
    mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;
