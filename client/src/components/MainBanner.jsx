import React from "react";
import { Link } from "react-router-dom";
import { assets } from "../assets/assets";

const MainBanner = () => {
    const highlights = [
        "Local farm produce picked daily",
        "Same-day delivery slots",
        "Offers across pantry staples",
    ];

    return (
        <section className="relative overflow-hidden rounded-[36px] bg-[#f4efe3] px-5 py-8 sm:px-8 md:px-10 lg:px-14 lg:py-10">
            <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(79,191,139,0.28),_transparent_55%)] lg:block" />
            <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.82fr] xl:grid-cols-[1.08fr_0.78fr]">
                <div className="relative z-10 max-w-2xl">
                    <span className="inline-flex rounded-full border border-[#d5ccb5] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-[#1f3a2f]">
                        Groceries, reimagined
                    </span>
                    <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight text-[#1b2a21] sm:text-5xl lg:text-6xl">
                        A fresher, calmer way to shop for every kitchen.
                    </h1>
                    <p className="mt-5 max-w-lg text-base leading-7 text-gray-600 sm:text-lg">
                        Stock up on produce, dairy, baked goods, and everyday
                        essentials with MarketNest, designed around speed,
                        trust, and better weekly deals.
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        {highlights.map((item) => (
                            <div
                                key={item}
                                className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm text-gray-700 shadow-sm backdrop-blur"
                            >
                                {item}
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Link
                            to={"/products"}
                            className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#1f3a2f] px-7 py-3.5 text-sm font-medium text-white transition hover:bg-[#183025]"
                        >
                            Shop collection
                            <img
                                className="transition group-hover:translate-x-1"
                                src={assets.white_arrow_icon}
                                alt="arrow"
                                loading="eager"
                                decoding="async"
                            />
                        </Link>
                        <Link
                            to={"/contact"}
                            className="inline-flex items-center justify-center rounded-full border border-[#cfc4a8] px-7 py-3.5 text-sm font-medium text-[#2d3d34] transition hover:bg-white/70"
                        >
                            Plan weekly delivery
                        </Link>
                    </div>

                    <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-md">
                        <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                            <p className="text-2xl font-semibold text-[#1b2a21]">
                                30 min
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                                express delivery
                            </p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                            <p className="text-2xl font-semibold text-[#1b2a21]">
                                1200+
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                                curated products
                            </p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                            <p className="text-2xl font-semibold text-[#1b2a21]">
                                4.9/5
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                                customer rating
                            </p>
                        </div>
                    </div>
                </div>

                <div className="relative lg:ml-auto lg:w-full lg:max-w-[500px] xl:max-w-[540px]">
                    <div className="overflow-hidden rounded-[32px] border border-white/60 bg-white/60 shadow-[0_20px_45px_rgba(148,163,184,0.18)] backdrop-blur">
                        <img
                            src={assets.main_banner_bg}
                            alt="Fresh groceries display"
                            className="hidden h-[420px] w-full object-cover md:block lg:h-[500px]"
                            fetchPriority="high"
                            loading="eager"
                            decoding="async"
                        />
                        <img
                            src={assets.main_banner_bg_sm}
                            alt="Fresh groceries display"
                            className="h-full max-h-[420px] w-full object-cover md:hidden"
                            fetchPriority="high"
                            loading="eager"
                            decoding="async"
                        />
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 rounded-[24px] bg-[#1f3a2f] px-5 py-4 text-white shadow-xl sm:left-auto sm:right-4 sm:max-w-[240px]">
                        <p className="text-xs uppercase tracking-[0.24em] text-white/70">
                            Weekly savings
                        </p>
                        <p className="mt-2 text-2xl font-semibold">Up to 25% off</p>
                        <p className="mt-1 text-sm text-white/75">
                            Produce, bakery, drinks, and more this week.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default MainBanner;
