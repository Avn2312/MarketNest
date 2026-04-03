import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Loader from "../components/Loader";
import { useAppContext } from "../context/AppContext";
import {
    ERROR_MESSAGES,
    getApiErrorMessage,
} from "../utils/errorMessages";

const statusStyles = {
    "Order Placed": "bg-[#eef4ef] text-[#1f7a42]",
    Processing: "bg-[#fff4df] text-[#b7791f]",
    Shipped: "bg-[#e8f0ff] text-[#3159b5]",
    Delivered: "bg-[#e4f8ea] text-[#157347]",
    Cancelled: "bg-[#fde7e7] text-[#b24040]",
};

const MyOrders = () => {
    const [myOrders, setMyOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingOrderId, setProcessingOrderId] = useState("");
    const { axios, currency, user } = useAppContext();

    const fetchMyOrders = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await axios.get("/api/order/user");

            if (data.success) {
                setMyOrders(data.orders);
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [axios]);

    useEffect(() => {
        if (user) {
            fetchMyOrders();
            return;
        }

        setLoading(false);
    }, [fetchMyOrders, user]);

    const totalOrders = myOrders.length;
    const totalItems = useMemo(
        () =>
            myOrders.reduce(
                (total, order) =>
                    total +
                    order.items.reduce(
                        (itemTotal, item) => itemTotal + item.quantity,
                        0
                    ),
                0
            ),
        [myOrders]
    );

    const handleOrderAction = async (orderId, action, reason) => {
        try {
            setProcessingOrderId(orderId);
            const endpoint =
                action === "cancel"
                    ? `/api/order/${orderId}/cancel`
                    : `/api/order/${orderId}/return`;

            const { data } = await axios.patch(endpoint, { reason });

            if (data.success) {
                toast.success(data.message);
                fetchMyOrders();
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, ERROR_MESSAGES.updateOrder));
        } finally {
            setProcessingOrderId("");
        }
    };

    if (loading) {
        return <Loader />;
    }

    return (
        <div className="mt-16 pb-16">
            <section className="rounded-[34px] border border-[#e6decb] bg-[linear-gradient(135deg,#faf7f1_0%,#f4efe3_55%,#eef4ef_100%)] px-6 py-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:px-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                            Order history
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold text-[#1b2a21] sm:text-4xl">
                            Track your recent MarketNest orders.
                        </h1>
                        <p className="mt-3 text-base leading-7 text-gray-600">
                            Review order status, payment method, item breakdown,
                            and delivery details from one place.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[24px] bg-white/80 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                Orders
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-[#1b2a21]">
                                {totalOrders}
                            </p>
                        </div>
                        <div className="rounded-[24px] bg-white/80 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                Items
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-[#1b2a21]">
                                {totalItems}
                            </p>
                        </div>
                        <div className="rounded-[24px] bg-white/80 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                Account
                            </p>
                            <p className="mt-2 text-sm font-semibold text-[#1b2a21]">
                                {user ? "Logged in" : "Guest"}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {!user ? (
                <div className="mt-10 rounded-[28px] border border-dashed border-[#d7ccb4] bg-[#fbf8f1] px-6 py-10 text-center text-gray-600">
                    Login to view your order history.
                </div>
            ) : myOrders.length === 0 ? (
                <div className="mt-10 rounded-[28px] border border-dashed border-[#d7ccb4] bg-[#fbf8f1] px-6 py-12 text-center">
                    <p className="text-lg font-medium text-[#1b2a21]">
                        You have not placed any orders yet.
                    </p>
                    <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-600">
                        Once you complete checkout, your order timeline and item
                        details will appear here.
                    </p>
                </div>
            ) : (
                <div className="mt-10 space-y-6">
                    {myOrders.map((order) => {
                        const statusClassName =
                            statusStyles[order.status] || "bg-[#eef1f4] text-[#44576b]";
                        const validItems = order.items.filter(
                            (item) => item.product
                        );

                        return (
                            <article
                                key={order._id}
                                className="overflow-hidden rounded-[30px] border border-[#e6decb] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.04)]"
                            >
                                <div className="flex flex-col gap-4 border-b border-[#efe7d4] bg-[#fbf8f1] px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClassName}`}
                                            >
                                                {order.status}
                                            </span>
                                            <span className="rounded-full bg-[#edf2f7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#4a5568]">
                                                {order.paymentType}
                                            </span>
                                            {order.returnStatus !== "none" && (
                                                <span className="rounded-full bg-[#fff4df] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#b7791f]">
                                                    Return {order.returnStatus}
                                                </span>
                                            )}
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                                                    order.isPaid
                                                        ? "bg-[#e4f8ea] text-[#157347]"
                                                        : "bg-[#fff4df] text-[#b7791f]"
                                                }`}
                                            >
                                                {order.isPaid ? "Paid" : "Pending"}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">
                                                Order ID
                                            </p>
                                            <p className="mt-1 font-semibold text-[#1b2a21]">
                                                {order._id}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                                Date
                                            </p>
                                            <p className="mt-2 text-sm font-medium text-[#1b2a21]">
                                                {new Date(
                                                    order.createdAt
                                                ).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                                Items
                                            </p>
                                            <p className="mt-2 text-sm font-medium text-[#1b2a21]">
                                                {validItems.length} products
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                                Total
                                            </p>
                                            <p className="mt-2 text-sm font-medium text-[#1b2a21]">
                                                {currency}
                                                {order.amount}
                                            </p>
                                            {order.discountAmount > 0 && (
                                                <p className="mt-1 text-xs text-green-600">
                                                    Saved {currency}
                                                    {order.discountAmount}
                                                    {order.couponCode
                                                        ? ` with ${order.couponCode}`
                                                        : ""}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
                                    <div className="space-y-4">
                                        {validItems.length > 0 ? (
                                            validItems.map((item, index) => (
                                            <div
                                                key={`${order._id}-${index}`}
                                                className="grid gap-4 rounded-[24px] border border-[#efe7d4] bg-[#fffdf9] p-4 sm:grid-cols-[88px_minmax(0,1fr)_auto]"
                                            >
                                                <div className="flex h-[88px] w-[88px] items-center justify-center rounded-[20px] bg-[#f7f3e8] p-3">
                                                    <img
                                                        src={item.product.image[0]}
                                                        alt={item.product.name}
                                                        className="max-h-full w-auto object-contain"
                                                    />
                                                </div>

                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                                        {item.product.category}
                                                    </p>
                                                    <h2 className="mt-2 text-lg font-semibold text-[#1b2a21]">
                                                        {item.product.name}
                                                    </h2>
                                                    <p className="mt-2 text-sm text-gray-600">
                                                        Quantity: {item.quantity}
                                                    </p>
                                                </div>

                                                <div className="text-left sm:text-right">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                                                        Item total
                                                    </p>
                                                    <p className="mt-2 text-lg font-semibold text-[#1f3a2f]">
                                                        {currency}
                                                        {item.product.offerPrice *
                                                            item.quantity}
                                                    </p>
                                                </div>
                                            </div>
                                            ))
                                        ) : (
                                            <div className="rounded-[24px] border border-dashed border-[#d7ccb4] bg-[#fffdf9] p-4 text-sm text-gray-500">
                                                Product details for this order are no
                                                longer available.
                                            </div>
                                        )}
                                    </div>

                                    <aside className="rounded-[24px] border border-[#efe7d4] bg-[#fbf8f1] p-5">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                                            Delivery details
                                        </p>
                                        <h3 className="mt-3 text-lg font-semibold text-[#1b2a21]">
                                            {order.address
                                                ? `${order.address.firstName} ${order.address.lastName}`
                                                : "Address unavailable"}
                                        </h3>
                                        {order.address ? (
                                            <>
                                                <p className="mt-3 text-sm leading-6 text-gray-600">
                                                    {order.address.street},{" "}
                                                    {order.address.city},{" "}
                                                    {order.address.state},{" "}
                                                    {order.address.country} -{" "}
                                                    {order.address.zipcode}
                                                </p>
                                                <p className="mt-3 text-sm text-gray-600">
                                                    {order.address.phone}
                                                </p>
                                                <p className="mt-1 text-sm text-gray-600">
                                                    {order.address.email}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="mt-3 text-sm text-gray-600">
                                                Saved delivery address is no longer
                                                available for this order.
                                            </p>
                                        )}

                                        <div className="mt-5 space-y-3">
                                            {order.status !== "Cancelled" &&
                                                !["Shipped", "Delivered"].includes(
                                                    order.status
                                                ) && (
                                                    <button
                                                        onClick={() =>
                                                            handleOrderAction(
                                                                order._id,
                                                                "cancel",
                                                                "Cancelled by customer"
                                                            )
                                                        }
                                                        disabled={
                                                            processingOrderId ===
                                                            order._id
                                                        }
                                                        className="w-full rounded-full border border-red-500 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Cancel order
                                                    </button>
                                                )}

                                            {order.status === "Delivered" &&
                                                order.returnStatus === "none" && (
                                                    <button
                                                        onClick={() =>
                                                            handleOrderAction(
                                                                order._id,
                                                                "return",
                                                                "Return requested by customer"
                                                            )
                                                        }
                                                        disabled={
                                                            processingOrderId ===
                                                            order._id
                                                        }
                                                        className="w-full rounded-full border border-[#d7ccb4] px-4 py-2 text-sm font-medium text-[#1f3a2f] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Request return
                                                    </button>
                                                )}

                                            {order.cancelReason && (
                                                <p className="text-xs text-gray-500">
                                                    Cancel note: {order.cancelReason}
                                                </p>
                                            )}
                                            {order.returnReason && (
                                                <p className="text-xs text-gray-500">
                                                    Return note: {order.returnReason}
                                                </p>
                                            )}
                                        </div>
                                    </aside>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MyOrders;
