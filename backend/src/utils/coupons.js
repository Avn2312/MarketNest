const coupons = [
    {
        code: "FRESH10",
        type: "percent",
        value: 10,
        minOrder: 25,
        description: "10% off on orders above INR 25",
    },
    {
        code: "NEST20",
        type: "flat",
        value: 20,
        minOrder: 90,
        description: "INR 20 off on larger weekly baskets above INR 90",
    },
    {
        code: "DAILY5",
        type: "flat",
        value: 5,
        minOrder: 30,
        description: "INR 5 off on orders above INR 30",
    },
];

export const getAvailableCoupons = () => coupons;

export const normalizeCouponCode = (couponCode = "") =>
    String(couponCode).trim().toUpperCase();

export const getCouponByCode = (couponCode) =>
    coupons.find((coupon) => coupon.code === normalizeCouponCode(couponCode));

export const calculateCouponDiscount = (subtotal, couponCode) => {
    const coupon = getCouponByCode(couponCode);

    if (!coupon) {
        return {
            coupon: null,
            discountAmount: 0,
            normalizedCode: normalizeCouponCode(couponCode),
            message: "Invalid coupon code",
        };
    }

    if (subtotal < coupon.minOrder) {
        return {
            coupon,
            discountAmount: 0,
            normalizedCode: coupon.code,
            message: `This coupon requires a minimum order of INR ${coupon.minOrder}`,
        };
    }

    const rawDiscount =
        coupon.type === "percent"
            ? (subtotal * coupon.value) / 100
            : coupon.value;

    const discountAmount = Number(
        Math.min(rawDiscount, subtotal).toFixed(2)
    );

    return {
        coupon,
        discountAmount,
        normalizedCode: coupon.code,
        message: "Coupon applied successfully",
    };
};
