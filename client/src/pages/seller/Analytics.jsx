import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Loader from "../../components/Loader";
import { useAppContext } from "../../context/AppContext";
import {
    ERROR_MESSAGES,
    getApiErrorMessage,
} from "../../utils/errorMessages";

const formatCompactAmount = (amount) =>
    new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 0,
    }).format(amount || 0);

const formatShortDate = (value) =>
    new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
    }).format(new Date(value));

const Analytics = () => {
    const { axios, currency, products = [] } = useAppContext();
    const [orders, setOrders] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAnalytics = useCallback(async () => {
        try {
            setIsLoading(true);
            const [ordersResponse, couponsResponse] = await Promise.all([
                axios.get("/api/order/seller"),
                axios.get("/api/coupon/seller"),
            ]);

            if (ordersResponse.data.success) {
                setOrders(ordersResponse.data.orders);
            }

            if (couponsResponse.data.success) {
                setCoupons(couponsResponse.data.coupons);
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, ERROR_MESSAGES.loadAnalytics));
        } finally {
            setIsLoading(false);
        }
    }, [axios]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const overview = useMemo(() => {
        const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
        const deliveredRevenue = orders
            .filter((order) => order.status === "Delivered")
            .reduce((sum, order) => sum + order.amount, 0);
        const averageOrderValue = orders.length ? totalRevenue / orders.length : 0;
        const totalUnitsSold = orders.reduce(
            (sum, order) =>
                sum +
                order.items.reduce(
                    (itemSum, item) => itemSum + (Number(item.quantity) || 0),
                    0
                ),
            0
        );

        return {
            totalRevenue,
            deliveredRevenue,
            averageOrderValue,
            totalUnitsSold,
            totalOrders: orders.length,
            activeProducts: products.filter(
                (product) =>
                    (typeof product.stockQuantity === "number"
                        ? product.stockQuantity
                        : product.inStock
                        ? 24
                        : 0) > 0
            ).length,
        };
    }, [orders, products]);

    const dailyPerformance = useMemo(() => {
        const days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - (6 - index));

            return {
                key: date.toISOString().slice(0, 10),
                label: formatShortDate(date),
                revenue: 0,
                orders: 0,
            };
        });

        const dayMap = new Map(days.map((day) => [day.key, day]));

        orders.forEach((order) => {
            const key = new Date(order.createdAt).toISOString().slice(0, 10);
            const bucket = dayMap.get(key);

            if (bucket) {
                bucket.revenue += order.amount;
                bucket.orders += 1;
            }
        });

        const maxRevenue = Math.max(...days.map((day) => day.revenue), 1);

        return days.map((day) => ({
            ...day,
            height: Math.max((day.revenue / maxRevenue) * 100, day.revenue ? 18 : 8),
        }));
    }, [orders]);

    const statusBreakdown = useMemo(() => {
        const statusMap = new Map([
            ["Order Placed", 0],
            ["Processing", 0],
            ["Shipped", 0],
            ["Delivered", 0],
            ["Cancelled", 0],
        ]);

        orders.forEach((order) => {
            statusMap.set(order.status, (statusMap.get(order.status) || 0) + 1);
        });

        const palette = {
            "Order Placed": "bg-[#dcefe3] text-[#1f7a42]",
            Processing: "bg-[#e7eefc] text-[#3657b2]",
            Shipped: "bg-[#efe7ff] text-[#6a3ec8]",
            Delivered: "bg-[#def7e6] text-[#15803d]",
            Cancelled: "bg-[#fde7e7] text-[#b24040]",
        };

        const total = orders.length || 1;

        return Array.from(statusMap.entries()).map(([status, count]) => ({
            status,
            count,
            percentage: Math.round((count / total) * 100),
            colorClass: palette[status] || "bg-[#f3efe5] text-[#1b2a21]",
        }));
    }, [orders]);

    const topProducts = useMemo(() => {
        const productsMap = new Map();

        orders.forEach((order) => {
            order.items
                .filter((item) => item.product)
                .forEach((item) => {
                    const id = item.product._id || item.product.name;
                    const existing = productsMap.get(id) || {
                        id,
                        name: item.product.name,
                        units: 0,
                        revenue: 0,
                        category: item.product.category,
                    };

                    existing.units += item.quantity;
                    existing.revenue += item.product.offerPrice * item.quantity;
                    productsMap.set(id, existing);
                });
        });

        return Array.from(productsMap.values())
            .sort((first, second) => second.revenue - first.revenue)
            .slice(0, 5);
    }, [orders]);

    const couponInsights = useMemo(() => {
        const activeCoupons = coupons.filter((coupon) => coupon.isActive).length;
        const expiredCoupons = coupons.filter((coupon) => coupon.isExpired).length;
        const totalRedemptions = coupons.reduce(
            (sum, coupon) => sum + (coupon.usedCount || 0),
            0
        );
        const topCoupon = [...coupons].sort(
            (first, second) => (second.usedCount || 0) - (first.usedCount || 0)
        )[0];

        return {
            activeCoupons,
            expiredCoupons,
            totalRedemptions,
            topCoupon,
        };
    }, [coupons]);

    if (isLoading) {
        return (
            <div className="no-scrollbar flex-1 overflow-y-auto p-4 md:p-8">
                <Loader />
            </div>
        );
    }

    return (
        <div className="no-scrollbar flex-1 overflow-y-auto">
            <div className="space-y-6 p-4 md:p-8">
                <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                        Analytics
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold text-[#1b2a21]">
                        Business trends
                    </h2>
                    <p className="mt-2 text-base leading-7 text-gray-600">
                        Track revenue, order flow, best sellers, and coupon
                        performance from one seller analytics view.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                            Revenue
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-[#1b2a21]">
                            {currency}
                            {formatCompactAmount(overview.totalRevenue)}
                        </p>
                    </div>
                    <div className="rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                            Avg order value
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-[#1b2a21]">
                            {currency}
                            {formatCompactAmount(overview.averageOrderValue)}
                        </p>
                    </div>
                    <div className="rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                            Units sold
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-green-600">
                            {overview.totalUnitsSold}
                        </p>
                    </div>
                    <div className="rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                            Active products
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-[#1b2a21]">
                            {overview.activeProducts}
                        </p>
                    </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                    <div className="rounded-[24px] border border-[#e5decd] bg-white p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                                    Last 7 days
                                </p>
                                <h3 className="mt-2 text-xl font-semibold text-[#1b2a21]">
                                    Revenue trend
                                </h3>
                            </div>
                            <div className="rounded-2xl bg-[#f6f2e8] px-4 py-3">
                                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                                    Delivered revenue
                                </p>
                                <p className="mt-1 text-lg font-semibold text-[#1b2a21]">
                                    {currency}
                                    {formatCompactAmount(overview.deliveredRevenue)}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex h-64 items-end gap-3">
                            {dailyPerformance.map((day) => (
                                <div
                                    key={day.key}
                                    className="flex min-w-0 flex-1 flex-col items-center"
                                >
                                    <p className="mb-2 text-xs font-medium text-[#1b2a21]">
                                        {day.orders}
                                    </p>
                                    <div className="flex h-44 w-full items-end">
                                        <div
                                            className="w-full rounded-t-[18px] bg-[linear-gradient(180deg,#53b67d_0%,#1f3a2f_100%)] transition-all"
                                            style={{ height: `${day.height}%` }}
                                            title={`${day.label}: ${currency}${formatCompactAmount(day.revenue)}`}
                                        />
                                    </div>
                                    <p className="mt-3 text-xs text-gray-500">
                                        {day.label}
                                    </p>
                                    <p className="mt-1 text-xs font-medium text-[#1b2a21]">
                                        {currency}
                                        {formatCompactAmount(day.revenue)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="rounded-[24px] border border-[#e5decd] bg-white p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                                Status mix
                            </p>
                            <h3 className="mt-2 text-xl font-semibold text-[#1b2a21]">
                                Order distribution
                            </h3>

                            <div className="mt-5 space-y-3">
                                {statusBreakdown.map((item) => (
                                    <div key={item.status}>
                                        <div className="flex items-center justify-between text-sm">
                                            <p className="font-medium text-[#1b2a21]">
                                                {item.status}
                                            </p>
                                            <p className="text-gray-500">
                                                {item.count} orders
                                            </p>
                                        </div>
                                        <div className="mt-2 h-2.5 rounded-full bg-[#f2ede2]">
                                            <div
                                                className="h-2.5 rounded-full bg-[#1f3a2f]"
                                                style={{ width: `${item.percentage}%` }}
                                            />
                                        </div>
                                        <span
                                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.colorClass}`}
                                        >
                                            {item.percentage}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[24px] border border-[#e5decd] bg-white p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                                Coupon health
                            </p>
                            <h3 className="mt-2 text-xl font-semibold text-[#1b2a21]">
                                Promotion snapshot
                            </h3>

                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-[18px] bg-[#fbf8f1] px-4 py-3">
                                    <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                                        Active coupons
                                    </p>
                                    <p className="mt-2 text-2xl font-semibold text-[#1b2a21]">
                                        {couponInsights.activeCoupons}
                                    </p>
                                </div>
                                <div className="rounded-[18px] bg-[#fbf8f1] px-4 py-3">
                                    <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                                        Redemptions
                                    </p>
                                    <p className="mt-2 text-2xl font-semibold text-[#1b2a21]">
                                        {couponInsights.totalRedemptions}
                                    </p>
                                </div>
                                <div className="rounded-[18px] bg-[#fbf8f1] px-4 py-3">
                                    <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                                        Expired
                                    </p>
                                    <p className="mt-2 text-2xl font-semibold text-red-500">
                                        {couponInsights.expiredCoupons}
                                    </p>
                                </div>
                                <div className="rounded-[18px] bg-[#fbf8f1] px-4 py-3">
                                    <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                                        Top coupon
                                    </p>
                                    <p className="mt-2 truncate text-lg font-semibold text-[#1b2a21]">
                                        {couponInsights.topCoupon?.code || "None"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-[24px] border border-[#e5decd] bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                        Best sellers
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-[#1b2a21]">
                        Top products
                    </h3>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        {topProducts.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                Product sales will appear here once orders are placed.
                            </p>
                        ) : (
                            topProducts.map((product, index) => (
                                <div
                                    key={product.id}
                                    className="flex items-center justify-between gap-3 rounded-[18px] bg-[#fbf8f1] px-4 py-4"
                                >
                                    <div className="min-w-0">
                                        <p className="text-xs uppercase tracking-[0.16em] text-gray-400">
                                            #{index + 1} {product.category}
                                        </p>
                                        <p className="truncate font-medium text-[#1b2a21]">
                                            {product.name}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-[#1b2a21]">
                                            {currency}
                                            {formatCompactAmount(product.revenue)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {product.units} unit(s)
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
