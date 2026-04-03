export const getProductDiscount = (product) => {
    if (!product?.price) return 0;

    return Math.max(
        0,
        Math.round(((product.price - product.offerPrice) / product.price) * 100)
    );
};

export const matchesProductQuery = (product, query) => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return true;

    const description = Array.isArray(product.description)
        ? product.description.join(" ").toLowerCase()
        : String(product.description || "").toLowerCase();

    return [product.name, product.category, description].some((value) =>
        String(value).toLowerCase().includes(normalizedQuery)
    );
};

export const filterAndSortProducts = (products, filters) => {
    const {
        query = "",
        category = "All",
        minPrice = "",
        maxPrice = "",
        inStockOnly = false,
        discountOnly = false,
        sortBy = "featured",
    } = filters;

    const min = minPrice === "" ? 0 : Number(minPrice);
    const max = maxPrice === "" ? Number.POSITIVE_INFINITY : Number(maxPrice);

    const filtered = products.filter((product) => {
        const matchesQuery = matchesProductQuery(product, query);
        const matchesCategory =
            category === "All" || product.category === category;
        const matchesPrice =
            product.offerPrice >= min && product.offerPrice <= max;
        const matchesStock = !inStockOnly || product.inStock;
        const matchesDiscount = !discountOnly || getProductDiscount(product) > 0;

        return (
            matchesQuery &&
            matchesCategory &&
            matchesPrice &&
            matchesStock &&
            matchesDiscount
        );
    });

    const sorted = [...filtered];

    switch (sortBy) {
        case "price-low":
            sorted.sort((a, b) => a.offerPrice - b.offerPrice);
            break;
        case "price-high":
            sorted.sort((a, b) => b.offerPrice - a.offerPrice);
            break;
        case "newest":
            sorted.sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );
            break;
        case "best-savings":
            sorted.sort(
                (a, b) => getProductDiscount(b) - getProductDiscount(a)
            );
            break;
        default:
            sorted.sort((a, b) => Number(b.inStock) - Number(a.inStock));
            break;
    }

    return sorted;
};
