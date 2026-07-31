import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { assets } from "../assets/assets";
import ProductCard from "../components/ProductCard";
import Loader from "../components/Loader";
import { useAppContext } from "../context/AppContext";

const featureCards = [
    {
        icon: assets.delivery_truck_icon,
        title: "Fast delivery",
        text: "Same-day slots and express delivery for everyday essentials.",
    },
    {
        icon: assets.leaf_icon,
        title: "Fresh quality",
        text: "Produce and staples selected for better shelf life and taste.",
    },
    {
        icon: assets.coin_icon,
        title: "Value pricing",
        text: "Clear savings on weekly baskets, pantry items, and dairy.",
    },
];

const ProductDetails = () => {
    const {
        addToCart,
        cartItems,
        currency,
        getAvailableStock,
        isProductsLoading,
        navigate,
        products,
        removeFromCart,
        updateCartItem,
    } = useAppContext();
    const { id } = useParams();
    const [activeImage, setActiveImage] = useState(0);

    const product = useMemo(
        () => products.find((item) => item._id === id),
        [id, products]
    );

    const productImages = product?.image?.length ? product.image : [];

    useEffect(() => {
        setActiveImage(0);
    }, [id]);

    const relatedProducts = useMemo(() => {
        if (!product) return [];

        return products
            .filter(
                (item) =>
                    item.category === product.category &&
                    item._id !== product._id &&
                    item.inStock
            )
            .slice(0, 4);
    }, [product, products]);

    const savings = useMemo(() => {
        if (!product || !product.price) return 0;
        return Math.max(0, product.price - product.offerPrice);
    }, [product]);

    const discount = useMemo(() => {
        if (!product || !product.price) return 0;
        return Math.max(
            0,
            Math.round(((product.price - product.offerPrice) / product.price) * 100)
        );
    }, [product]);

    const cartQuantity = product ? cartItems[product._id] || 0 : 0;
    const availableStock = product ? getAvailableStock(product._id) : 0;
    const isOutOfStock = availableStock <= 0;

    if (isProductsLoading) {
        return <Loader />;
    }

    if (!product) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    Product unavailable
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-[#1b2a21]">
                    We could not find this item.
                </h1>
                <p className="mt-3 max-w-md text-base leading-7 text-gray-600">
                    It may have been removed or the link is no longer valid.
                </p>
                <button
                    onClick={() => navigate("/products")}
                    className="mt-6 rounded-full bg-[#1f3a2f] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#183025]"
                >
                    Browse all products
                </button>
            </div>
        );
    }

    return (
        <div className="mt-12 pb-10">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <Link to="/" className="transition hover:text-primary">
                    Home
                </Link>
                <span>/</span>
                <Link to="/products" className="transition hover:text-primary">
                    Products
                </Link>
                <span>/</span>
                <Link
                    to={`/products/${product.category.toLowerCase()}`}
                    className="transition hover:text-primary"
                >
                    {product.category}
                </Link>
                <span>/</span>
                <span className="font-medium text-[#1b2a21]">{product.name}</span>
            </div>

            <section className="mt-6 overflow-hidden rounded-[34px] border border-[#e6decb] bg-[linear-gradient(135deg,#faf7f1_0%,#f4efe3_52%,#edf3e8_100%)] p-5 shadow-[0_20px_45px_rgba(15,23,42,0.05)] sm:p-6 lg:p-8">
                <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
                    <div className="grid gap-4 lg:grid-cols-[96px_minmax(0,1fr)]">
                        <div className="order-2 flex gap-3 overflow-x-auto pb-1 lg:order-1 lg:flex-col lg:overflow-visible">
                            {productImages.map((image, index) => (
                                <button
                                    key={`${product._id}-${index}`}
                                    onClick={() => setActiveImage(index)}
                                    className={`flex h-20 min-w-20 items-center justify-center overflow-hidden rounded-2xl border bg-white p-2 transition ${
                                        activeImage === index
                                            ? "border-[#1f3a2f] shadow-[0_8px_20px_rgba(31,58,47,0.12)]"
                                            : "border-[#e6decb] hover:border-[#c7bda4]"
                                    }`}
                                >
                                    <img
                                        src={image}
                                        alt={`${product.name} preview ${index + 1}`}
                                        className="max-h-full w-auto object-contain"
                                    />
                                </button>
                            ))}
                        </div>

                        <div className="order-1 overflow-hidden rounded-[30px] border border-white/70 bg-white/80 shadow-[0_20px_36px_rgba(148,163,184,0.12)] lg:order-2">
                            <div className="flex min-h-[320px] items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_45%),linear-gradient(180deg,#f9f4e8_0%,#eef3eb_100%)] p-6 sm:min-h-[420px] sm:p-10">
                                <img
                                    src={productImages[activeImage]}
                                    alt={product.name}
                                    className="max-h-[280px] w-auto object-contain sm:max-h-[360px]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="max-w-2xl">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="rounded-full bg-[#1f3a2f] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                                {product.category}
                            </span>
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                                    !isOutOfStock
                                        ? "bg-[#dff3e5] text-[#1f7a42]"
                                        : "bg-[#fde7e7] text-[#b24040]"
                                }`}
                            >
                                {!isOutOfStock
                                    ? `${availableStock} in stock`
                                    : "Out of stock"}
                            </span>
                            {discount > 0 && (
                                <span className="rounded-full bg-[#fff2d7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#9a6412]">
                                    Save {discount}%
                                </span>
                            )}
                        </div>

                        <h1 className="mt-4 text-3xl font-semibold leading-tight text-[#1b2a21] sm:text-4xl lg:text-5xl">
                            {product.name}
                        </h1>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1">
                                {Array(5)
                                    .fill("")
                                    .map((_, index) => (
                                        <img
                                            key={index}
                                            src={
                                                index < 4
                                                    ? assets.star_icon
                                                    : assets.star_dull_icon
                                            }
                                            alt="rating"
                                            className="w-4"
                                        />
                                    ))}
                            </div>
                            <span className="text-sm font-medium text-[#1b2a21]">
                                4.8 rating
                            </span>
                            <span className="text-sm text-gray-500">
                                Trusted for repeat weekly orders
                            </span>
                        </div>

                        <div className="mt-6 rounded-[28px] bg-white/85 p-5 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
                            <div className="flex flex-wrap items-end gap-3">
                                <p className="text-4xl font-semibold text-[#1f3a2f]">
                                    {currency}
                                    {product.offerPrice}
                                </p>
                                <p className="pb-1 text-lg text-gray-400 line-through">
                                    {currency}
                                    {product.price}
                                </p>
                            </div>
                            <p className="mt-2 text-sm text-gray-600">
                                You save {currency}
                                {savings.toFixed(2)} on this item. Inclusive of all
                                taxes.
                            </p>

                            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl bg-[#f7f3e8] px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                        Delivery
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-[#1b2a21]">
                                        In as fast as 30 mins
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-[#eef4ef] px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                        Quality
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-[#1b2a21]">
                                        Freshly packed for dispatch
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-[#fff7e5] px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                        Inventory
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-[#1b2a21]">
                                        {isOutOfStock
                                            ? "Currently unavailable"
                                            : `${availableStock} ready to ship`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 rounded-[28px] border border-[#e6decb] bg-white/70 p-5">
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                                About this product
                            </p>
                            <ul className="mt-4 space-y-3 text-sm leading-7 text-gray-600 sm:text-base">
                                {product.description.map((item, index) => (
                                    <li key={index} className="flex gap-3">
                                        <span className="mt-2 h-2 w-2 rounded-full bg-[#1f3a2f]" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-6 flex flex-col gap-4 rounded-[28px] border border-[#e6decb] bg-[#fbf8f1] p-5 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                                    Quantity
                                </p>
                                <div className="mt-3 inline-flex items-center rounded-full border border-[#d7ccb4] bg-white p-1">
                                    <button
                                        onClick={() => removeFromCart(product._id)}
                                        disabled={!cartQuantity}
                                        className="h-10 w-10 rounded-full text-lg text-[#1f3a2f] transition hover:bg-[#eef4ef] disabled:cursor-not-allowed disabled:text-gray-300"
                                    >
                                        -
                                    </button>
                                    <span className="min-w-12 text-center text-base font-semibold text-[#1b2a21]">
                                        {cartQuantity || 1}
                                    </span>
                                    <button
                                        onClick={() =>
                                            cartQuantity
                                                ? updateCartItem(
                                                      product._id,
                                                      cartQuantity + 1
                                                    )
                                                : addToCart(product._id)
                                        }
                                        disabled={isOutOfStock}
                                        className="h-10 w-10 rounded-full text-lg text-[#1f3a2f] transition hover:bg-[#eef4ef]"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                                <button
                                    onClick={() => addToCart(product._id)}
                                    disabled={isOutOfStock}
                                    className={`rounded-full border px-6 py-3 text-sm font-medium transition ${
                                        isOutOfStock
                                            ? "cursor-not-allowed border-[#d7ccb4] bg-[#f5f1e7] text-gray-400"
                                            : "border-[#d7ccb4] bg-white text-[#1f3a2f] hover:bg-[#f4efe3]"
                                    }`}
                                >
                                    {isOutOfStock ? "Out of stock" : "Add to cart"}
                                </button>
                                <button
                                    onClick={() => {
                                        if (!cartQuantity) {
                                            addToCart(product._id);
                                        }
                                        navigate("/cart");
                                    }}
                                    disabled={isOutOfStock}
                                    className={`rounded-full px-6 py-3 text-sm font-medium text-white transition ${
                                        isOutOfStock
                                            ? "cursor-not-allowed bg-[#8ca397]"
                                            : "bg-[#1f3a2f] hover:bg-[#183025]"
                                    }`}
                                >
                                    Buy now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-10 grid gap-4 md:grid-cols-3">
                {featureCards.map((card) => (
                    <article
                        key={card.title}
                        className="rounded-[28px] border border-[#e6decb] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4ef]">
                            <img src={card.icon} alt={card.title} className="w-6" />
                        </div>
                        <h2 className="mt-4 text-lg font-semibold text-[#1b2a21]">
                            {card.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-gray-600">
                            {card.text}
                        </p>
                    </article>
                ))}
            </section>

            <section className="mt-16">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                            More to explore
                        </p>
                        <h2 className="mt-3 text-3xl font-semibold text-[#1b2a21]">
                            Similar picks from {product.category.toLowerCase()}
                        </h2>
                        <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
                            Keep building your basket with products that pair well
                            with this item and fit the same weekly shopping run.
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            navigate("/products");
                            scrollTo(0, 0);
                        }}
                        className="inline-flex items-center justify-center rounded-full border border-[#d7ccb4] px-6 py-3 text-sm font-medium text-[#1f3a2f] transition hover:bg-[#f4efe3]"
                    >
                        View full collection
                    </button>
                </div>

                {relatedProducts.length > 0 ? (
                    <div className="mt-8 grid justify-items-center gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {relatedProducts.map((item) => (
                            <ProductCard key={item._id} product={item} />
                        ))}
                    </div>
                ) : (
                    <div className="mt-8 rounded-[28px] border border-dashed border-[#d7ccb4] bg-[#fbf8f1] px-6 py-10 text-center text-gray-600">
                        More products from this category will appear here as your
                        catalog grows.
                    </div>
                )}
            </section>
        </div>
    );
};

export default ProductDetails;
