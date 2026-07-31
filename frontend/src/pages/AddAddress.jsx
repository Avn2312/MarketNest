import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { assets } from "../assets/assets";
import { useAppContext } from "../context/AppContext";
import { getApiErrorMessage } from "../utils/errorMessages";

const inputClassName =
    "w-full rounded-2xl border border-[#d8ceb7] bg-white px-4 py-3 text-sm text-[#1b2a21] outline-none transition placeholder:text-gray-400 focus:border-[#1f3a2f]";

const AddAddress = () => {
    const { axios, navigate, user } = useAppContext();
    const [address, setAddress] = useState({
        firstName: "",
        lastName: "",
        email: "",
        street: "",
        city: "",
        state: "",
        zipcode: "",
        country: "",
        phone: "",
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate("/cart");
            return;
        }

        setAddress((previous) => ({
            ...previous,
            email: previous.email || user.email || "",
            firstName: previous.firstName || user.name?.split(" ")?.[0] || "",
            lastName:
                previous.lastName ||
                user.name?.split(" ")?.slice(1).join(" ") ||
                "",
        }));
    }, [navigate, user]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setAddress((previous) => ({ ...previous, [name]: value }));
    };

    const onSubmitHandler = async (event) => {
        try {
            event.preventDefault();
            setLoading(true);

            const { data } = await axios.post("/api/addresses/add", { address });

            if (data.success) {
                toast.success(data.message);
                navigate("/cart");
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-16 pb-16">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                <section className="overflow-hidden rounded-[34px] border border-[#e6decb] bg-[linear-gradient(135deg,#faf7f1_0%,#f4efe3_55%,#eef4ef_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                        Delivery setup
                    </p>
                    <h1 className="mt-4 text-3xl font-semibold text-[#1b2a21] sm:text-4xl">
                        Add a delivery address for your next order.
                    </h1>
                    <p className="mt-4 text-base leading-7 text-gray-600">
                        Save your shipping details once and reuse them across
                        checkout, recurring grocery runs, and future deliveries.
                    </p>

                    <div className="mt-8 space-y-3">
                        <div className="rounded-[24px] bg-white/75 p-4">
                            <p className="text-sm font-semibold text-[#1b2a21]">
                                Faster checkout
                            </p>
                            <p className="mt-2 text-sm leading-6 text-gray-600">
                                Select saved addresses directly from the cart
                                without retyping details.
                            </p>
                        </div>
                        <div className="rounded-[24px] bg-white/75 p-4">
                            <p className="text-sm font-semibold text-[#1b2a21]">
                                Reliable delivery
                            </p>
                            <p className="mt-2 text-sm leading-6 text-gray-600">
                                Accurate contact and area details help reduce
                                missed calls and delays.
                            </p>
                        </div>
                    </div>

                    <img
                        className="mx-auto mt-8 w-full max-w-sm"
                        src={assets.add_address_iamge}
                        alt="Add address"
                    />
                </section>

                <section className="rounded-[34px] border border-[#e6decb] bg-white p-6 shadow-[0_14px_32px_rgba(15,23,42,0.04)] sm:p-8">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                                Address form
                            </p>
                            <h2 className="mt-3 text-2xl font-semibold text-[#1b2a21]">
                                Shipping details
                            </h2>
                        </div>
                        <button
                            onClick={() => navigate("/cart")}
                            className="rounded-full border border-[#d7ccb4] px-4 py-2 text-sm font-medium text-[#1f3a2f] transition hover:bg-[#f4efe3]"
                        >
                            Back to cart
                        </button>
                    </div>

                    <form
                        className="mt-8 space-y-4"
                        onSubmit={onSubmitHandler}
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <input
                                className={inputClassName}
                                type="text"
                                placeholder="First name"
                                name="firstName"
                                value={address.firstName}
                                onChange={handleChange}
                                required
                            />
                            <input
                                className={inputClassName}
                                type="text"
                                placeholder="Last name"
                                name="lastName"
                                value={address.lastName}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <input
                            className={inputClassName}
                            type="email"
                            placeholder="Email address"
                            name="email"
                            value={address.email}
                            onChange={handleChange}
                            required
                        />

                        <input
                            className={inputClassName}
                            type="text"
                            placeholder="Street address"
                            name="street"
                            value={address.street}
                            onChange={handleChange}
                            required
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <input
                                className={inputClassName}
                                type="text"
                                placeholder="City"
                                name="city"
                                value={address.city}
                                onChange={handleChange}
                                required
                            />
                            <input
                                className={inputClassName}
                                type="text"
                                placeholder="State"
                                name="state"
                                value={address.state}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <input
                                className={inputClassName}
                                type="number"
                                placeholder="Zip code"
                                name="zipcode"
                                value={address.zipcode}
                                onChange={handleChange}
                                required
                            />
                            <input
                                className={inputClassName}
                                type="text"
                                placeholder="Country"
                                name="country"
                                value={address.country}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <input
                            className={inputClassName}
                            type="text"
                            placeholder="Phone number"
                            name="phone"
                            value={address.phone}
                            onChange={handleChange}
                            required
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full rounded-full px-6 py-3 text-sm font-medium text-white transition ${
                                loading
                                    ? "cursor-not-allowed bg-[#8ca397]"
                                    : "bg-[#1f3a2f] hover:bg-[#183025]"
                            }`}
                        >
                            {loading ? "Saving address..." : "Save address"}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default AddAddress;
