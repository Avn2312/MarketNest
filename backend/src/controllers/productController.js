import asyncHandler from "express-async-handler";
import { v2 as cloudinary } from "cloudinary";
import CustomError from "../utils/CustomError.js";
import { getCloudinaryPublicId } from "../utils/cloudinaryHelper.js";
import { productValidationSchema } from "./../utils/productValidation.js";
import {
    createProduct,
    deleteProductBySeller,
    getProductById as getCatalogProductById,
    listProducts,
    listSellerProducts,
    updateProductBySeller,
    updateProductStatusBySeller,
    updateProductStockBySeller,
} from "../services/productCatalogService.js";

//! Add Product: /api/product/add

export const addProduct = asyncHandler(async (req, res, next) => {
    let productData;

    try {
        productData = JSON.parse(req.body.productData);
    } catch (err) {
        throw new CustomError(400, "Invalid JSON format in 'productData'");
    }

    const { error, value } = productValidationSchema.validate(productData, {
        convert: true,
        stripUnknown: true,
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

    const newProduct = await createProduct({
        productData: value,
        imageUrls: imagesUrl,
        sellerId: req.user._id,
    });

    res.status(201).json({
        success: true,
        message: "Product added successfully",
        newProduct,
    });
});

//! Get All Product: /api/product/list

export const productList = asyncHandler(async (req, res, next) => {
    const { products, pagination } = await listProducts(req.query);

    res.status(200).json({
        success: true,
        message: "All products fetched successfully",
        products,
        pagination,
    });
});

//! Get Seller Products: /api/product/seller/list

export const sellerProductList = asyncHandler(async (req, res) => {
    const { products, pagination } = await listSellerProducts(
        req.user._id,
        req.query
    );

    res.status(200).json({
        success: true,
        message: "Seller products fetched successfully",
        products,
        pagination,
    });
});

//! Get Single Product: /api/product/:id

export const getProductById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const product = await getCatalogProductById(id);

    res.status(200).json({
        success: true,
        message: "Product details fetched successfully",
        product,
    });
});

//! Change Product inStock: /api/product/:id

export const changeStock = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { inStock, stockQuantity } = req.body;
    const updatedProduct = await updateProductStockBySeller({
        productId: id,
        sellerId: req.user._id,
        inStock,
        stockQuantity,
    });

    res.status(200).json({
        success: true,
        message: "Stock Updated",
        updatedProduct,
    });
});

//! Update Product: /api/product/:id

export const updateProduct = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { error, value } = productValidationSchema.validate(req.body, {
        convert: true,
        stripUnknown: true,
    });

    if (error) {
        const message =
            error.details[0].context?.message ||
            error.details[0].message ||
            "Invalid product payload";
        return next(new CustomError(400, message));
    }

    const updatedProduct = await updateProductBySeller({
        productId: id,
        sellerId: req.user._id,
        updates: value,
    });

    res.status(200).json({
        success: true,
        message: "Product updated successfully",
        updatedProduct,
    });
});

//! Update Product Status: /api/product/:id/status

export const updateProductStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const updatedProduct = await updateProductStatusBySeller({
        productId: id,
        sellerId: req.user._id,
        status,
    });

    res.status(200).json({
        success: true,
        message: "Product status updated successfully",
        updatedProduct,
    });
});

//! Delete Product: /api/product/:id

export const deleteProduct = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const product = await deleteProductBySeller({
        productId: id,
        sellerId: req.user._id,
    });

    // Delete product images from Cloudinary
    try {
        await Promise.all(
            (product.image || []).map(async (url) => {
                const publicId = getCloudinaryPublicId(url);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId, {
                        resource_type: "image",
                    });
                }
            })
        );
    } catch (error) {
        console.error("Cloudinary deletion error:", error.message);
    }

    res.status(200).json({
        success: true,
        message: "Product deleted successfully",
    });
});
