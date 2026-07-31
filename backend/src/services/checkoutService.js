import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import CustomError from "../utils/CustomError.js";

export const calculateOrderTotals = async (
    subtotal,
    couponCode,
    { CouponModel = Coupon, ErrorClass = CustomError } = {}
) => {
    const normalizedCode = String(couponCode || "").trim().toUpperCase();
    let coupon = null;
    let discountAmount = 0;

    if (normalizedCode) {
        coupon = await CouponModel.findOne({ code: normalizedCode });

        if (!coupon) {
            throw new ErrorClass(400, "Invalid coupon code");
        }

        if (!coupon.isActive) {
            throw new ErrorClass(400, "This coupon is not active");
        }

        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            throw new ErrorClass(400, "This coupon has expired");
        }

        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            throw new ErrorClass(400, "This coupon usage limit has been reached");
        }

        if (subtotal < coupon.minOrder) {
            throw new ErrorClass(
                400,
                `This coupon requires a minimum order of INR ${coupon.minOrder}`
            );
        }

        const rawDiscount =
            coupon.type === "percent"
                ? (subtotal * coupon.value) / 100
                : coupon.value;

        discountAmount = Number(Math.min(rawDiscount, subtotal).toFixed(2));
    }

    const tax = Number((subtotal * 0.02).toFixed(2));
    const amount = Number(Math.max(subtotal + tax - discountAmount, 0).toFixed(2));

    return {
        amount,
        coupon,
        couponCode: coupon?.code || "",
        discountAmount,
        tax,
    };
};

export const getValidatedItems = async (
    items,
    { ProductModel = Product, ErrorClass = CustomError } = {}
) => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new ErrorClass(400, "Invalid order items");
    }

    const normalizedItems = items.map((item) => ({
        product: item?.product,
        quantity: Number(item?.quantity),
    }));

    const hasInvalidItem = normalizedItems.some(
        (item) =>
            !item.product ||
            !Number.isInteger(item.quantity) ||
            item.quantity <= 0
    );

    if (hasInvalidItem) {
        throw new ErrorClass(400, "Invalid order items");
    }

    const productIds = normalizedItems.map((item) => item.product);
    const products = await ProductModel.find({
        _id: { $in: productIds },
        $or: [{ status: "active" }, { status: { $exists: false } }],
    });
    const productMap = new Map(
        products.map((product) => [product._id.toString(), product])
    );

    return normalizedItems.map((item) => {
        const product = productMap.get(item.product.toString());

        if (!product) {
            throw new ErrorClass(404, `Product not found: ${item.product}`);
        }

        return { item, product };
    });
};

export const getOrderSubtotal = (orderEntries) =>
    orderEntries.reduce(
        (total, entry) => total + entry.product.offerPrice * entry.item.quantity,
        0
    );
