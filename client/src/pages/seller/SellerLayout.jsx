import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { assets } from "../../assets/assets";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "../../utils/errorMessages";

const SellerLayout = () => {
    const [logoutLoading, setLogoutLoading] = useState(false);

    const { seller, setSeller, navigate, axios } = useAppContext();

    const sidebarLinks = [
        { name: "Add Product", path: "/seller", icon: assets.add_icon },
        {
            name: "Analytics",
            path: "/seller/analytics",
            icon: assets.refresh_icon,
        },
        {
            name: "Product List",
            path: "/seller/product-list",
            icon: assets.product_list_icon,
        },
        { name: "Orders", path: "/seller/orders", icon: assets.order_icon },
        { name: "Coupons", path: "/seller/coupons", icon: assets.coin_icon },
    ];

    const logout = async () => {
        if (logoutLoading) return;
        setLogoutLoading(true);

        try {
            const { data } = await axios.delete("/api/user/logout");
            if (data.success) {
                toast.success(data.message);
                setSeller(null);
                navigate("/seller");
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setLogoutLoading(false);
        }
    };

    return (
        <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f9f6ed_0%,#f3eddf_100%)]">
            <div className="border-b border-[#e3dbc9] bg-[#f7f3e8]/90 px-4 py-3 backdrop-blur md:px-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                        to="/"
                        className="w-fit rounded-2xl bg-white px-3 py-2 shadow-sm"
                    >
                        <img
                            src={assets.logo}
                            alt="MarketNest"
                            className="h-9 w-auto"
                        />
                    </Link>

                    <div className="flex w-full flex-wrap items-center gap-3 text-sm text-gray-600 sm:w-auto sm:justify-end sm:gap-4">
                        <div className="hidden rounded-full bg-white px-4 py-2 shadow-sm sm:block">
                            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                                Seller
                            </p>
                            <p className="font-medium text-[#1b2a21]">
                                {seller?.name}
                            </p>
                        </div>

                        <button
                            onClick={() => navigate("/")}
                            className="cursor-pointer rounded-full border border-[#d6ccb6] bg-white px-4 py-2 text-[#2d3d34] transition hover:bg-[#efe8d8]"
                        >
                            MarketNest
                        </button>

                        <button
                            onClick={logout}
                            disabled={logoutLoading}
                            className={`cursor-pointer rounded-full bg-[#1f3a2f] px-4 py-2 text-white transition hover:bg-[#183025] ${
                                logoutLoading ? "pointer-events-none opacity-50" : ""
                            }`}
                        >
                            {logoutLoading ? "Logging out..." : "Logout"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 md:px-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="w-full min-w-0 rounded-[28px] border border-[#e4dccb] bg-white/85 p-2 shadow-sm backdrop-blur">
                    <div className="hidden rounded-[22px] bg-[#1f3a2f] p-5 text-white md:block">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9dd7b8]">
                            MarketNest
                        </p>
                        <h2 className="mt-2 text-xl font-semibold">
                            Seller dashboard
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-white/70">
                            Manage catalog, stock, and orders with a cleaner
                            workspace.
                        </p>
                    </div>

                    <nav className="mt-0 flex gap-2 overflow-x-auto pb-1 md:mt-4 md:flex-col md:overflow-visible md:pb-0">
                        {sidebarLinks.map((item) => (
                            <NavLink
                                to={item.path}
                                key={item.name}
                                end={item.path === "/seller"}
                                className={({ isActive }) =>
                                    `flex min-w-[140px] items-center gap-3 rounded-2xl px-3 py-3 transition md:min-w-0 ${
                                        isActive
                                            ? "bg-[#1f3a2f] text-white shadow-sm"
                                            : "text-gray-600 hover:bg-[#f6f2e8]"
                                    }`
                                }
                            >
                                <img src={item.icon} alt="" className="h-6 w-6" />
                                <p className="font-medium">
                                    {item.name}
                                </p>
                            </NavLink>
                        ))}
                    </nav>
                </aside>

                <main className="min-w-0 overflow-hidden rounded-[30px] border border-[#e4dccb] bg-white/85 shadow-sm backdrop-blur">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default SellerLayout;
