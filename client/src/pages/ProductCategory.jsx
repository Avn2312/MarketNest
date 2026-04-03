import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { categories } from "../assets/assets";
import ProductFiltersPanel from "../components/ProductFiltersPanel";
import ProductCard from "../components/ProductCard";
import { useAppContext } from "../context/AppContext";
import { filterAndSortProducts } from "../utils/productFilters";

const ProductCategory = () => {
    const { category } = useParams();
    const { currency, products } = useAppContext();
    const [query, setQuery] = useState("");
    const [filters, setFilters] = useState({
        category: "All",
        minPrice: "",
        maxPrice: "",
        inStockOnly: false,
        discountOnly: false,
        sortBy: "featured",
    });

    const searchCategory = categories.find(
        (item) => item.path.toLowerCase() === category
    );

    const categoryProducts = useMemo(
        () =>
            products.filter(
                (product) => product.category.toLowerCase() === category
            ),
        [category, products]
    );

    const filteredProducts = useMemo(
        () =>
            filterAndSortProducts(categoryProducts, {
                ...filters,
                query,
            }),
        [categoryProducts, filters, query]
    );

    return (
        <div className="mt-16 pb-12">
            <div className="grid gap-8 xl:grid-cols-[300px_minmax(0,1fr)]">
                <ProductFiltersPanel
                    categories={[searchCategory?.path || "All"]}
                    filters={filters}
                    setFilters={setFilters}
                    currency={currency}
                    resultCount={filteredProducts.length}
                    title="Fine-tune this category"
                />

                <section>
                    {searchCategory && (
                        <div className="max-w-3xl">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                                Category spotlight
                            </p>
                            <h1 className="mt-3 text-3xl font-semibold text-[#1b2a21] md:text-4xl">
                                {searchCategory.text}
                            </h1>
                            <p className="mt-3 text-base leading-7 text-gray-600">
                                Explore this category with search, price filters,
                                stock toggles, and sort controls built into the
                                browsing flow.
                            </p>
                        </div>
                    )}

                    <div className="mt-6 rounded-[28px] border border-[#e6decb] bg-white p-4">
                        <input
                            onChange={(event) => setQuery(event.target.value)}
                            value={query}
                            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                            type="text"
                            placeholder={`Search inside ${searchCategory?.text || "this category"}`}
                        />
                    </div>

                    {filteredProducts.length > 0 ? (
                        <div className="mt-8">
                            <div className="mb-4 flex flex-wrap gap-2 text-sm text-gray-500">
                                <span>{filteredProducts.length} products found</span>
                                {filters.inStockOnly && <span>In stock only</span>}
                                {filters.discountOnly && <span>Discounted only</span>}
                            </div>

                            <div className="grid justify-items-center gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {filteredProducts.map((product) => (
                                    <ProductCard key={product._id} product={product} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-8 rounded-[28px] border border-dashed border-[#d7ccb4] bg-[#fbf8f1] px-6 py-12 text-center">
                            <p className="text-lg font-medium text-[#1b2a21]">
                                No products found in this view.
                            </p>
                            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
                                Try a different search term, widen the price range,
                                or disable one of the active filters.
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default ProductCategory;
