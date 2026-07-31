import React, { useMemo, useState } from "react";
import ProductFiltersPanel from "../components/ProductFiltersPanel";
import ProductCard from "../components/ProductCard";
import Loader from "../components/Loader";
import { useAppContext } from "../context/AppContext";
import { filterAndSortProducts } from "../utils/productFilters";

const AllProducts = () => {
    const { currency, isProductsLoading, products, searchQuery, setSearchQuery } =
        useAppContext();
    const [filters, setFilters] = useState({
        category: "All",
        minPrice: "",
        maxPrice: "",
        inStockOnly: false,
        discountOnly: false,
        sortBy: "featured",
    });

    const availableCategories = useMemo(
        () => [...new Set(products.map((product) => product.category))],
        [products]
    );

    const filteredProducts = useMemo(
        () =>
            filterAndSortProducts(products, {
                ...filters,
                query: searchQuery,
            }),
        [filters, products, searchQuery]
    );

    return (
        <div className="mt-16 pb-12">
            <div className="grid gap-8 xl:grid-cols-[300px_minmax(0,1fr)]">
                <ProductFiltersPanel
                    categories={availableCategories}
                    filters={filters}
                    setFilters={setFilters}
                    currency={currency}
                    resultCount={filteredProducts.length}
                    title="Find exactly what fits your basket"
                />

                <section>
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                            Full collection
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold text-[#1b2a21] md:text-4xl">
                            Shop every product in one place.
                        </h1>
                        <p className="mt-3 text-base leading-7 text-gray-600">
                            Search across names, categories, and product details,
                            then narrow results by stock, discount, price, and
                            savings.
                        </p>
                    </div>

                    <div className="mt-6 rounded-[28px] border border-[#e6decb] bg-white p-4">
                        <input
                            onChange={(event) => setSearchQuery(event.target.value)}
                            value={searchQuery}
                            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                            type="text"
                            placeholder="Search by product name, category, or description"
                        />
                    </div>

                    <div className="mt-6">
                        {isProductsLoading ? (
                            <Loader />
                        ) : filteredProducts.length === 0 ? (
                            <div className="rounded-[28px] border border-dashed border-[#d7ccb4] bg-[#fbf8f1] px-6 py-12 text-center">
                                <p className="text-lg font-medium text-[#1b2a21]">
                                    No products match these filters.
                                </p>
                                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
                                    Try clearing a price range, disabling one of the
                                    toggles, or searching with fewer words.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4 flex flex-wrap gap-2 text-sm text-gray-500">
                                    <span>{filteredProducts.length} products found</span>
                                    {filters.category !== "All" && (
                                        <span>Category: {filters.category}</span>
                                    )}
                                    {filters.inStockOnly && <span>In stock only</span>}
                                    {filters.discountOnly && <span>Discounted only</span>}
                                </div>

                                <div className="grid justify-items-center gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {filteredProducts.map((product) => (
                                        <ProductCard key={product._id} product={product} />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AllProducts;
