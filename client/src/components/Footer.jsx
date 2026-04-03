import { assets, footerLinks } from "../assets/assets";

const Footer = () => {
    return (
        <footer className="mt-24 px-6 pb-8 md:px-16 lg:px-24 xl:px-32">
            <div className="overflow-hidden rounded-[36px] bg-[#1d3128] text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
                <div className="grid gap-10 px-6 py-10 md:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-14 lg:py-14">
                    <div>
                        <div className="inline-flex rounded-2xl bg-white px-3 py-2">
                            <img className="w-32" src={assets.logo} alt="logo" />
                        </div>
                        <p className="mt-6 max-w-xl text-base leading-7 text-white/72">
                            MarketNest brings a more premium grocery experience to
                            daily essentials: fresher produce, more organized
                            browsing, and dependable delivery windows that fit
                            real schedules.
                        </p>
                        <div className="mt-8 grid gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                                <p className="text-2xl font-semibold">10k+</p>
                                <p className="mt-1 text-sm text-white/60">
                                    happy households
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                                <p className="text-2xl font-semibold">7 days</p>
                                <p className="mt-1 text-sm text-white/60">
                                    delivery coverage
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                                <p className="text-2xl font-semibold">Fresh</p>
                                <p className="mt-1 text-sm text-white/60">
                                    quality guarantee
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {footerLinks.map((section) => (
                            <div key={section.title}>
                                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9dd7b8]">
                                    {section.title}
                                </h3>
                                <ul className="mt-4 space-y-3 text-sm text-white/72">
                                    {section.links.map((link) => (
                                        <li key={link.text}>
                                            <a
                                                href={link.url}
                                                className="transition hover:text-white"
                                            >
                                                {link.text}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-4 border-t border-white/10 px-6 py-5 text-sm text-white/65 md:flex-row md:items-center md:justify-between md:px-10 lg:px-14">
                    <p>
                        Copyright {new Date().getFullYear()} MarketNest. All rights
                        reserved.
                    </p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <a href="#" className="transition hover:text-white">
                            Privacy Policy
                        </a>
                        <a href="#" className="transition hover:text-white">
                            Terms of Service
                        </a>
                        <a href="#" className="transition hover:text-white">
                            Support
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
