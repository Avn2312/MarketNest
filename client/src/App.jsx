import React, { Suspense, lazy } from "react";
import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Footer from "./components/Footer";
import { useAppContext } from "./context/AppContext";
import Loading from "./components/Loading";
import Loader from "./components/Loader";
import NotFoundPage from "./pages/NotFoundPage";

const Login = lazy(() => import("./components/Login"));
const AllProducts = lazy(() => import("./pages/AllProducts"));
const ProductCategory = lazy(() => import("./pages/ProductCategory"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Cart = lazy(() => import("./pages/Cart"));
const AddAddress = lazy(() => import("./pages/AddAddress"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const SellerLogin = lazy(() => import("./components/seller/SellerLogin"));
const SellerLayout = lazy(() => import("./pages/seller/SellerLayout"));
const AddProduct = lazy(() => import("./pages/seller/AddProduct"));
const Analytics = lazy(() => import("./pages/seller/Analytics"));
const ProductList = lazy(() => import("./pages/seller/ProductList"));
const Orders = lazy(() => import("./pages/seller/Orders"));
const Coupons = lazy(() => import("./pages/seller/Coupons"));
const Contact = lazy(() => import("./pages/Contact"));

const RouteFallback = () => (
    <div className="flex min-h-[40vh] items-center justify-center">
        <Loader />
    </div>
);

const App = () => {
    const isSellerPath = useLocation().pathname.includes("seller");
    const { showUserLogin, seller, isAuthResolved } = useAppContext();

    return (
        <div className="text-default min-h-screen text-gray-700 bg-white">
            {isSellerPath ? null : <Navbar />}
            {showUserLogin ? (
                <Suspense fallback={null}>
                    <Login />
                </Suspense>
            ) : null}

            <Toaster />

            <div
                className={`${
                    isSellerPath ? "" : "px-6 md:px-16 lg:px-24 xl:px-32"
                }`}
            >
                <Suspense fallback={<RouteFallback />}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/products" element={<AllProducts />} />
                        <Route
                            path="/products/:category"
                            element={<ProductCategory />}
                        />
                        <Route
                            path="/products/:category/:id"
                            element={<ProductDetails />}
                        />
                        <Route path="/cart" element={<Cart />} />
                        <Route path="/add-address" element={<AddAddress />} />
                        <Route path="/my-orders" element={<MyOrders />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/loader" element={<Loading />} />
                        <Route
                            path="/seller"
                            element={
                                !isAuthResolved ? (
                                    <RouteFallback />
                                ) : seller?.role === "seller" ? (
                                    <SellerLayout />
                                ) : (
                                    <Navigate to="/seller-login" />
                                )
                            }
                        >
                            <Route index element={<AddProduct />} />
                            <Route path="analytics" element={<Analytics />} />
                            <Route
                                path="product-list"
                                element={<ProductList />}
                            />
                            <Route path="orders" element={<Orders />} />
                            <Route path="coupons" element={<Coupons />} />
                        </Route>
                        <Route path="/seller-login" element={<SellerLogin />} />
                        <Route path="/*" element={<NotFoundPage />} />
                    </Routes>
                </Suspense>
            </div>
            {!isSellerPath && <Footer />}
        </div>
    );
};

export default App;
