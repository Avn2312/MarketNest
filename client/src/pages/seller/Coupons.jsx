import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAppContext } from "../../context/AppContext";
import {
    ERROR_MESSAGES,
    getApiErrorMessage,
} from "../../utils/errorMessages";

const emptyCouponForm = {
    code: "",
    type: "percent",
    value: "",
    minOrder: "",
    description: "",
    expiresAt: "",
    usageLimit: "",
    isActive: true,
};

const Coupons = () => {
    const { axios, currency } = useAppContext();
    const [coupons, setCoupons] = useState([]);
    const [form, setForm] = useState(emptyCouponForm);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingCouponId, setEditingCouponId] = useState(null);

    const fetchCoupons = useCallback(async () => {
        try {
            setIsLoading(true);
            const { data } = await axios.get("/api/coupon/seller");

            if (data.success) {
                setCoupons(data.coupons);
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, ERROR_MESSAGES.fetchCoupons));
        } finally {
            setIsLoading(false);
        }
    }, [axios]);

    useEffect(() => {
        fetchCoupons();
    }, [fetchCoupons]);

    const analytics = useMemo(() => {
        const active = coupons.filter((coupon) => coupon.isActive).length;
        const expired = coupons.filter((coupon) => coupon.isExpired).length;
        const redemptions = coupons.reduce(
            (total, coupon) => total + (coupon.usedCount || 0),
            0
        );

        return {
            total: coupons.length,
            active,
            expired,
            redemptions,
        };
    }, [coupons]);

    const resetForm = () => {
        setForm(emptyCouponForm);
        setEditingCouponId(null);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            setIsSaving(true);
            const payload = {
                ...form,
                code: form.code.toUpperCase(),
                value: Number(form.value),
                minOrder: Number(form.minOrder),
                usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
                expiresAt: form.expiresAt || null,
            };

            const request = editingCouponId
                ? axios.put(`/api/coupon/${editingCouponId}`, payload)
                : axios.post("/api/coupon", payload);

            const { data } = await request;

            if (data.success) {
                toast.success(data.message);
                resetForm();
                fetchCoupons();
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, ERROR_MESSAGES.saveCoupon));
        } finally {
            setIsSaving(false);
        }
    };

    const editCoupon = (coupon) => {
        setEditingCouponId(coupon._id);
        setForm({
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            minOrder: coupon.minOrder,
            description: coupon.description,
            expiresAt: coupon.expiresAt
                ? new Date(coupon.expiresAt).toISOString().slice(0, 10)
                : "",
            usageLimit: coupon.usageLimit || "",
            isActive: coupon.isActive,
        });
    };

    const deleteCoupon = async (id) => {
        try {
            const { data } = await axios.delete(`/api/coupon/${id}`);
            if (data.success) {
                toast.success(data.message);
                fetchCoupons();
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, ERROR_MESSAGES.deleteCoupon));
        }
    };

    return (
        <div className="no-scrollbar flex-1 overflow-y-auto">
            <div className="space-y-6 p-4 md:p-8">
                <div className="max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                        Promotions
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold text-[#1b2a21]">
                        Coupons
                    </h2>
                    <p className="mt-2 text-base leading-7 text-gray-600">
                        Manage active coupon codes, expiry dates, usage limits, and
                        minimum order rules directly from the dashboard.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                            Total
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-[#1b2a21]">
                            {analytics.total}
                        </p>
                    </div>
                    <div className="rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                            Active
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-green-600">
                            {analytics.active}
                        </p>
                    </div>
                    <div className="rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                            Expired
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-red-500">
                            {analytics.expired}
                        </p>
                    </div>
                    <div className="rounded-[24px] border border-[#e5decd] bg-[#fcfbf7] p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                            Redemptions
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-[#1b2a21]">
                            {analytics.redemptions}
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                    <form
                        onSubmit={handleSubmit}
                        className="rounded-[28px] border border-[#e5decd] bg-white p-5"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-[#1b2a21]">
                                {editingCouponId ? "Edit coupon" : "Create coupon"}
                            </h3>
                            {editingCouponId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="text-sm text-gray-500"
                                >
                                    Reset
                                </button>
                            )}
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <input
                                value={form.code}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        code: event.target.value.toUpperCase(),
                                    }))
                                }
                                placeholder="Coupon code"
                                className="rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none"
                                required
                            />
                            <select
                                value={form.type}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        type: event.target.value,
                                    }))
                                }
                                className="rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none"
                            >
                                <option value="percent">Percent</option>
                                <option value="flat">Flat</option>
                            </select>
                            <input
                                type="number"
                                value={form.value}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        value: event.target.value,
                                    }))
                                }
                                placeholder={
                                    form.type === "percent"
                                        ? "Discount percent"
                                        : `Discount in ${currency}`
                                }
                                className="rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none"
                                required
                            />
                            <input
                                type="number"
                                value={form.minOrder}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        minOrder: event.target.value,
                                    }))
                                }
                                placeholder={`Minimum order in ${currency}`}
                                className="rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none"
                                required
                            />
                            <input
                                type="date"
                                value={form.expiresAt}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        expiresAt: event.target.value,
                                    }))
                                }
                                className="rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none"
                            />
                            <input
                                type="number"
                                value={form.usageLimit}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        usageLimit: event.target.value,
                                    }))
                                }
                                placeholder="Usage limit"
                                className="rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none"
                            />
                            <textarea
                                value={form.description}
                                onChange={(event) =>
                                    setForm((previous) => ({
                                        ...previous,
                                        description: event.target.value,
                                    }))
                                }
                                rows={4}
                                placeholder="Coupon description"
                                className="resize-none rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none md:col-span-2"
                                required
                            />
                            <label className="flex items-center gap-3 md:col-span-2">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(event) =>
                                        setForm((previous) => ({
                                            ...previous,
                                            isActive: event.target.checked,
                                        }))
                                    }
                                />
                                <span className="text-sm text-[#1b2a21]">
                                    Coupon is active
                                </span>
                            </label>
                        </div>

                        <button
                            disabled={isSaving}
                            className={`mt-5 rounded-full px-5 py-3 text-sm font-medium text-white ${
                                isSaving
                                    ? "cursor-not-allowed bg-[#8ca397]"
                                    : "bg-[#1f3a2f]"
                            }`}
                        >
                            {isSaving ? "Saving..." : editingCouponId ? "Save coupon" : "Create coupon"}
                        </button>
                    </form>

                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="rounded-[28px] border border-[#e5decd] bg-white p-6 text-center text-gray-500">
                                Loading coupons...
                            </div>
                        ) : coupons.length === 0 ? (
                            <div className="rounded-[28px] border border-[#e5decd] bg-white p-6 text-center text-gray-500">
                                No coupons created yet.
                            </div>
                        ) : (
                            coupons.map((coupon) => (
                                <div
                                    key={coupon._id}
                                    className="rounded-[28px] border border-[#e5decd] bg-white p-5"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-lg font-semibold text-[#1b2a21]">
                                                {coupon.code}
                                            </p>
                                            <p className="mt-1 text-sm text-gray-600">
                                                {coupon.description}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="rounded-full bg-[#f7f3e8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#1b2a21]">
                                                {coupon.type === "percent"
                                                    ? `${coupon.value}% off`
                                                    : `${currency}${coupon.value} off`}
                                            </span>
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                                                    coupon.isActive
                                                        ? "bg-[#eef4ef] text-[#1f7a42]"
                                                        : "bg-[#fde7e7] text-[#b24040]"
                                                }`}
                                            >
                                                {coupon.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                                                Min order
                                            </p>
                                            <p className="mt-2 text-sm font-medium text-[#1b2a21]">
                                                {currency}
                                                {coupon.minOrder}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                                                Usage
                                            </p>
                                            <p className="mt-2 text-sm font-medium text-[#1b2a21]">
                                                {coupon.usedCount} /{" "}
                                                {coupon.usageLimit || "Unlimited"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                                                Expiry
                                            </p>
                                            <p className="mt-2 text-sm font-medium text-[#1b2a21]">
                                                {coupon.expiresAt
                                                    ? new Date(
                                                          coupon.expiresAt
                                                      ).toLocaleDateString()
                                                    : "No expiry"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                                                Status
                                            </p>
                                            <p className="mt-2 text-sm font-medium text-[#1b2a21]">
                                                {coupon.isExpired
                                                    ? "Expired"
                                                    : coupon.isActive
                                                    ? "Running"
                                                    : "Paused"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5 flex gap-3">
                                        <button
                                            onClick={() => editCoupon(coupon)}
                                            className="rounded-full border border-[#d7ccb4] px-4 py-2 text-sm font-medium text-[#1f3a2f]"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => deleteCoupon(coupon._id)}
                                            className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white"
                                        >
                                            Delete
                                        </button>
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

export default Coupons;
