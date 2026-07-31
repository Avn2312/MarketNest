import React from "react";

const Contact = () => {
    return (
        <div className="max-w-3xl mx-auto mt-16 mb-20">
            <h1 className="text-3xl font-semibold text-gray-800">Contact Us</h1>
            <p className="mt-4 text-gray-600">
                Have a question about products, orders, or seller support? Reach
                out and the MarketNest team will help you.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="border border-gray-200 rounded-lg p-5">
                    <p className="text-sm text-gray-500">Customer Support</p>
                    <p className="mt-2 text-lg font-medium">support@marketnest.com</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-5">
                    <p className="text-sm text-gray-500">Seller Support</p>
                    <p className="mt-2 text-lg font-medium">seller@marketnest.com</p>
                </div>
            </div>
        </div>
    );
};

export default Contact;
