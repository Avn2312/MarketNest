import React from "react";

const ProductFiltersPanel = ({
    categories,
    filters,
    setFilters,
    currency,
    resultCount,
    title = "Refine your search",
}) => {
    return (
        <aside className="rounded-[28px] border border-[#e6decb] bg-[#fcfbf7] p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                        Filters
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-[#1b2a21]">
                        {title}
                    </h2>
                </div>
                <button
                    onClick={() =>
                        setFilters((previous) => ({
                            ...previous,
                            category: "All",
                            minPrice: "",
                            maxPrice: "",
                            inStockOnly: false,
                            discountOnly: false,
                            sortBy: "featured",
                        }))
                    }
                    className="text-sm text-gray-500"
                >
                    Reset
                </button>
            </div>

            <p className="mt-4 text-sm text-gray-500">{resultCount} result(s)</p>

            <div className="mt-5 space-y-5">
                <div>
                    <p className="text-sm font-medium text-[#1b2a21]">Category</p>
                    <select
                        value={filters.category}
                        onChange={(event) =>
                            setFilters((previous) => ({
                                ...previous,
                                category: event.target.value,
                            }))
                        }
                        className="mt-2 w-full rounded-2xl border border-[#ddd5c1] bg-white px-4 py-3 text-sm outline-none"
                    >
                        <option value="All">All categories</option>
                        {categories.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <p className="text-sm font-medium text-[#1b2a21]">Price range</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        <input
                            type="number"
                            value={filters.minPrice}
                            onChange={(event) =>
                                setFilters((previous) => ({
                                    ...previous,
                                    minPrice: event.target.value,
                                }))
                            }
                            placeholder={`${currency} Min`}
                            className="rounded-2xl border border-[#ddd5c1] bg-white px-4 py-3 text-sm outline-none"
                        />
                        <input
                            type="number"
                            value={filters.maxPrice}
                            onChange={(event) =>
                                setFilters((previous) => ({
                                    ...previous,
                                    maxPrice: event.target.value,
                                }))
                            }
                            placeholder={`${currency} Max`}
                            className="rounded-2xl border border-[#ddd5c1] bg-white px-4 py-3 text-sm outline-none"
                        />
                    </div>
                </div>

                <div>
                    <p className="text-sm font-medium text-[#1b2a21]">Sort by</p>
                    <select
                        value={filters.sortBy}
                        onChange={(event) =>
                            setFilters((previous) => ({
                                ...previous,
                                sortBy: event.target.value,
                            }))
                        }
                        className="mt-2 w-full rounded-2xl border border-[#ddd5c1] bg-white px-4 py-3 text-sm outline-none"
                    >
                        <option value="featured">Featured</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="newest">Newest</option>
                        <option value="best-savings">Best savings</option>
                    </select>
                </div>

                <div className="space-y-3">
                    <label className="flex items-center gap-3 text-sm text-[#1b2a21]">
                        <input
                            type="checkbox"
                            checked={filters.inStockOnly}
                            onChange={(event) =>
                                setFilters((previous) => ({
                                    ...previous,
                                    inStockOnly: event.target.checked,
                                }))
                            }
                        />
                        <span>Only show in-stock items</span>
                    </label>
                    <label className="flex items-center gap-3 text-sm text-[#1b2a21]">
                        <input
                            type="checkbox"
                            checked={filters.discountOnly}
                            onChange={(event) =>
                                setFilters((previous) => ({
                                    ...previous,
                                    discountOnly: event.target.checked,
                                }))
                            }
                        />
                        <span>Only show discounted items</span>
                    </label>
                </div>
            </div>
        </aside>
    );
};

export default ProductFiltersPanel;
