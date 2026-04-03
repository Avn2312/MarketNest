import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { assets } from "./../assets/assets";
import { useAppContext } from "./../context/AppContext";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "../utils/errorMessages";

const Navbar = () => {
    const location = useLocation();
    const navItems = [
        { label: "Home", to: "/" },
        { label: "Shop", to: "/products" },
        { label: "Contact", to: "/contact" },
        { label: "Seller", to: "/seller" },
    ];

    const [logoutLoading, setLogoutLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const {
        user,
        setUser,
        setShowUserLogin,
        showUserLogin,
        setRedirectPath,
        navigate,
        searchQuery,
        setSearchQuery,
        getCartCount,
        axios,
    } = useAppContext();

    const logout = async () => {
        if (logoutLoading) return;
        setLogoutLoading(true);

        try {
            const { data } = await axios.delete("/api/user/logout");

            if (data.success) {
                toast.success(data.message);
                setUser(null);
                navigate("/");
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setLogoutLoading(false);
        }
    };

    useEffect(() => {
        if (searchQuery.trim().length > 0) {
            navigate("/products");
        }
    }, [navigate, searchQuery]);

    useEffect(() => {
        setOpen(false);
    }, [location.pathname]);

    const linkClassName = ({ isActive }) => {
        if (showUserLogin) {
            return "rounded-full px-4 py-2 text-sm font-medium text-gray-500";
        }

        return `rounded-full px-4 py-2 text-sm font-medium transition ${
            isActive
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:bg-white/70 hover:text-gray-900"
        }`;
    };

    return (
        <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6 md:px-10 lg:px-16 xl:px-24">
            <nav className="relative rounded-[28px] border border-white/60 bg-[#f7f5ed]/95 px-4 py-3 shadow-[0_18px_45px_rgba(30,41,59,0.08)] backdrop-blur md:px-5 lg:px-6">
                <div className="flex items-center justify-between gap-4">
                    <NavLink
                        to="/"
                        className={`flex shrink-0 items-center rounded-2xl bg-white px-3 py-2 shadow-sm transition ${
                            showUserLogin ? "pointer-events-none opacity-80" : ""
                        }`}
                    >
                        <img
                            className="h-11 w-auto max-w-[220px] sm:h-12 sm:max-w-[230px] lg:h-[52px] lg:max-w-[244px]"
                            src={assets.logo}
                            alt="MarketNest"
                        />
                    </NavLink>

                    <div
                        className={`hidden lg:flex items-center rounded-full bg-[#ebe7d8] p-1 ${
                            showUserLogin ? "pointer-events-none opacity-75" : ""
                        }`}
                    >
                        {navItems.map((item) => (
                            <NavLink key={item.to} to={item.to} className={linkClassName}>
                                {item.label}
                            </NavLink>
                        ))}
                        {user && (
                            <NavLink to="/my-orders" className={linkClassName}>
                                Orders
                            </NavLink>
                        )}
                    </div>

                    <div
                        className={`hidden md:flex items-center gap-2.5 lg:gap-3 ${
                            showUserLogin ? "pointer-events-none opacity-75" : ""
                        }`}
                    >
                        <div className="hidden xl:flex min-w-[260px] items-center gap-2 rounded-full border border-[#ded7c4] bg-white px-4 py-2 text-sm">
                            <img
                                src={assets.search_icon}
                                alt="search"
                                className="h-4 w-4 opacity-60"
                            />
                            <input
                                onChange={(e) => setSearchQuery(e.target.value)}
                                value={searchQuery}
                                className="w-full bg-transparent outline-none placeholder:text-gray-400"
                                type="text"
                                placeholder="Search fruits, dairy, snacks"
                            />
                        </div>

                        <button
                            onClick={() => navigate("/cart")}
                            className="relative rounded-full border border-[#ded7c4] bg-white p-3 transition hover:-translate-y-0.5"
                            aria-label="Cart"
                        >
                            <img
                                src={assets.nav_cart_icon}
                                alt="cart"
                                className="w-5 opacity-80"
                            />
                            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white">
                                {getCartCount()}
                            </span>
                        </button>

                        {!user ? (
                            <button
                                onClick={() => {
                                    setRedirectPath(location.pathname);
                                    setShowUserLogin(true);
                                }}
                                className="cursor-pointer rounded-full bg-[#1f3a2f] px-4.5 py-3 text-sm font-medium text-white transition hover:bg-[#183025]"
                            >
                                Login
                            </button>
                        ) : (
                            <div className="group relative cursor-pointer">
                                <div className="flex items-center gap-3 rounded-full border border-[#ded7c4] bg-white py-1.5 pl-1.5 pr-3.5">
                                    <img
                                        src={assets.profile_icon}
                                        className="w-9 rounded-full"
                                        alt="profile"
                                    />
                                    <div className="text-left leading-tight">
                                        <p className="text-sm font-medium text-gray-800">
                                            Account
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Manage profile
                                        </p>
                                    </div>
                                </div>
                                <ul className="invisible absolute right-0 top-14 z-40 w-40 rounded-2xl border border-[#e7e1cf] bg-white py-2 text-sm opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                                    <li
                                        onClick={() => navigate("/my-orders")}
                                        className="cursor-pointer px-4 py-2 hover:bg-primary/10"
                                    >
                                        My Orders
                                    </li>
                                    <li
                                        onClick={logout}
                                        className={`cursor-pointer px-4 py-2 hover:bg-primary/10 ${
                                            logoutLoading
                                                ? "pointer-events-none opacity-50"
                                                : ""
                                        }`}
                                    >
                                        {logoutLoading ? "Logging out..." : "Logout"}
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>

                    <div
                        className={`flex items-center gap-2 md:hidden ${
                            showUserLogin ? "pointer-events-none opacity-75" : ""
                        }`}
                    >
                        <button
                            onClick={() => navigate("/cart")}
                            className="relative rounded-full border border-[#ded7c4] bg-white p-2.5"
                            aria-label="Cart"
                        >
                            <img
                                src={assets.nav_cart_icon}
                                alt="cart"
                                className="w-5 opacity-80"
                            />
                            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white">
                                {getCartCount()}
                            </span>
                        </button>
                        <button
                            onClick={() => setOpen((prev) => !prev)}
                            aria-label="Menu"
                            className="rounded-full border border-[#ded7c4] bg-white p-2.5"
                        >
                            <img src={assets.menu_icon} alt="menu" className="w-5" />
                        </button>
                    </div>
                </div>

                {open && (
                    <div className="mt-4 rounded-[24px] border border-[#e7e1cf] bg-white p-4 shadow-sm md:hidden">
                        <div className="mb-4 flex items-center gap-2 rounded-full border border-[#ded7c4] px-4 py-3 text-sm">
                            <img
                                src={assets.search_icon}
                                alt="search"
                                className="h-4 w-4 opacity-60"
                            />
                            <input
                                onChange={(e) => setSearchQuery(e.target.value)}
                                value={searchQuery}
                                className="w-full bg-transparent outline-none placeholder:text-gray-400"
                                type="text"
                                placeholder="Search groceries"
                            />
                        </div>

                        <div className="flex flex-col gap-2 text-sm">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className="rounded-2xl px-4 py-3 font-medium text-gray-700 transition hover:bg-[#f6f3ea]"
                                >
                                    {item.label}
                                </NavLink>
                            ))}
                            {user && (
                                <NavLink
                                    to="/my-orders"
                                    className="rounded-2xl px-4 py-3 font-medium text-gray-700 transition hover:bg-[#f6f3ea]"
                                >
                                    My Orders
                                </NavLink>
                            )}
                        </div>

                        <div className="mt-4">
                            {!user ? (
                                <button
                                    onClick={() => {
                                        setRedirectPath(location.pathname);
                                        setOpen(false);
                                        setShowUserLogin(true);
                                    }}
                                    className="w-full rounded-full bg-[#1f3a2f] px-5 py-3 text-sm font-medium text-white"
                                >
                                    Login
                                </button>
                            ) : (
                                <button
                                    onClick={logout}
                                    disabled={logoutLoading}
                                    className={`w-full rounded-full bg-[#1f3a2f] px-5 py-3 text-sm font-medium text-white ${
                                        logoutLoading
                                            ? "pointer-events-none opacity-50"
                                            : ""
                                    }`}
                                >
                                    {logoutLoading ? "Logging out..." : "Logout"}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
};

export default Navbar;
