import Product from "../models/Product.js";
import CustomError from "../utils/CustomError.js";

export const stockQuantityExpression = {
    $ifNull: ["$stockQuantity", { $cond: ["$inStock", 24, 0] }],
};

export const getAvailableStock = (product) =>
    typeof product.stockQuantity === "number"
        ? product.stockQuantity
        : product.inStock
        ? 24
        : 0;

export const createInventoryService = ({
    ProductModel = Product,
    ErrorClass = CustomError,
} = {}) => {
    const incrementInventory = async (productId, quantity) =>
        ProductModel.findByIdAndUpdate(
            productId,
            [
                {
                    $set: {
                        stockQuantity: {
                            $add: [stockQuantityExpression, quantity],
                        },
                    },
                },
                {
                    $set: {
                        inStock: { $gt: ["$stockQuantity", 0] },
                    },
                },
            ],
            { new: true }
        );

    const decrementInventory = async (productId, quantity) =>
        ProductModel.findOneAndUpdate(
            {
                _id: productId,
                $expr: {
                    $gte: [stockQuantityExpression, quantity],
                },
            },
            [
                {
                    $set: {
                        stockQuantity: {
                            $subtract: [stockQuantityExpression, quantity],
                        },
                    },
                },
                {
                    $set: {
                        inStock: { $gt: ["$stockQuantity", 0] },
                    },
                },
            ],
            { new: true }
        );

    const reserveInventory = async (orderEntries) => {
        const reservedProducts = [];

        try {
            for (const entry of orderEntries) {
                const updatedProduct = await decrementInventory(
                    entry.product._id,
                    entry.item.quantity
                );

                if (!updatedProduct) {
                    const latestProduct = await ProductModel.findById(
                        entry.product._id
                    );
                    const availableStock = latestProduct
                        ? getAvailableStock(latestProduct)
                        : 0;

                    throw new ErrorClass(
                        400,
                        `${entry.product.name} has only ${availableStock} item(s) left in stock`
                    );
                }

                reservedProducts.push({
                    productId: entry.product._id,
                    quantity: entry.item.quantity,
                });
            }
        } catch (error) {
            await Promise.all(
                reservedProducts.map((item) =>
                    incrementInventory(item.productId, item.quantity)
                )
            );

            throw error;
        }
    };

    const releaseInventoryForOrder = async (order) => {
        const populatedOrder =
            order.items?.[0]?.product && typeof order.items[0].product === "object"
                ? order
                : await order.populate("items.product");

        await Promise.all(
            populatedOrder.items
                .filter((item) => item.product)
                .map(async (item) => {
                    await incrementInventory(item.product._id, item.quantity);
                })
        );
    };

    const releaseInventoryForEntries = async (orderEntries) => {
        await Promise.all(
            orderEntries.map(async (entry) => {
                await incrementInventory(entry.product._id, entry.item.quantity);
            })
        );
    };

    return {
        decrementInventory,
        incrementInventory,
        reserveInventory,
        releaseInventoryForEntries,
        releaseInventoryForOrder,
    };
};

const inventoryService = createInventoryService();

export const decrementInventory = inventoryService.decrementInventory;
export const incrementInventory = inventoryService.incrementInventory;
export const reserveInventory = inventoryService.reserveInventory;
export const releaseInventoryForEntries =
    inventoryService.releaseInventoryForEntries;
export const releaseInventoryForOrder = inventoryService.releaseInventoryForOrder;
