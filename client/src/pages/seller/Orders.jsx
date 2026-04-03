import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { assets } from "../../assets/assets";
import Loader from "../../components/Loader";
import { useAppContext } from "../../context/AppContext";
import {
    ERROR_MESSAGES,
    getApiErrorMessage,
} from "../../utils/errorMessages";

const statusOptions = [
    "All",
    "Order Placed",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
];

const formatCompactAmount = (amount) =>
    new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 0,
    }).format(amount || 0);

const renderSellerModal = (children) => {
    if (typeof document === "undefined") {
        return null;
    }

    return createPortal(children, document.body);
};

const Orders = () => {
    const { axios, currency } = useAppContext();
    const [orders, setOrders] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("All");
    const [paymentFilter, setPaymentFilter] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    const fetchOrders = useCallback(async () => {
        try {
            setIsLoading(true);
            const { data } = await axios.get("/api/order/seller");

            if (data.success) {
                setOrders(data.orders);
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, ERROR_MESSAGES.fetchOrders));
        } finally {
            setIsLoading(false);
        }
    }, [axios]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const filteredOrders = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        return orders.filter((order) => {
            const matchesStatus =
                statusFilter === "All" || order.status === statusFilter;
            const matchesPayment =
                paymentFilter === "All" || order.paymentType === paymentFilter;
            const matchesSearch =
                !normalizedQuery ||
                order._id.toLowerCase().includes(normalizedQuery) ||
                `${order.address?.firstName || ""} ${
                    order.address?.lastName || ""
                }`
                    .toLowerCase()
                    .includes(normalizedQuery);

            return matchesStatus && matchesPayment && matchesSearch;
        });
    }, [orders, paymentFilter, searchQuery, statusFilter]);

    const analytics = useMemo(() => {
        const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
        const deliveredRevenue = orders
            .filter((order) => order.status === "Delivered")
            .reduce((sum, order) => sum + order.amount, 0);
        const pendingOrders = orders.filter(
            (order) =>
                order.status === "Order Placed" || order.status === "Processing"
        ).length;
        const paidOrders = orders.filter((order) => order.isPaid).length;

        return {
            totalOrders: orders.length,
            totalRevenue,
            deliveredRevenue,
            pendingOrders,
            paidOrders,
        };
    }, [orders]);

    const confirmDelete = (orderId) => {
        setSelectedOrderId(orderId);
        setShowModal(true);
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const { data } = await axios.delete(
                `/api/order/${selectedOrderId}`
            );
            if (data.success) {
                toast.success(data.message);
                setOrders((prev) => prev.filter((o) => o._id !== selectedOrderId));
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, ERROR_MESSAGES.deleteOrder));
        } finally {
            setIsDeleting(false);
            setShowModal(false);
        }
    };

    const handleStatusChange = async (orderId, newStatus, newReturnStatus) => {
        try {
            const { data } = await axios.patch(`/api/order/${orderId}`, {
                status: newStatus,
                returnStatus: newReturnStatus,
            });

            if (data.success) {
                toast.success("Status updated");
                setOrders((prevOrders) =>
                    prevOrders.map((order) =>
                        order._id === orderId
                            ? {
                                  ...order,
                                  status: newStatus,
                                  returnStatus:
                                      newReturnStatus || order.returnStatus,
                              }
                            : order
                    )
                );
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, ERROR_MESSAGES.updateStatus));
        }
    };

    return (
        <div className="no-scrollbar flex-1 overflow-y-auto">
            <div className="space-y-6 p-4 md:p-8">
                <div className="max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                        Fulfillment
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold text-[#1b2a21]">
                        Orders list
                    </h2>
                    <p className="mt-2 text-base leading-7 text-gray-600">
                        Filter order flow, monitor revenue, and update delivery
                        status from one operations dashboard.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="min-w-0 rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                            Orders
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-[#1b2a21]">
                            {analytics.totalOrders}
                        </p>
                    </div>
                    <div className="min-w-0 rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                            Revenue
                        </p>
                        <p className="mt-2 truncate text-2xl font-semibold text-[#1b2a21] xl:text-3xl">
                            {currency}
                            {formatCompactAmount(analytics.totalRevenue)}
                        </p>
                    </div>
                    <div className="min-w-0 rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                            Delivered
                        </p>
                        <p className="mt-2 truncate text-2xl font-semibold text-green-600 xl:text-3xl">
                            {currency}
                            {formatCompactAmount(analytics.deliveredRevenue)}
                        </p>
                    </div>
                    <div className="min-w-0 rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                            Pending
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-amber-600">
                            {analytics.pendingOrders}
                        </p>
                    </div>
                    <div className="min-w-0 rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                            Paid
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-[#1b2a21]">
                            {analytics.paidOrders}
                        </p>
                    </div>
                </div>

                <div className="grid gap-3 rounded-[24px] border border-[#e5decd] bg-white p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.6fr)_minmax(180px,0.6fr)]">
                    <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search by order ID or customer"
                        className="rounded-full border border-[#ddd5c1] px-4 py-3 text-sm outline-none"
                    />
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="rounded-full border border-[#ddd5c1] px-4 py-3 text-sm outline-none"
                    >
                        {statusOptions.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                    <select
                        value={paymentFilter}
                        onChange={(event) => setPaymentFilter(event.target.value)}
                        className="rounded-full border border-[#ddd5c1] px-4 py-3 text-sm outline-none"
                    >
                        <option value="All">All payments</option>
                        <option value="COD">COD</option>
                        <option value="Online">Online</option>
                    </select>
                </div>

                {isLoading ? (
                    <Loader />
                ) : filteredOrders.length === 0 ? (
                    <p className="mt-4 text-gray-600">No orders found.</p>
                ) : (
                    filteredOrders.map((order) => (
                        <div
                            key={order._id}
                            className="flex w-full flex-col gap-5 rounded-[24px] border border-[#e5decd] bg-white p-5"
                        >
                            <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="rounded-full bg-[#eef4ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#1f7a42]">
                                            {order.status}
                                        </span>
                                        {order.returnStatus !== "none" && (
                                            <span className="rounded-full bg-[#fff4df] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#b7791f]">
                                                Return {order.returnStatus}
                                            </span>
                                        )}
                                        <span className="rounded-full bg-[#f7f3e8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#1b2a21]">
                                            {order.paymentType}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            {new Date(
                                                order.createdAt
                                            ).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="mt-3 font-semibold text-[#1b2a21]">
                                        {order._id}
                                    </p>
                                    <p className="mt-1 text-sm text-gray-600">
                                        {order.address?.firstName}{" "}
                                        {order.address?.lastName} |{" "}
                                        {order.address?.city},{" "}
                                        {order.address?.state}
                                    </p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3 2xl:min-w-[280px]">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                                            Total
                                        </p>
                                        <p className="mt-2 font-semibold text-[#1b2a21]">
                                            {currency}
                                            {order.amount}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                                            Payment
                                        </p>
                                        <p className="mt-2 font-semibold text-[#1b2a21]">
                                            {order.isPaid ? "Paid" : "Pending"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                                            Items
                                        </p>
                                        <p className="mt-2 font-semibold text-[#1b2a21]">
                                            {order.items.length}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
                                <div className="space-y-3">
                                    {order.items
                                        .filter((item) => item.product)
                                        .map((item, index) => (
                                            <div
                                                key={`${order._id}-${index}`}
                                                className="flex flex-col gap-3 rounded-[20px] border border-[#efe7d4] bg-[#fffdf9] p-4 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <img
                                                        className="h-10 w-10 object-cover"
                                                        src={assets.box_icon}
                                                        alt="boxIcon"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-[#1b2a21]">
                                                            {item.product.name}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            Qty {item.quantity} |{" "}
                                                            {item.product.category}
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className="font-medium text-[#1b2a21] sm:text-right">
                                                    {currency}
                                                    {item.product.offerPrice *
                                                        item.quantity}
                                                </p>
                                            </div>
                                        ))}
                                </div>

                                <div className="space-y-4 rounded-[24px] border border-[#efe7d4] bg-[#fbf8f1] p-4">
                                    <div className="text-sm text-gray-600">
                                        <p className="font-medium text-[#1b2a21]">
                                            Delivery address
                                        </p>
                                        <p className="mt-2">
                                            {order.address?.street},{" "}
                                            {order.address?.city},{" "}
                                            {order.address?.state},{" "}
                                            {order.address?.zipcode}
                                        </p>
                                        <p>{order.address?.country}</p>
                                        <p>{order.address?.phone}</p>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor={`status-${order._id}`}
                                            className="mb-1 block text-sm font-medium text-[#1b2a21]"
                                        >
                                            Update status
                                        </label>
                                        <select
                                            id={`status-${order._id}`}
                                            value={order.status}
                                            onChange={(event) =>
                                                handleStatusChange(
                                                    order._id,
                                                    event.target.value,
                                                    order.returnStatus
                                                )
                                            }
                                            className="w-full rounded-xl border border-[#ddd5c1] px-3 py-2 text-sm"
                                        >
                                            {statusOptions
                                                .filter((status) => status !== "All")
                                                .map((status) => (
                                                    <option
                                                        key={status}
                                                        value={status}
                                                    >
                                                        {status}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    {order.returnStatus !== "none" && (
                                        <div>
                                            <label
                                                htmlFor={`return-${order._id}`}
                                                className="mb-1 block text-sm font-medium text-[#1b2a21]"
                                            >
                                                Return status
                                            </label>
                                            <select
                                                id={`return-${order._id}`}
                                                value={order.returnStatus}
                                                onChange={(event) =>
                                                    handleStatusChange(
                                                        order._id,
                                                        order.status,
                                                        event.target.value
                                                    )
                                                }
                                                className="w-full rounded-xl border border-[#ddd5c1] px-3 py-2 text-sm"
                                            >
                                                <option value="requested">
                                                    Requested
                                                </option>
                                                <option value="approved">
                                                    Approved
                                                </option>
                                                <option value="rejected">
                                                    Rejected
                                                </option>
                                                <option value="completed">
                                                    Completed
                                                </option>
                                            </select>
                                        </div>
                                    )}

                                    {order.returnReason && (
                                        <p className="text-xs text-gray-500">
                                            Return note: {order.returnReason}
                                        </p>
                                    )}

                                    <button
                                        onClick={() => confirmDelete(order._id)}
                                        className="w-full rounded-full border border-red-500 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-100"
                                    >
                                        Delete order
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal &&
                renderSellerModal(
                <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
                    <div className="my-auto w-full max-w-md rounded-[28px] bg-white p-5 shadow-lg sm:p-6">
                        <h3 className="mb-4 text-lg font-semibold text-gray-800">
                            Confirm deletion
                        </h3>
                        <p className="mb-6 text-gray-600">
                            Are you sure you want to delete this order? This action
                            cannot be undone.
                        </p>
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                onClick={() => setShowModal(false)}
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

export default Orders;
