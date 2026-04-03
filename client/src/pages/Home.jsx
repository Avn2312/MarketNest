import React, { Suspense, lazy } from "react";
import MainBanner from "../components/MainBanner";

const Categories = lazy(() => import("../components/Categories"));
const BestSeller = lazy(() => import("../components/BestSeller"));
const BottomBanner = lazy(() => import("../components/BottomBanner"));
const NewsLetter = lazy(() => import("../components/NewsLetter"));

const SectionPlaceholder = ({ className = "" }) => (
    <div
        className={`rounded-[32px] border border-[#e8e1cf] bg-[#f7f3e8]/70 ${className}`}
    />
);

const Home = () => {
    return (
        <div className="mt-6 space-y-14 pb-4 md:mt-8 md:space-y-18">
            <MainBanner />
            <Suspense fallback={<SectionPlaceholder className="min-h-[280px]" />}>
                <Categories />
            </Suspense>
            <Suspense fallback={<SectionPlaceholder className="min-h-[640px]" />}>
                <BestSeller />
            </Suspense>
            <Suspense fallback={<SectionPlaceholder className="min-h-[420px]" />}>
                <BottomBanner />
            </Suspense>
            <Suspense fallback={<SectionPlaceholder className="min-h-[220px]" />}>
                <NewsLetter />
            </Suspense>
        </div>
    );
};

export default Home;
