import React from "react";
import { Link } from "react-router-dom";
import { features } from "./../assets/assets";

const BottomBanner = () => {
    return (
        <section className="rounded-[36px] bg-[#f7f3e8] px-5 py-8 sm:px-8 md:px-10 lg:px-14 lg:py-12">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                <div>
                    <span className="inline-flex rounded-full border border-[#d8cfba] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#1f3a2f]">
                        Built for better weekly shopping
                    </span>
                    <h2 className="mt-5 max-w-md text-3xl font-semibold leading-tight text-[#1b2a21] sm:text-4xl">
                        Everything your home needs, delivered fresh and fast.
                    </h2>
                    <p className="mt-4 max-w-lg text-base leading-7 text-gray-600">
                        From farm-fresh produce to pantry essentials, MarketNest
                        helps you shop with confidence through reliable delivery,
                        honest pricing, and quality you can count on every day.
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-4 sm:max-w-md">
                        <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                            <p className="text-2xl font-semibold text-[#1b2a21]">
                                30 min
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                                express slots available
                            </p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                            <p className="text-2xl font-semibold text-[#1b2a21]">
                                10k+
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                                regular customers
                            </p>
                        </div>
                    </div>

                    <div className="mt-6">
                        <Link
                            to="/products"
                            className="inline-flex items-center justify-center rounded-full bg-[#1f3a2f] px-7 py-3.5 text-sm font-medium text-white transition hover:bg-[#183025]"
                        >
                            Explore products
                        </Link>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {features.map((feature) => (
                        <div
                            key={feature.title}
                            className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur"
                        >
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4fbf8b]/12">
                                <img
                                    src={feature.icon}
                                    alt={feature.title}
                                    className="h-9 w-9"
                                    loading="lazy"
                                    decoding="async"
                                />
                            </div>
                            <h3 className="mt-5 text-xl font-semibold text-[#1b2a21]">
                                {feature.title}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-gray-600">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default BottomBanner;
