import Product, { PRODUCT_STATUSES } from "../models/Product.js";
import CustomError from "../utils/CustomError.js";
import {
    PRODUCT_SEARCH_EVENTS,
    publishProductSearchEvent,
} from "./productSearchEventBus.js";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;
const DEFAULT_SORT = "newest";
const SORT_MAP = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    price_asc: { offerPrice: 1, createdAt: -1 },
    price_desc: { offerPrice: -1, createdAt: -1 },
    name_asc: { name: 1, createdAt: -1 },
};

export const getNormalizedStockQuantity = (product) =>
    typeof product.stockQuantity === "number"
        ? product.stockQuantity
        : product.inStock
        ? 24
        : 0;

export const normalizeProduct = (product) => {
    const stockQuantity = getNormalizedStockQuantity(product);
    const productData =
        typeof product?.toObject === "function" ? product.toObject() : product;

    return {
        ...productData,
        status: productData.status || "active",
        stockQuantity,
        inStock: stockQuantity > 0,
    };
};

const escapeRegex = (value) =>
    String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const parseProductListOptions = (query = {}, { publicOnly = true } = {}) => {
    const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
    const rawLimit = Number.parseInt(query.limit, 10);
    const limit = Math.min(
        Math.max(Number.isInteger(rawLimit) ? rawLimit : DEFAULT_LIMIT, 1),
        MAX_LIMIT
    );
    const category = String(query.category || "").trim();
    const sellerId = String(query.sellerId || "").trim();
    const search = String(query.search || query.q || "").trim();
    const requestedStatus = String(query.status || "").trim();
    const status =
        requestedStatus && PRODUCT_STATUSES.includes(requestedStatus)
            ? requestedStatus
            : "";
    const sort = SORT_MAP[query.sort] || SORT_MAP[DEFAULT_SORT] || {
        createdAt: -1,
    };

    return {
        page,
        limit,
        skip: (page - 1) * limit,
        category,
        sellerId,
        search,
        status,
        sort,
        publicOnly,
    };
};

export const buildProductListQuery = ({
    category,
    sellerId,
    search,
    status,
    publicOnly,
} = {}) => {
    const filter = {};

    if (category && category.toLowerCase() !== "all") {
        filter.category = category;
    }

    if (sellerId) {
        filter.sellerId = sellerId;
    }

    if (status) {
        filter.status = status;
    } else if (publicOnly) {
        filter.$or = [{ status: "active" }, { status: { $exists: false } }];
    }

    if (search) {
        const regex = new RegExp(escapeRegex(search), "i");
        const searchFilter = [
            { name: regex },
            { category: regex },
            { description: regex },
        ];

        if (filter.$or) {
            filter.$and = [{ $or: filter.$or }, { $or: searchFilter }];
            delete filter.$or;
        } else {
            filter.$or = searchFilter;
        }
    }

    return filter;
};

