import React from "react";
import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import Loader from "./Loader";
import { useAppContext } from "../context/AppContext";

const BestSeller = () => {
    const { products, isProductsLoading } = useAppContext();

    const bestSellers = products.filter((product) => product.inStock).slice(0, 6);

    return (
        <section className="rounded-[36px] bg-[#f7f3e8] px-5 py-8 sm:px-8 md:px-10 lg:px-14 lg:py-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="max-w-xl">
                    <span className="inline-flex rounded-full border border-[#d8cfba] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#1f3a2f]">
                        Customer favorites
                    </span>
                    <h2 className="mt-4 text-3xl font-semibold text-[#1b2a21] md:text-4xl">
                        Best sellers picked from the week&apos;s most-loved essentials.
                    </h2>
                    <p className="mt-3 text-base leading-7 text-gray-600">
                        Browse the products customers reorder most, from fresh
                        produce to pantry staples and quick-delivery basics.
                    </p>
                </div>

                <Link
                    to="/products"
                    className="inline-flex items-center justify-center rounded-full border border-[#cfc4a8] px-6 py-3 text-sm font-medium text-[#2d3d34] transition hover:bg-white"
                >
                    View all products
                </Link>
            </div>

            {isProductsLoading ? (
                <Loader />
            ) : bestSellers.length > 0 ? (
                <div className="mt-8 grid justify-items-center gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {bestSellers.map((product) => (
                        <ProductCard key={product._id} product={product} />
                    ))}
                </div>
            ) : (
                <p className="mt-6 text-gray-500">No best sellers available.</p>
            )}
        </section>
    );
};

export default BestSeller;
