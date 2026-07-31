import React, { useState } from "react";
import { assets, categories } from "../../assets/assets";
import { useAppContext } from "./../../context/AppContext";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "../../utils/errorMessages";

const AddProduct = () => {
    const { axios } = useAppContext();

    const [files, setFiles] = useState([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [price, setPrice] = useState("");
    const [offerPrice, setOfferPrice] = useState("");
    const [stockQuantity, setStockQuantity] = useState("24");
    const [loading, setLoading] = useState(false);

    const onSubmitHandler = async (event) => {
        try {
            event.preventDefault();
            setLoading(true);

            const productData = {
                name,
                description: description.split("\n"),
                category,
                price,
                offerPrice,
                stockQuantity,
            };

            const formData = new FormData();
            formData.append("productData", JSON.stringify(productData));

            for (let i = 0; i < files.length; i++) {
                formData.append("images", files[i]);
            }

            const { data } = await axios.post("/api/products/add", formData);

            if (data.success) {
                toast.success(data.message);
                setName("");
                setDescription("");
                setCategory("");
                setPrice("");
                setOfferPrice("");
                setStockQuantity("24");
                setFiles([]);
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="no-scrollbar flex-1 overflow-y-auto">
            <form
                onSubmit={onSubmitHandler}
                className="max-w-3xl space-y-6 p-4 md:p-8"
            >
                <div className="max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                        Seller tools
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold text-[#1b2a21]">
                        Add a new product
                    </h1>
                    <p className="mt-2 text-base leading-7 text-gray-600">
                        Upload images, set pricing, and publish products to your
                        MarketNest.
                    </p>
                </div>

                <div className="rounded-[28px] border border-[#e5decd] bg-[#fcfbf7] p-5">
                    <p className="text-base font-medium text-[#1b2a21]">
                        Product Images
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                        {Array(4)
                            .fill("")
                            .map((_, index) => (
                                <label key={index} htmlFor={`image${index}`}>
                                    <input
                                        onChange={(e) => {
                                            const updatedFiles = [...files];
                                            updatedFiles[index] =
                                                e.target.files[0];
                                            setFiles(updatedFiles);
                                        }}
                                        accept="image/*"
                                        type="file"
                                        id={`image${index}`}
                                        hidden
                                    />
                                    <img
                                        className="max-w-24 rounded-2xl border border-[#e5decd] bg-white p-1 cursor-pointer"
                                        src={
                                            files[index]
                                                ? URL.createObjectURL(
                                                      files[index]
                                                  )
                                                : assets.upload_area
                                        }
                                        alt="uploadArea"
                                        width={100}
                                        height={100}
                                    />
                                </label>
                            ))}
                    </div>
                </div>

                <div className="grid gap-5 rounded-[28px] border border-[#e5decd] bg-white p-5 md:grid-cols-2">
                    <div className="flex flex-col gap-1 md:col-span-2">
                        <label
                            className="text-base font-medium text-[#1b2a21]"
                            htmlFor="product-name"
                        >
                            Product Name
                        </label>
                        <input
                            onChange={(e) => setName(e.target.value)}
                            value={name}
                            id="product-name"
                            type="text"
                            placeholder="Type here"
                            className="rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none"
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-1 md:col-span-2">
                        <label
                            className="text-base font-medium text-[#1b2a21]"
                            htmlFor="product-description"
                        >
                            Product Description
                        </label>
                        <textarea
                            onChange={(e) => setDescription(e.target.value)}
                            value={description}
                            id="product-description"
                            rows={4}
                            className="resize-none rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none"
                            placeholder="Type here"
                        ></textarea>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label
                            className="text-base font-medium text-[#1b2a21]"
                            htmlFor="category"
                        >
                            Category
                        </label>
                        <select
                            onChange={(e) => setCategory(e.target.value)}
                            value={category}
                            id="category"
                            className="rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none"
                        >
                            <option value="">Select Category</option>
                            {categories.map((item, index) => (
                                <option key={index} value={item.path}>
                                    {item.path}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label
                            className="text-base font-medium text-[#1b2a21]"
                            htmlFor="product-price"
                        >
                            Product Price
                        </label>
                        <input
                            onChange={(e) => setPrice(e.target.value)}
                            value={price}
                            id="product-price"
                            type="number"
                            placeholder="0"
                            className="rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none"
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label
                            className="text-base font-medium text-[#1b2a21]"
                            htmlFor="offer-price"
                        >
                            Offer Price
                        </label>
                        <input
                            onChange={(e) => setOfferPrice(e.target.value)}
                            value={offerPrice}
                            id="offer-price"
                            type="number"
                            placeholder="0"
                            className="rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none"
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label
                            className="text-base font-medium text-[#1b2a21]"
                            htmlFor="stock-quantity"
                        >
                            Stock Quantity
                        </label>
                        <input
                            onChange={(e) => setStockQuantity(e.target.value)}
                            value={stockQuantity}
                            id="stock-quantity"
                            type="number"
                            min="0"
                            placeholder="24"
                            className="rounded-2xl border border-[#ddd5c1] px-4 py-3 outline-none"
                            required
                        />
                    </div>
                </div>
                <button
                    className={`rounded-full bg-[#1f3a2f] px-8 py-3 text-sm font-medium text-white cursor-pointer ${
                        loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    disabled={loading}
                >
                    {loading ? "Adding..." : "Add Product"}
                </button>
            </form>
        </div>
    );
};

export default AddProduct;