export const createProductCatalogService = ({
    ProductModel = Product,
    ErrorClass = CustomError,
    publishSearchEvent = publishProductSearchEvent,
} = {}) => {
    const listProducts = async (query = {}, { publicOnly = true } = {}) => {
        const options = parseProductListOptions(query, { publicOnly });
        const filter = buildProductListQuery(options);

        const [products, total] = await Promise.all([
            ProductModel.find(filter)
                .sort(options.sort)
                .skip(options.skip)
                .limit(options.limit)
                .lean(),
            ProductModel.countDocuments(filter),
        ]);

        return {
            products: products.map(normalizeProduct),
            pagination: {
                page: options.page,
                limit: options.limit,
                total,
                pages: Math.ceil(total / options.limit),
                hasNextPage: options.page * options.limit < total,
                hasPreviousPage: options.page > 1,
            },
        };
    };

    const listSellerProducts = async (sellerId, query = {}) => {
        if (!sellerId) {
            throw new ErrorClass(401, "Seller authentication required");
        }

        return listProducts(
            {
                ...query,
                sellerId,
            },
            { publicOnly: false }
        );
    };

    const getProductById = async (id, { publicOnly = true } = {}) => {
        const filter = { _id: id };

        if (publicOnly) {
            filter.$or = [{ status: "active" }, { status: { $exists: false } }];
        }

        const product = await ProductModel.findOne(filter).lean();

        if (!product) {
            throw new ErrorClass(404, "Product not found");
        }

        return normalizeProduct(product);
    };

    const createProduct = async ({ productData, imageUrls, sellerId }) => {
        const newProduct = await ProductModel.create({
            ...productData,
            sellerId,
            stockQuantity: productData.stockQuantity,
            inStock: productData.stockQuantity > 0,
            image: imageUrls,
        });
        const normalizedProduct = normalizeProduct(newProduct);

        await publishSearchEvent(PRODUCT_SEARCH_EVENTS.PRODUCT_CREATED, {
            productId: normalizedProduct._id,
            sellerId,
            status: normalizedProduct.status,
            product: normalizedProduct,
        });

        return normalizedProduct;
    };

    const updateProduct = async ({ productId, sellerId, updates }) => {
        const updatedProduct = await ProductModel.findOneAndUpdate(
            { _id: productId, sellerId },
            {
                ...updates,
                inStock: updates.stockQuantity > 0,
            },
            { new: true }
        );

        if (!updatedProduct) {
            throw new ErrorClass(404, "Product not found for this seller");
        }

        const normalizedProduct = normalizeProduct(updatedProduct);
        await publishSearchEvent(PRODUCT_SEARCH_EVENTS.PRODUCT_UPDATED, {
            productId,
            sellerId,
            status: normalizedProduct.status,
            product: normalizedProduct,
        });

        return normalizedProduct;
    };

    const updateStock = async ({ productId, sellerId, inStock, stockQuantity }) => {
        const updates = {};

        if (typeof stockQuantity === "number" && !Number.isNaN(stockQuantity)) {
            updates.stockQuantity = Math.max(0, Math.floor(stockQuantity));
            updates.inStock = updates.stockQuantity > 0;
        } else if (typeof inStock === "boolean") {
            updates.inStock = inStock;
            updates.stockQuantity = inStock ? 24 : 0;
        } else {
            throw new ErrorClass(400, "Invalid stock payload");
        }

        const updatedProduct = await ProductModel.findOneAndUpdate(
            { _id: productId, sellerId },
            { $set: updates },
            { new: true }
        );

        if (!updatedProduct) {
            throw new ErrorClass(404, "Product not found for this seller");
        }

        const normalizedProduct = normalizeProduct(updatedProduct);
        await publishSearchEvent(PRODUCT_SEARCH_EVENTS.PRODUCT_UPDATED, {
            productId,
            sellerId,
            status: normalizedProduct.status,
            product: normalizedProduct,
        });

        return normalizedProduct;
    };

    const updateStatus = async ({ productId, sellerId, status }) => {
        if (!PRODUCT_STATUSES.includes(status)) {
            throw new ErrorClass(400, "Invalid product status");
        }

        const updatedProduct = await ProductModel.findOneAndUpdate(
            { _id: productId, sellerId },
            { $set: { status } },
            { new: true }
        );

        if (!updatedProduct) {
            throw new ErrorClass(404, "Product not found for this seller");
        }

        const normalizedProduct = normalizeProduct(updatedProduct);
        await publishSearchEvent(PRODUCT_SEARCH_EVENTS.PRODUCT_STATUS_CHANGED, {
            productId,
            sellerId,
            status,
            product: normalizedProduct,
        });

        return normalizedProduct;
    };

    const deleteProduct = async ({ productId, sellerId }) => {
        const product = await ProductModel.findOne({ _id: productId, sellerId });

        if (!product) {
            throw new ErrorClass(404, "Product not found for this seller");
        }

        await ProductModel.findByIdAndDelete(productId);
        await publishSearchEvent(PRODUCT_SEARCH_EVENTS.PRODUCT_DELETED, {
            productId,
            sellerId,
            status: product.status || "active",
        });

        return normalizeProduct(product);
    };

    return {
        createProduct,
        deleteProduct,
        getProductById,
        listProducts,
        listSellerProducts,
        updateProduct,
        updateStatus,
        updateStock,
    };
};

const productCatalogService = createProductCatalogService();

export const createProduct = productCatalogService.createProduct;
export const deleteProductBySeller = productCatalogService.deleteProduct;
export const getProductById = productCatalogService.getProductById;
export const listProducts = productCatalogService.listProducts;
export const listSellerProducts = productCatalogService.listSellerProducts;
export const updateProductBySeller = productCatalogService.updateProduct;
export const updateProductStatusBySeller = productCatalogService.updateStatus;
export const updateProductStockBySeller = productCatalogService.updateStock;
