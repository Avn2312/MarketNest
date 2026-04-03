import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAppContext } from "../../context/AppContext";
import { assets } from "../../assets/assets";
import {
    ERROR_MESSAGES,
    getApiErrorMessage,
} from "../../utils/errorMessages";

const SellerLogin = () => {
    const { seller, setSeller, setUser, navigate, axios } = useAppContext();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const onSubmitHandler = async (event) => {
        try {
            event.preventDefault();
            setLoading(true);
            const { data } = await axios.post("/api/user/login", {
                email,
                password,
            });

            if (data.success) {
                if (data.user.role === "seller") {
                    setUser(null);
                    setSeller(data.user);
                    navigate("/seller");
                } else {
                    setSeller(null);
                    toast.error(ERROR_MESSAGES.sellerAccessRequired);
                }
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (seller) {
            navigate("/seller");
        }
    }, [seller, navigate]);

    return (
        !seller && (
            <section className="min-h-screen bg-[linear-gradient(180deg,#f7f3e8_0%,#efe8d6_100%)] px-4 py-10 text-sm text-gray-600">
                <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
                    <div className="rounded-[34px] bg-[#1f3a2f] p-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)] md:p-10">
                        <img
                            src={assets.logo}
                            alt="MarketNest"
                            className="h-10 w-auto rounded-2xl bg-white px-3 py-2"
                        />
                        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.28em] text-[#9dd7b8]">
                            Seller dashboard
                        </p>
                        <h1 className="mt-4 max-w-lg text-4xl font-semibold leading-tight">
                            Manage products, stock, and orders from one place.
                        </h1>
                        <p className="mt-4 max-w-xl text-base leading-7 text-white/72">
                            MarketNest seller tools are built for quicker catalog
                            updates, cleaner order handling, and a more reliable
                            store management workflow.
                        </p>
                        <div className="mt-8 grid gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                                <p className="text-2xl font-semibold">Bulk</p>
                                <p className="mt-1 text-sm text-white/60">
                                    product control
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                                <p className="text-2xl font-semibold">Fast</p>
                                <p className="mt-1 text-sm text-white/60">
                                    stock updates
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                                <p className="text-2xl font-semibold">Live</p>
                                <p className="mt-1 text-sm text-white/60">
                                    order tracking
                                </p>
                            </div>
                        </div>
                    </div>

                    <form
                        onSubmit={onSubmitHandler}
                        className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.1)] md:p-8"
                    >
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                            MarketNest seller access
                        </p>
                        <h2 className="mt-3 text-3xl font-semibold text-[#1b2a21]">
                            Seller login
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-gray-500">
                            Sign in to update your catalog and track customer
                            orders.
                        </p>

                        <div className="mt-6 space-y-4">
                            <div>
                                <p className="mb-1.5 font-medium text-[#1b2a21]">
                                    Email
                                </p>
                                <input
                                    onChange={(e) => setEmail(e.target.value)}
                                    value={email}
                                    type="email"
                                    placeholder="Enter your email"
                                    className="w-full rounded-2xl border border-[#ddd5c1] bg-[#fcfbf7] px-4 py-3 outline-none transition focus:border-primary"
                                    required
                                />
                            </div>
                            <div>
                                <p className="mb-1.5 font-medium text-[#1b2a21]">
                                    Password
                                </p>
                                <input
                                    onChange={(e) => setPassword(e.target.value)}
                                    value={password}
                                    type="password"
                                    placeholder="Enter your password"
                                    className="w-full rounded-2xl border border-[#ddd5c1] bg-[#fcfbf7] px-4 py-3 outline-none transition focus:border-primary"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`mt-6 flex w-full items-center justify-center rounded-full bg-[#1f3a2f] px-5 py-3 text-sm font-medium text-white transition ${
                                loading
                                    ? "cursor-not-allowed opacity-50"
                                    : "hover:bg-[#183025]"
                            }`}
                        >
                            {loading ? "Logging in..." : "Login"}
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="mt-4 w-full rounded-full border border-[#d7cfbb] px-5 py-3 text-sm font-medium text-[#2d3d34] transition hover:bg-[#f7f3e8]"
                        >
                            Back to MarketNest
                        </button>
                    </form>
                </div>
            </section>
        )
    );
};

export default SellerLogin;
