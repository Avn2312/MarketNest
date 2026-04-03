import React, { useState } from "react";
import toast from "react-hot-toast";
import { useAppContext } from "../context/AppContext";
import { getApiErrorMessage } from "../utils/errorMessages";

const Login = () => {
    const {
        setShowUserLogin,
        setSeller,
        axios,
        navigate,
        redirectPath,
        setRedirectPath,
        fetchUser,
    } = useAppContext();

    const [state, setState] = useState("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const onSubmitHandler = async (event) => {
        try {
            event.preventDefault();
            setLoading(true);
            const payload =
                state === "login"
                    ? { email, password }
                    : { name, email, password };

            const { data } = await axios.post(`/api/user/${state}`, payload);

            if (data.success) {
                toast.success(
                    state === "login"
                        ? "Login successful"
                        : "Registration successful"
                );

                setSeller(null);
                await fetchUser();
                setShowUserLogin(false);
                setEmail("");
                setPassword("");
                setName("");
                navigate(redirectPath || "/");
                setRedirectPath("/");
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            onClick={() => setShowUserLogin(false)}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4 text-sm text-gray-600 backdrop-blur-sm"
        >
            <form
                onSubmit={onSubmitHandler}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[420px] overflow-hidden rounded-[30px] border border-white/60 bg-[#f7f3e8] shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
            >
                <div className="bg-[#1f3a2f] px-6 py-6 text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9dd7b8]">
                        MarketNest account
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold">
                        {state === "login"
                            ? "Welcome back"
                            : "Create your account"}
                    </h2>
                    <p className="mt-2 text-sm text-white/70">
                        {state === "login"
                            ? "Sign in to manage your orders, cart, and deliveries."
                            : "Join MarketNest to start ordering fresh essentials faster."}
                    </p>
                </div>

                <div className="space-y-4 p-6">
                    {state === "register" && (
                        <div>
                            <p className="mb-1.5 font-medium text-[#1b2a21]">Name</p>
                            <input
                                onChange={(e) => setName(e.target.value)}
                                value={name}
                                placeholder="Enter your full name"
                                className="w-full rounded-2xl border border-[#ddd5c1] bg-white px-4 py-3 outline-none transition focus:border-primary"
                                type="text"
                                required
                            />
                        </div>
                    )}
                    <div>
                        <p className="mb-1.5 font-medium text-[#1b2a21]">Email</p>
                        <input
                            onChange={(e) => setEmail(e.target.value)}
                            value={email}
                            placeholder="Enter your email"
                            className="w-full rounded-2xl border border-[#ddd5c1] bg-white px-4 py-3 outline-none transition focus:border-primary"
                            type="email"
                            required
                        />
                    </div>
                    <div>
                        <p className="mb-1.5 font-medium text-[#1b2a21]">Password</p>
                        <input
                            onChange={(e) => setPassword(e.target.value)}
                            value={password}
                            placeholder="Enter your password"
                            className="w-full rounded-2xl border border-[#ddd5c1] bg-white px-4 py-3 outline-none transition focus:border-primary"
                            type="password"
                            required
                        />
                    </div>

                    <p className="text-sm text-gray-500">
                        {state === "register"
                            ? "Already have an account?"
                            : "New to MarketNest?"}{" "}
                        <span
                            onClick={() =>
                                setState((prev) =>
                                    prev === "login" ? "register" : "login"
                                )
                            }
                            className="cursor-pointer font-medium text-[#1f3a2f]"
                        >
                            {state === "register" ? "Sign in" : "Create one"}
                        </span>
                    </p>

                    <button
                        disabled={loading}
                        className={`flex w-full items-center justify-center rounded-full bg-[#1f3a2f] px-5 py-3 text-sm font-medium text-white transition ${
                            loading
                                ? "cursor-not-allowed opacity-50"
                                : "hover:bg-[#183025]"
                        }`}
                    >
                        {loading
                            ? state === "login"
                                ? "Logging in..."
                                : "Creating account..."
                            : state === "login"
                            ? "Login"
                            : "Create Account"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Login;
