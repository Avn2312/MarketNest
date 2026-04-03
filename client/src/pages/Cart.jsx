import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { assets } from "../assets/assets";
import Loader from "../components/Loader";
import { useAppContext } from "../context/AppContext";
import {
    ERROR_MESSAGES,
    getApiErrorMessage,
    getFriendlyErrorMessage,
} from "../utils/errorMessages";

const paymentMethods = [
    {
        value: "COD",
        title: "Cash on delivery",
        text: "Pay when your order arrives at your doorstep.",
    },
    {
        value: "Online",
        title: "Online payment",
        text: "Continue to secure Stripe checkout for card payment.",
    },
];

const getCouponDiscount = (subtotal, coupon, currency) => {
    if (!coupon) {
        return {
            isValid: false,
            discountAmount: 0,
            message: "",
        };
    }

    if (subtotal < coupon.minOrder) {
        return {
            isValid: false,
            discountAmount: 0,
            message: `This coupon requires a minimum order of ${currency}${coupon.minOrder}.`,
        };
    }

    const rawDiscount =
        coupon.type === "percent"
            ? (subtotal * coupon.value) / 100
            : coupon.value;

    return {
        isValid: true,
        discountAmount: Number(Math.min(rawDiscount, subtotal).toFixed(2)),
        message: "Coupon applied successfully.",
    };
};

