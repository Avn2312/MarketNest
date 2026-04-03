import React from "react";
import { assets } from "../assets/assets";
import { useAppContext } from "../context/AppContext";

const ProductCard = ({ product }) => {
    const {
        currency,
        addToCart,
        removeFromCart,
        cartItems,
        getAvailableStock,
        navigate,
    } =
        useAppContext();

    if (!product) return null;

    const discount = Math.max(
        0,
        Math.round(((product.price - product.offerPrice) / product.price) * 100)
    );
    const availableStock = getAvailableStock(product._id);
    const isOutOfStock = availableStock <= 0;

    return (
        <article
            onClick={() => {
                navigate(
                    `/products/${product.category.toLowerCase()}/${product._id}`
                );
                scrollTo(0, 0);
            }}
            className="group w-full max-w-[290px] overflow-hidden rounded-[24px] border border-[#e8e1cf] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)]"
        >
            <div className="relative cursor-pointer overflow-hidden bg-[#f7f3e8]">
                <div className="absolute left-4 top-4 z-10 rounded-full bg-[#1f3a2f] px-3 py-1 text-xs font-semibold text-white">
                    {discount}% off
                </div>
                <div className="absolute right-4 top-4 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-600">
                    {isOutOfStock ? "Out of stock" : `${availableStock} left`}
                </div>
                <div className="flex aspect-[4/3] items-center justify-center p-4">
                    <img
                        className="max-h-full w-auto max-w-full object-contain transition duration-300 group-hover:scale-105"
                        src={product.image[0]}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                    />
                </div>
            </div>

            <div className="p-4">
                <div className="flex items-center gap-1">
                    {Array(5)
                        .fill("")
                        .map((_, i) => (
                            <img
                                key={i}
                                className="w-3.5"
                                src={i < 4 ? assets.star_icon : assets.star_dull_icon}
                                alt="star"
                                loading="lazy"
                                decoding="async"
                            />
                        ))}
                    <span className="ml-1 text-sm text-gray-500">(4.0)</span>
                </div>

                <h3 className="mt-2.5 line-clamp-1 text-base font-semibold text-[#1b2a21]">
                    {product.name}
                </h3>
                <p className="mt-1.5 line-clamp-2 min-h-10 text-xs leading-5 text-gray-500">
                    {Array.isArray(product.description)
                        ? product.description.join(" ")
                        : product.description}
                </p>

                <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                        <p className="text-xl font-semibold text-[#1f3a2f]">
                            {currency}
                            {product.offerPrice}
                        </p>
                        <p className="text-xs text-gray-400 line-through">
                            {currency}
                            {product.price}
                        </p>
                    </div>

                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                    >
                        {!cartItems[product._id] ? (
                            <button
                                disabled={isOutOfStock}
                                className={`flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-white transition ${
                                    isOutOfStock
                                        ? "cursor-not-allowed bg-[#90a49a]"
                                        : "bg-[#1f3a2f] hover:bg-[#183025]"
                                }`}
                                onClick={() => addToCart(product._id)}
                            >
                                <img
                                    src={assets.cart_icon}
                                    alt="cart_icon"
                                    className="brightness-0 invert"
                                    loading="lazy"
                                    decoding="async"
                                />
                                {isOutOfStock ? "Sold out" : "Add"}
                            </button>
                        ) : (
                            <div className="flex h-10 items-center justify-center gap-2 rounded-full bg-[#eef4ef] px-2.5 text-[#1f3a2f]">
                                <button
                                    onClick={() => removeFromCart(product._id)}
                                    className="cursor-pointer px-2 text-base"
                                >
                                    -
                                </button>
                                <span className="min-w-5 text-center text-sm font-medium">
                                    {cartItems[product._id]}
                                </span>
                                <button
                                    onClick={() => addToCart(product._id)}
                                    className="cursor-pointer px-2 text-base"
                                >
                                    +
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
};

export default ProductCard;
