import asyncHandler from "express-async-handler";
import { v2 as cloudinary } from "cloudinary";
import Product from "../models/Product.js";
import CustomError from "../utils/CustomError.js";
import { productValidationSchema } from "./../utils/productValidation.js";

const PRODUCT_LIST_TTL_MS = 5000;
let productListCache = {
    data: null,
    expiresAt: 0,
};

const invalidateProductListCache = () => {
    productListCache = {
        data: null,
        expiresAt: 0,
    };
};

const getNormalizedStockQuantity = (product) =>
    typeof product.stockQuantity === "number"
        ? product.stockQuantity
        : product.inStock
        ? 24
        : 0;

const normalizeProduct = (product) => {
    const stockQuantity = getNormalizedStockQuantity(product);
    const productData =
        typeof product?.toObject === "function" ? product.toObject() : product;

    return {
        ...productData,
        stockQuantity,
        inStock: stockQuantity > 0,
    };
};

//! Add Product: /api/product/add

export const addProduct = asyncHandler(async (req, res, next) => {
    let productData;

    try {
        productData = JSON.parse(req.body.productData);
    } catch (err) {
        throw new CustomError(400, "Invalid JSON format in 'productData'");
    }

    const { error } = productValidationSchema.validate(productData, {
        convert: true,
    });

    if (error) {
        const message =
            error.details[0].context?.message ||
            error.details[0].message ||
            "Invalid product payload";
        return next(new CustomError(400, message));
    }

    const images = req.files || [];

    if (images.length === 0) {
        return next(new CustomError(400, "At least one product image is required"));
    }

    if (!cloudinary.config().cloud_name) {
        return next(new CustomError(500, "Cloudinary is not configured"));
    }

    let imagesUrl = await Promise.all(
        images.map(async (item) => {
            let result = await cloudinary.uploader.upload(item.path, {
                resource_type: "image",
            });
            return result.secure_url;
        })
    );

    const newProduct = await Product.create({
        ...productData,
        stockQuantity: productData.stockQuantity,
        inStock: productData.stockQuantity > 0,
        image: imagesUrl,
    });

    invalidateProductListCache();

    res.status(201).json({
        success: true,
        message: "Product added successfully",
        newProduct,
    });
});

//! Get All Product: /api/product/list

export const productList = asyncHandler(async (req, res, next) => {
    const now = Date.now();

    if (productListCache.data && productListCache.expiresAt > now) {
        return res.status(200).json({
            success: true,
            message: "All products fetched successfully",
            products: productListCache.data,
        });
    }

    const products = await Product.find({}).lean();

    if (!products) {
        return next(new CustomError(404, "Not found any product"));
    }

    const normalizedProducts = products.map(normalizeProduct);
    productListCache = {
        data: normalizedProducts,
        expiresAt: now + PRODUCT_LIST_TTL_MS,
    };

    res.status(200).json({
        success: true,
        message: "All products fetched successfully",
        products: normalizedProducts,
    });
});

//! Get Single Product: /api/product/:id

export const getProductById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const product = await Product.findById(id).lean();
    if (!product) {
        return next(new CustomError(404, "Product not found"));
    }

    res.status(200).json({
        success: true,
        message: "Product details fetched successfully",
        product: normalizeProduct(product),
    });
});

//! Change Product inStock: /api/product/:id

export const changeStock = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { inStock, stockQuantity } = req.body;

    const updates = {};

    if (typeof stockQuantity === "number" && !Number.isNaN(stockQuantity)) {
        updates.stockQuantity = Math.max(0, Math.floor(stockQuantity));
        updates.inStock = updates.stockQuantity > 0;
    } else if (typeof inStock === "boolean") {
        updates.inStock = inStock;
        updates.stockQuantity = inStock ? 24 : 0;
    } else {
        return next(new CustomError(400, "Invalid stock payload"));
    }

    const updatedProduct = await Product.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true }
    );
    if (!updatedProduct) {
        return next(new CustomError(404, "Product not found"));
    }

    invalidateProductListCache();

    res.status(200).json({
        success: true,
        message: "Stock Updated",
        updatedProduct: normalizeProduct(updatedProduct),
    });
});

//! Update Product: /api/product/:id

export const updateProduct = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { error, value } = productValidationSchema.validate(req.body, {
        convert: true,
    });

    if (error) {
        const message =
            error.details[0].context?.message ||
            error.details[0].message ||
            "Invalid product payload";
        return next(new CustomError(400, message));
    }

    const updatedProduct = await Product.findByIdAndUpdate(
        id,
        {
            ...value,
            inStock: value.stockQuantity > 0,
        },
        { new: true }
    );

    if (!updatedProduct) {
        return next(new CustomError(404, "Product not found"));
    }

    invalidateProductListCache();

    res.status(200).json({
        success: true,
        message: "Product updated successfully",
        updatedProduct: normalizeProduct(updatedProduct),
    });
});

//! Delete Product: /api/product/:id

export const deleteProduct = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
        return next(new CustomError(404, "Product not found"));
    }

    // Delete product images from Cloudinary
    try {
        await Promise.all(
            product.image.map(async (url) => {
                // Extract public ID from the image URL
                const publicId = url.split("/").pop().split(".")[0];
                await cloudinary.uploader.destroy(publicId, {
                    resource_type: "image",
                });
            })
        );
    } catch (error) {
        console.error("Cloudinary deletion error:", error.message);
    }

    await Product.findByIdAndDelete(id);
    invalidateProductListCache();

    res.status(200).json({
        success: true,
        message: "Product deleted successfully",
    });
});
