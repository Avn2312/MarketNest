import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { categories } from "../../assets/assets";
import { useAppContext } from "../../context/AppContext";
import {
    ERROR_MESSAGES,
    getApiErrorMessage,
} from "../../utils/errorMessages";

const emptyEditState = {
    _id: "",
    name: "",
    description: "",
    category: "",
    price: "",
    offerPrice: "",
    stockQuantity: "",
};

const renderSellerModal = (children) => {
    if (typeof document === "undefined") {
        return null;
    }

    return createPortal(children, document.body);
};

const ProductList = () => {
    const { axios, currency, fetchProducts, isProductsLoading, products } =
        useAppContext();

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [pendingStock, setPendingStock] = useState({});
    const [isSavingStock, setIsSavingStock] = useState({});
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkStock, setBulkStock] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [editForm, setEditForm] = useState(emptyEditState);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const normalizedProducts = useMemo(
        () =>
            products.map((product) => ({
                ...product,
                stockQuantity:
                    typeof product.stockQuantity === "number"
                        ? product.stockQuantity
                        : product.inStock
                        ? 24
                        : 0,
            })),
        [products]
    );

    const analytics = useMemo(() => {
        const totalProducts = normalizedProducts.length;
        const outOfStock = normalizedProducts.filter(
            (product) => product.stockQuantity === 0
        ).length;
        const lowStock = normalizedProducts.filter(
            (product) => product.stockQuantity > 0 && product.stockQuantity <= 5
        ).length;
        const inventoryValue = normalizedProducts.reduce(
            (total, product) => total + product.offerPrice * product.stockQuantity,
            0
        );

        return { totalProducts, outOfStock, lowStock, inventoryValue };
    }, [normalizedProducts]);

    const filteredProducts = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        if (!normalizedQuery) {
            return normalizedProducts;
        }

        return normalizedProducts.filter((product) =>
            [product.name, product.category]
                .join(" ")
                .toLowerCase()
                .includes(normalizedQuery)
        );
    }, [normalizedProducts, searchQuery]);

    const inventoryValueLabel = useMemo(
        () =>
            new Intl.NumberFormat("en-IN", {
                maximumFractionDigits: 0,
            }).format(analytics.inventoryValue),
        [analytics.inventoryValue]
    );

    const confirmDelete = (id) => {
        setSelectedProductId(id);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const { data } = await axios.delete(
                `/api/products/${selectedProductId}`
            );
            if (data.success) {
                toast.success(data.message);
                fetchProducts();
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const saveStock = async (productId, stockQuantity) => {
        if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
            toast.error(ERROR_MESSAGES.validStockQuantity);
            return;
        }

        try {
            setIsSavingStock((previous) => ({ ...previous, [productId]: true }));

            const { data } = await axios.patch(`/api/products/${productId}`, {
                stockQuantity,
            });

            if (data.success) {
                toast.success(data.message);
                fetchProducts();
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, ERROR_MESSAGES.updateStock));
        } finally {
            setIsSavingStock((previous) => ({ ...previous, [productId]: false }));
        }
    };

    const applyBulkStock = async () => {
        const nextQuantity = Number(bulkStock);

        if (!selectedIds.length) {
            toast.error(ERROR_MESSAGES.selectProducts);
            return;
        }

        if (Number.isNaN(nextQuantity) || nextQuantity < 0) {
            toast.error(ERROR_MESSAGES.validBulkStockQuantity);
            return;
        }

        try {
            await Promise.all(
                selectedIds.map((id) =>
                    axios.patch(`/api/products/${id}`, {
                        stockQuantity: nextQuantity,
                    })
                )
            );

            toast.success("Bulk stock updated");
            setSelectedIds([]);
            setBulkStock("");
            fetchProducts();
        } catch (error) {
            toast.error(getApiErrorMessage(error, ERROR_MESSAGES.updateStock));
        }
    };

    const openEditModal = (product) => {
        setEditForm({
            _id: product._id,
            name: product.name,
            description: Array.isArray(product.description)
                ? product.description.join("\n")
                : product.description,
            category: product.category,
            price: product.price,
            offerPrice: product.offerPrice,
            stockQuantity: product.stockQuantity,
        });
        setIsEditOpen(true);
    };

    const updateProduct = async () => {
        try {
            setIsUpdating(true);
            const payload = {
                name: editForm.name,
                description: editForm.description
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean),
                category: editForm.category,
                price: Number(editForm.price),
                offerPrice: Number(editForm.offerPrice),
                stockQuantity: Number(editForm.stockQuantity),
            };

            const { data } = await axios.put(
                `/api/products/${editForm._id}`,
                payload
            );

            if (data.success) {
                toast.success(data.message);
                setIsEditOpen(false);
                setEditForm(emptyEditState);
                fetchProducts();
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, ERROR_MESSAGES.updateProduct));
        } finally {
            setIsUpdating(false);
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds((previous) =>
            previous.includes(id)
                ? previous.filter((item) => item !== id)
                : [...previous, id]
        );
    };

    const toggleSelectAll = () => {
        setSelectedIds((previous) =>
            previous.length === filteredProducts.length
                ? []
                : filteredProducts.map((product) => product._id)
        );
    };

    return (
        <div className="no-scrollbar flex-1 overflow-y-auto">
            <div className="w-full space-y-6 p-4 md:p-8">
                <div className="max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                        Catalog overview
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold text-[#1b2a21]">
                        Product list
                    </h2>
                    <p className="mt-2 text-base leading-7 text-gray-600">
                        Edit product details, apply bulk stock changes, and keep
                        inventory healthy from one place.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="min-w-0 rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                            Products
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-[#1b2a21]">
                            {analytics.totalProducts}
                        </p>
                    </div>
                    <div className="min-w-0 rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                            Low stock
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-amber-600">
                            {analytics.lowStock}
                        </p>
                    </div>
                    <div className="min-w-0 rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                            Out of stock
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-red-500">
                            {analytics.outOfStock}
                        </p>
                    </div>
                    <div className="min-w-0 rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                            Inventory value
                        </p>
                        <p className="mt-2 truncate text-2xl font-semibold text-[#1b2a21] xl:text-3xl">
                            {currency}
                            {inventoryValueLabel}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 rounded-[24px] border border-[#e5decd] bg-white p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-[#1b2a21]">
                            Bulk stock update
                        </p>
                        <p className="text-sm text-gray-500">
                            {selectedIds.length} product(s) selected
                        </p>
                    </div>
                    <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Quick search by product or category"
                        className="rounded-full border border-[#ddd5c1] px-4 py-2 text-sm outline-none md:min-w-[260px]"
                    />
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                            type="number"
                            min="0"
                            value={bulkStock}
                            onChange={(event) => setBulkStock(event.target.value)}
                            placeholder="Set stock quantity"
                            className="rounded-full border border-[#ddd5c1] px-4 py-2 text-sm outline-none"
                        />
                        <button
                            onClick={applyBulkStock}
                            className="rounded-full bg-[#1f3a2f] px-5 py-2 text-sm font-medium text-white"
                        >
                            Apply to selected
                        </button>
                    </div>
                </div>

                {isProductsLoading ? (
                    <div className="w-full rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-6 text-center text-gray-600">
                        Loading products...
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="w-full rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-6 text-center text-gray-600">
                        No products found for this search.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-[24px] border border-[#e5decd] bg-white">
                        <table className="min-w-[760px] w-full text-left text-sm text-gray-700">
                            <thead className="bg-[#f7f3e8] text-gray-900">
                                <tr>
                                    <th className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                            selectedIds.length ===
                                                    filteredProducts.length &&
                                                filteredProducts.length > 0
                                            }
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Product
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Category
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Price
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Stock
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredProducts.map((product) => (
                                    <tr key={product._id}>
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(
                                                    product._id
                                                )}
                                                onChange={() =>
                                                    toggleSelect(product._id)
                                                }
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-xl border border-[#e5decd] p-1">
                                                    <img
                                                        src={product.image[0]}
                                                        alt={product.name}
                                                        className="h-12 w-12 object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-[#1b2a21]">
                                                        {product.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {product.stockQuantity === 0
                                                            ? "Out of stock"
                                                            : product.stockQuantity <=
                                                              5
                                                            ? "Low stock"
                                                            : "Healthy stock"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {product.category}
                                        </td>
                                        <td className="px-4 py-4">
                                            <p>
                                                {currency}
                                                {product.offerPrice}
                                            </p>
                                            <p className="text-xs text-gray-400 line-through">
                                                {currency}
                                                {product.price}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={
                                                        pendingStock[
                                                            product._id
                                                        ] ?? product.stockQuantity
                                                    }
                                                    onChange={(event) =>
                                                        setPendingStock(
                                                            (previous) => ({
                                                                ...previous,
                                                                [product._id]:
                                                                    event.target
                                                                        .value,
                                                            })
                                                        )
                                                    }
                                                    className="w-24 rounded-xl border border-[#ddd5c1] px-3 py-2 text-sm"
                                                />
                                                <button
                                                    onClick={() =>
                                                        saveStock(
                                                            product._id,
                                                            Number(
                                                                pendingStock[
                                                                    product._id
                                                                ] ??
                                                                    product.stockQuantity
                                                            )
                                                        )
                                                    }
                                                    disabled={
                                                        isSavingStock[product._id]
                                                    }
                                                    className={`rounded-full px-3 py-2 text-xs font-medium text-white ${
                                                        isSavingStock[
                                                            product._id
                                                        ]
                                                            ? "cursor-not-allowed bg-[#8ca397]"
                                                            : "bg-[#1f3a2f]"
                                                    }`}
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() =>
                                                        openEditModal(product)
                                                    }
                                                    className="rounded-full border border-[#d7ccb4] px-3 py-2 text-xs font-medium text-[#1f3a2f]"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        confirmDelete(product._id)
                                                    }
                                                    className="rounded-full bg-red-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-600"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isEditOpen &&
                renderSellerModal(
                <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
                    <div className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-lg sm:p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-[#1b2a21]">
                                Edit product
                            </h3>
                            <button
                                onClick={() => setIsEditOpen(false)}
                                className="text-sm text-gray-500"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <input
                                value={editForm.name}
                                onChange={(event) =>
                                    setEditForm((previous) => ({
                                        ...previous,
                                        name: event.target.value,
                                    }))
                                }
                                placeholder="Product name"
                                className="rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none md:col-span-2"
                            />
                            <textarea
                                value={editForm.description}
                                onChange={(event) =>
                                    setEditForm((previous) => ({
                                        ...previous,
                                        description: event.target.value,
                                    }))
                                }
                                rows={4}
                                placeholder="Description lines"
                                className="resize-none rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none md:col-span-2"
                            />
                            <select
                                value={editForm.category}
                                onChange={(event) =>
                                    setEditForm((previous) => ({
                                        ...previous,
                                        category: event.target.value,
                                    }))
                                }
                                className="rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none"
                            >
                                <option value="">Select category</option>
                                {categories.map((item) => (
                                    <option key={item.path} value={item.path}>
                                        {item.path}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                value={editForm.stockQuantity}
                                onChange={(event) =>
                                    setEditForm((previous) => ({
                                        ...previous,
                                        stockQuantity: event.target.value,
                                    }))
                                }
                                placeholder="Stock quantity"
                                className="rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none"
                            />
                            <input
                                type="number"
                                value={editForm.price}
                                onChange={(event) =>
                                    setEditForm((previous) => ({
                                        ...previous,
                                        price: event.target.value,
                                    }))
                                }
                                placeholder="MRP"
                                className="rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none"
                            />
                            <input
                                type="number"
                                value={editForm.offerPrice}
                                onChange={(event) =>
                                    setEditForm((previous) => ({
                                        ...previous,
                                        offerPrice: event.target.value,
                                    }))
                                }
                                placeholder="Offer price"
                                className="rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none"
                            />
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                onClick={() => setIsEditOpen(false)}
                                className="rounded-full border border-[#d7ccb4] px-5 py-2 text-sm font-medium text-[#1f3a2f]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={updateProduct}
                                disabled={isUpdating}
                                className={`rounded-full px-5 py-2 text-sm font-medium text-white ${
                                    isUpdating
                                        ? "cursor-not-allowed bg-[#8ca397]"
                                        : "bg-[#1f3a2f]"
                                }`}
                            >
                                {isUpdating ? "Saving..." : "Save changes"}
                            </button>
                        </div>
                    </div>
                </div>
                )}

            {showDeleteModal &&
                renderSellerModal(
                <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
                    <div className="my-auto w-full max-w-md rounded-[28px] bg-white p-5 shadow-lg sm:p-6">
                        <h3 className="mb-4 text-lg font-semibold text-gray-800">
                            Confirm deletion
                        </h3>
                        <p className="mb-6 text-gray-600">
                            Are you sure you want to delete this product? This
                            action cannot be undone.
                        </p>
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="rounded-md border border-gray-300 px-4 py-2 transition hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className={`rounded-md bg-red-500 px-4 py-2 text-white transition ${
                                    isDeleting
                                        ? "cursor-not-allowed opacity-50"
                                        : "hover:bg-red-600"
                                }`}
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
                )}
        </div>
    );
};

export default ProductList;