const Cart = () => {
    const {
        axios,
        cartItems,
        currency,
        getAvailableStock,
        getCartAmount,
        getCartCount,
        isProductsLoading,
        navigate,
        products,
        setCartItems,
        updateCartItem,
        user,
    } = useAppContext();

    const [addresses, setAddresses] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [paymentOption, setPaymentOption] = useState("COD");
    const [loading, setLoading] = useState(false);
    const [isAddressLoading, setIsAddressLoading] = useState(false);
    const [availableCoupons, setAvailableCoupons] = useState([]);
    const [couponInput, setCouponInput] = useState("");
    const [appliedCouponCode, setAppliedCouponCode] = useState("");

    const cartArray = useMemo(
        () =>
            Object.entries(cartItems).reduce((accumulator, [productId, quantity]) => {
                const product = products.find((item) => item._id === productId);

                if (product) {
                    accumulator.push({ ...product, quantity });
                }

                return accumulator;
            }, []),
        [cartItems, products]
    );

    const subtotal = getCartAmount();
    const tax = Number(((subtotal * 2) / 100).toFixed(2));

    const appliedCoupon = useMemo(
        () =>
            availableCoupons.find(
                (coupon) => coupon.code === appliedCouponCode.trim().toUpperCase()
            ) || null,
        [appliedCouponCode, availableCoupons]
    );

    const couponState = useMemo(
        () => getCouponDiscount(subtotal, appliedCoupon, currency),
        [appliedCoupon, currency, subtotal]
    );

    const totalAmount = Number(
        Math.max(subtotal + tax - couponState.discountAmount, 0).toFixed(2)
    );

    const getUserAddresses = useCallback(async () => {
        try {
            setIsAddressLoading(true);
            const { data } = await axios.get("/api/address/get");

            if (data.success) {
                setAddresses(data.addresses);
                setSelectedAddress((currentSelectedAddress) => {
                    if (currentSelectedAddress) {
                        return (
                            data.addresses.find(
                                (address) => address._id === currentSelectedAddress._id
                            ) || data.addresses[0] || null
                        );
                    }

                    return data.addresses[0] || null;
                });
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setIsAddressLoading(false);
        }
    }, [axios]);

    const getCoupons = useCallback(async () => {
        try {
            const { data } = await axios.get("/api/coupon");

            if (data.success) {
                setAvailableCoupons(data.coupons);
            }
        } catch {
            setAvailableCoupons([]);
        }
    }, [axios]);

    const placeOrder = async () => {
        try {
            if (!cartArray.length) {
                toast.error(ERROR_MESSAGES.cartEmpty);
                return;
            }

            if (!selectedAddress) {
                toast.error(ERROR_MESSAGES.selectAddress);
                return;
            }

            if (appliedCouponCode && !couponState.isValid) {
                toast.error(
                    getFriendlyErrorMessage(
                        couponState.message || "Invalid coupon code",
                        ERROR_MESSAGES.invalidCoupon
                    )
                );
                return;
            }

            setLoading(true);

            const payload = {
                items: cartArray.map((item) => ({
                    product: item._id,
                    quantity: item.quantity,
                })),
                address: selectedAddress._id,
                couponCode: couponState.isValid ? appliedCouponCode : "",
            };

            if (paymentOption === "COD") {
                const { data } = await axios.post("/api/order/cod", payload);

                if (data.success) {
                    toast.success(data.message);
                    setCartItems({});
                    navigate("/my-orders");
                }

                return;
            }

            const { data } = await axios.post("/api/order/stripe", payload);

            if (data.success) {
                window.location.replace(data.url);
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            getUserAddresses();
        }
    }, [getUserAddresses, user]);

    useEffect(() => {
        getCoupons();
    }, [getCoupons]);

    useEffect(() => {
        if (!appliedCoupon || couponState.isValid) {
            return;
        }

        setAppliedCouponCode("");
        setCouponInput("");
        toast.error(getFriendlyErrorMessage(couponState.message));
    }, [appliedCoupon, couponState.isValid, couponState.message]);

    const applyCoupon = (couponCode) => {
        const normalizedCode = couponCode.trim().toUpperCase();

        if (!normalizedCode) {
            toast.error(ERROR_MESSAGES.enterCoupon);
            return;
        }

        const matchedCoupon = availableCoupons.find(
            (coupon) => coupon.code === normalizedCode
        );

        if (!matchedCoupon) {
            toast.error(ERROR_MESSAGES.invalidCoupon);
            return;
        }

        const nextCouponState = getCouponDiscount(
            subtotal,
            matchedCoupon,
            currency
        );

        if (!nextCouponState.isValid) {
            toast.error(getFriendlyErrorMessage(nextCouponState.message));
            return;
        }

        setAppliedCouponCode(normalizedCode);
        setCouponInput(normalizedCode);
        toast.success(`${normalizedCode} applied`);
    };

    const removeCoupon = () => {
        setAppliedCouponCode("");
        setCouponInput("");
        toast.success("Coupon removed");
    };

    if (isProductsLoading) {
        return <Loader />;
    }

    if (!cartArray.length) {
        return (
            <div className="mt-16 pb-16">
                <div className="mx-auto max-w-3xl rounded-[34px] border border-[#e6decb] bg-[linear-gradient(135deg,#faf7f1_0%,#f4efe3_55%,#eef4ef_100%)] px-6 py-12 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:px-10">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                        Basket empty
                    </p>
                    <h1 className="mt-4 text-3xl font-semibold text-[#1b2a21] sm:text-4xl">
                        Your cart is ready for a fresh start.
                    </h1>
                    <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-gray-600">
                        Add produce, dairy, pantry staples, and bakery items to
                        start your next MarketNest order.
                    </p>
                    <button
                        onClick={() => {
                            navigate("/products");
                            scrollTo(0, 0);
                        }}
                        className="mt-8 rounded-full bg-[#1f3a2f] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#183025]"
                    >
                        Browse products
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-16 pb-16">
            <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
                <section>
                    <div className="max-w-2xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                            Checkout
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold text-[#1b2a21] sm:text-4xl">
                            Review your basket before placing the order.
                        </h1>
                        <p className="mt-3 text-base leading-7 text-gray-600">
                            Confirm quantities, choose a delivery address, and pick
                            the payment method that fits your checkout flow.
                        </p>
                    </div>

                    <div className="mt-8 space-y-4">
                        {cartArray.map((product) => (
                            <article
                                key={product._id}
                                className="grid gap-4 rounded-[30px] border border-[#e6decb] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:grid-cols-[120px_minmax(0,1fr)] sm:p-5"
                            >
                                <button
                                    onClick={() => {
                                        navigate(
                                            `/products/${product.category.toLowerCase()}/${product._id}`
                                        );
                                        scrollTo(0, 0);
                                    }}
                                    className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[24px] bg-[#f7f3e8] p-4"
                                >
                                    <img
                                        className="max-h-full w-auto object-contain"
                                        src={product.image[0]}
                                        alt={product.name}
                                    />
                                </button>

                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                                {product.category}
                                            </p>
                                            <h2 className="mt-2 text-xl font-semibold text-[#1b2a21]">
                                                {product.name}
                                            </h2>
                                            <p className="mt-2 text-sm leading-6 text-gray-600">
                                                {Array.isArray(product.description)
                                                    ? product.description[0]
                                                    : product.description}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() =>
                                                updateCartItem(product._id, 0)
                                            }
                                            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-red-500"
                                        >
                                            <img
                                                src={assets.remove_icon}
                                                alt="remove"
                                                className="h-4 w-4"
                                            />
                                            Remove
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="inline-flex items-center rounded-full border border-[#d7ccb4] bg-[#fbf8f1] p-1">
                                                <button
                                                    onClick={() =>
                                                        updateCartItem(
                                                            product._id,
                                                            product.quantity - 1
                                                        )
                                                    }
                                                    className="h-9 w-9 rounded-full text-lg text-[#1f3a2f] transition hover:bg-white"
                                                >
                                                    -
                                                </button>
                                                <span className="min-w-10 text-center text-sm font-semibold text-[#1b2a21]">
                                                    {product.quantity}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        updateCartItem(
                                                            product._id,
                                                            product.quantity + 1
                                                        )
                                                    }
                                                    className="h-9 w-9 rounded-full text-lg text-[#1f3a2f] transition hover:bg-white"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <div className="text-sm text-gray-500">
                                                <p>
                                                    Unit price: {currency}
                                                    {product.offerPrice}
                                                </p>
                                                <p>
                                                    Available:{" "}
                                                    {getAvailableStock(
                                                        product._id
                                                    )}
                                                </p>
                                                <p className="line-through">
                                                    MRP: {currency}
                                                    {product.price}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-left sm:text-right">
                                            <p className="text-sm text-gray-500">
                                                Item subtotal
                                            </p>
                                            <p className="mt-1 text-2xl font-semibold text-[#1f3a2f]">
                                                {currency}
                                                {Number(
                                                    (
                                                        product.offerPrice *
                                                        product.quantity
                                                    ).toFixed(2)
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            navigate("/products");
                            scrollTo(0, 0);
                        }}
                        className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary transition hover:gap-3"
                    >
                        <img
                            className="rotate-180"
                            src={assets.arrow_right_icon_colored}
                            alt="back"
                        />
                        Continue shopping
                    </button>
                </section>

                <aside className="space-y-5">
                    <section className="rounded-[30px] border border-[#e6decb] bg-[linear-gradient(135deg,#faf7f1_0%,#f4efe3_55%,#eef4ef_100%)] p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)] sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                                    Order summary
                                </p>
                                <h2 className="mt-3 text-2xl font-semibold text-[#1b2a21]">
                                    {getCartCount()} items in your basket
                                </h2>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3 rounded-[24px] bg-white/80 p-4">
                            <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>Subtotal</span>
                                <span>
                                    {currency}
                                    {subtotal}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>Shipping</span>
                                <span className="font-medium text-green-600">
                                    Free
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>Tax (2%)</span>
                                <span>
                                    {currency}
                                    {tax}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>Coupon savings</span>
                                <span className="font-medium text-green-600">
                                    -{currency}
                                    {couponState.discountAmount}
                                </span>
                            </div>
                            <div className="border-t border-[#e9dfca] pt-3">
                                <div className="flex items-center justify-between text-lg font-semibold text-[#1b2a21]">
                                    <span>Total</span>
                                    <span>
                                        {currency}
                                        {totalAmount}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                            <div className="rounded-2xl bg-white/70 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                    Delivery
                                </p>
                                <p className="mt-2 text-sm font-medium text-[#1b2a21]">
                                    Express slots available
                                </p>
                            </div>
                            <div className="rounded-2xl bg-white/70 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                    Savings
                                </p>
                                <p className="mt-2 text-sm font-medium text-[#1b2a21]">
                                    Better weekly basket pricing
                                </p>
                            </div>
                            <div className="rounded-2xl bg-white/70 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                    Support
                                </p>
                                <p className="mt-2 text-sm font-medium text-[#1b2a21]">
                                    Track orders from your account
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-[30px] border border-[#e6decb] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                            Coupons
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-[#1b2a21]">
                            Apply a savings code
                        </h2>

                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                            <input
                                type="text"
                                placeholder="Enter coupon code"
                                value={couponInput}
                                onChange={(event) =>
                                    setCouponInput(event.target.value.toUpperCase())
                                }
                                className="w-full rounded-full border border-[#d7ccb4] bg-[#fbf8f1] px-4 py-3 text-sm uppercase text-[#1b2a21] outline-none transition focus:border-[#1f3a2f]"
                            />
                            <button
                                onClick={() => applyCoupon(couponInput)}
                                className="rounded-full bg-[#1f3a2f] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#183025]"
                            >
                                Apply
                            </button>
                        </div>

                        {appliedCoupon && couponState.isValid ? (
                            <div className="mt-4 rounded-[24px] bg-[#eef4ef] p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="font-semibold text-[#1b2a21]">
                                            {appliedCoupon.code} applied
                                        </p>
                                        <p className="mt-2 text-sm leading-6 text-gray-600">
                                            {appliedCoupon.description}
                                        </p>
                                    </div>
                                    <button
                                        onClick={removeCoupon}
                                        className="text-sm font-medium text-[#1f3a2f] underline"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ) : appliedCouponCode && couponState.message ? (
                            <div className="mt-4 rounded-[24px] bg-[#fff4df] p-4 text-sm text-[#8b5a14]">
                                {couponState.message}
                            </div>
                        ) : null}

                        {availableCoupons.length > 0 && (
                            <div className="mt-5 space-y-3">
                                {availableCoupons.map((coupon) => (
                                    <button
                                        key={coupon.code}
                                        onClick={() => applyCoupon(coupon.code)}
                                        className="w-full rounded-[24px] border border-[#e6decb] bg-[#fbf8f1] p-4 text-left transition hover:border-[#c8bca1]"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="font-semibold text-[#1b2a21]">
                                                    {coupon.code}
                                                </p>
                                                <p className="mt-2 text-sm leading-6 text-gray-600">
                                                    {coupon.description}
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#1f3a2f]">
                                                Min {currency}
                                                {coupon.minOrder}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="rounded-[30px] border border-[#e6decb] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                                    Delivery address
                                </p>
                                <h2 className="mt-2 text-xl font-semibold text-[#1b2a21]">
                                    Choose where we should deliver
                                </h2>
                            </div>
                            <button
                                onClick={() => navigate("/add-address")}
                                className="rounded-full border border-[#d7ccb4] px-4 py-2 text-sm font-medium text-[#1f3a2f] transition hover:bg-[#f4efe3]"
                            >
                                Add address
                            </button>
                        </div>

                        {!user ? (
                            <div className="mt-5 rounded-[24px] bg-[#fbf8f1] p-5 text-center">
                                <p className="text-sm leading-6 text-gray-600">
                                    Login to choose a delivery address and continue
                                    to checkout.
                                </p>
                            </div>
                        ) : isAddressLoading ? (
                            <p className="mt-5 text-sm text-gray-500">
                                Loading saved addresses...
                            </p>
                        ) : addresses.length === 0 ? (
                            <div className="mt-5 rounded-[24px] border border-dashed border-[#d7ccb4] bg-[#fbf8f1] p-5 text-center">
                                <p className="text-sm leading-6 text-gray-600">
                                    You have not added any address yet.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-5 space-y-3">
                                {addresses.map((address) => {
                                    const isSelected =
                                        selectedAddress?._id === address._id;

                                    return (
                                        <button
                                            key={address._id}
                                            onClick={() => setSelectedAddress(address)}
                                            className={`w-full rounded-[24px] border p-4 text-left transition ${
                                                isSelected
                                                    ? "border-[#1f3a2f] bg-[#eef4ef]"
                                                    : "border-[#e6decb] bg-[#fbf8f1] hover:border-[#c8bca1]"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="font-semibold text-[#1b2a21]">
                                                        {address.firstName}{" "}
                                                        {address.lastName}
                                                    </p>
                                                    <p className="mt-2 text-sm leading-6 text-gray-600">
                                                        {address.street},{" "}
                                                        {address.city},{" "}
                                                        {address.state},{" "}
                                                        {address.country} -{" "}
                                                        {address.zipcode}
                                                    </p>
                                                    <p className="mt-2 text-sm text-gray-500">
                                                        {address.phone} |{" "}
                                                        {address.email}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`mt-1 h-5 w-5 rounded-full border ${
                                                        isSelected
                                                            ? "border-[#1f3a2f] bg-[#1f3a2f]"
                                                            : "border-[#c8bca1]"
                                                    }`}
                                                />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section className="rounded-[30px] border border-[#e6decb] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                            Payment
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-[#1b2a21]">
                            Select your payment method
                        </h2>

                        <div className="mt-5 space-y-3">
                            {paymentMethods.map((method) => (
                                <button
                                    key={method.value}
                                    onClick={() => setPaymentOption(method.value)}
                                    className={`w-full rounded-[24px] border p-4 text-left transition ${
                                        paymentOption === method.value
                                            ? "border-[#1f3a2f] bg-[#eef4ef]"
                                            : "border-[#e6decb] bg-[#fbf8f1] hover:border-[#c8bca1]"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="font-semibold text-[#1b2a21]">
                                                {method.title}
                                            </p>
                                            <p className="mt-2 text-sm leading-6 text-gray-600">
                                                {method.text}
                                            </p>
                                        </div>
                                        <span
                                            className={`mt-1 h-5 w-5 rounded-full border ${
                                                paymentOption === method.value
                                                    ? "border-[#1f3a2f] bg-[#1f3a2f]"
                                                    : "border-[#c8bca1]"
                                            }`}
                                        />
                                    </div>
                                </button>
                            ))}
                        </div>

                        {user ? (
                            <button
                                onClick={placeOrder}
                                disabled={loading || !selectedAddress}
                                className={`mt-6 w-full rounded-full px-6 py-3 text-sm font-medium text-white transition ${
                                    loading || !selectedAddress
                                        ? "cursor-not-allowed bg-[#8ca397]"
                                        : "bg-[#1f3a2f] hover:bg-[#183025]"
                                }`}
                            >
                                {loading
                                    ? "Processing order..."
                                    : paymentOption === "COD"
                                    ? "Place order"
                                    : "Continue to payment"}
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate("/")}
                                className="mt-6 w-full rounded-full bg-[#1f3a2f] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#183025]"
                            >
                                Login to continue
                            </button>
                        )}
                    </section>
                </aside>
            </div>
        </div>
    );
};

export default Cart;
