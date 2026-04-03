import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import Product from "../models/Product.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.resolve(__dirname, "../../client/src/assets");

const seedProducts = [
    {
        name: "Potato 500g",
        category: "Vegetables",
        price: 25,
        offerPrice: 20,
        imageFile: "potato_image_1.png",
        description: [
            "Fresh and organic",
            "Rich in carbohydrates",
            "Ideal for curries and fries",
        ],
        inStock: true,
    },
    {
        name: "Tomato 1 kg",
        category: "Vegetables",
        price: 40,
        offerPrice: 35,
        imageFile: "tomato_image.png",
        description: [
            "Juicy and ripe",
            "Rich in Vitamin C",
            "Perfect for salads and sauces",
        ],
        inStock: true,
    },
    {
        name: "Carrot 500g",
        category: "Vegetables",
        price: 30,
        offerPrice: 28,
        imageFile: "carrot_image.png",
        description: [
            "Sweet and crunchy",
            "Good for eyesight",
            "Ideal for juices and salads",
        ],
        inStock: true,
    },
    {
        name: "Spinach 500g",
        category: "Vegetables",
        price: 18,
        offerPrice: 15,
        imageFile: "spinach_image_1.png",
        description: [
            "Rich in iron",
            "High in vitamins",
            "Perfect for soups and salads",
        ],
        inStock: true,
    },
    {
        name: "Onion 500g",
        category: "Vegetables",
        price: 22,
        offerPrice: 19,
        imageFile: "onion_image_1.png",
        description: [
            "Fresh and pungent",
            "Perfect for cooking",
            "A kitchen staple",
        ],
        inStock: true,
    },
    {
        name: "Apple 1 kg",
        category: "Fruits",
        price: 120,
        offerPrice: 110,
        imageFile: "apple_image.png",
        description: [
            "Crisp and juicy",
            "Rich in fiber",
            "Perfect for snacking and desserts",
        ],
        inStock: true,
    },
    {
        name: "Orange 1 kg",
        category: "Fruits",
        price: 80,
        offerPrice: 75,
        imageFile: "orange_image.png",
        description: [
            "Juicy and sweet",
            "Rich in Vitamin C",
            "Perfect for juices and salads",
        ],
        inStock: true,
    },
    {
        name: "Banana 1 kg",
        category: "Fruits",
        price: 50,
        offerPrice: 45,
        imageFile: "banana_image_1.png",
        description: [
            "Sweet and ripe",
            "High in potassium",
            "Great for smoothies and snacking",
        ],
        inStock: true,
    },
    {
        name: "Mango 1 kg",
        category: "Fruits",
        price: 150,
        offerPrice: 140,
        imageFile: "mango_image_1.png",
        description: [
            "Sweet and flavorful",
            "Perfect for smoothies and desserts",
            "Rich in Vitamin A",
        ],
        inStock: true,
    },
    {
        name: "Grapes 500g",
        category: "Fruits",
        price: 70,
        offerPrice: 65,
        imageFile: "grapes_image_1.png",
        description: [
            "Fresh and juicy",
            "Rich in antioxidants",
            "Perfect for snacking and fruit salads",
        ],
        inStock: true,
    },
    {
        name: "Amul Milk 1L",
        category: "Dairy",
        price: 60,
        offerPrice: 55,
        imageFile: "amul_milk_image.png",
        description: [
            "Pure and fresh",
            "Rich in calcium",
            "Ideal for tea, coffee, and desserts",
        ],
        inStock: true,
    },
    {
        name: "Paneer 200g",
        category: "Dairy",
        price: 90,
        offerPrice: 85,
        imageFile: "paneer_image.png",
        description: [
            "Soft and fresh",
            "Rich in protein",
            "Ideal for curries and snacks",
        ],
        inStock: true,
    },
    {
        name: "Farm Eggs 12 pcs",
        category: "Dairy",
        price: 90,
        offerPrice: 85,
        imageFile: "eggs_image.png",
        description: [
            "Farm fresh",
            "Rich in protein",
            "Ideal for breakfast and baking",
        ],
        inStock: true,
    },
    {
        name: "Fresh Paneer Premium 200g",
        category: "Dairy",
        price: 92,
        offerPrice: 86,
        imageFile: "paneer_image_2.png",
        description: [
            "Soft and creamy texture",
            "Protein-rich daily staple",
            "Great for curries and grilling",
        ],
        inStock: true,
    },
    {
        name: "Cheese 200g",
        category: "Dairy",
        price: 140,
        offerPrice: 130,
        imageFile: "cheese_image.png",
        description: [
            "Creamy and delicious",
            "Perfect for sandwiches and pizzas",
            "Rich in calcium",
        ],
        inStock: true,
    },
    {
        name: "Coca-Cola 1.5L",
        category: "Drinks",
        price: 80,
        offerPrice: 75,
        imageFile: "coca_cola_image.png",
        description: [
            "Refreshing and fizzy",
            "Perfect for parties and gatherings",
            "Best served chilled",
        ],
        inStock: true,
    },
    {
        name: "Pepsi 1.5L",
        category: "Drinks",
        price: 78,
        offerPrice: 73,
        imageFile: "pepsi_image.png",
        description: [
            "Chilled and refreshing",
            "Perfect for celebrations",
            "Best served cold",
        ],
        inStock: true,
    },
    {
        name: "Sprite 1.5L",
        category: "Drinks",
        price: 79,
        offerPrice: 74,
        imageFile: "sprite_image_1.png",
        description: [
            "Refreshing citrus taste",
            "Perfect for hot days",
            "Best served chilled",
        ],
        inStock: true,
    },
    {
        name: "Fanta 1.5L",
        category: "Drinks",
        price: 77,
        offerPrice: 72,
        imageFile: "fanta_image_1.png",
        description: [
            "Sweet and fizzy",
            "Great for parties and gatherings",
            "Best served cold",
        ],
        inStock: true,
    },
    {
        name: "7 Up 1.5L",
        category: "Drinks",
        price: 76,
        offerPrice: 71,
        imageFile: "seven_up_image_1.png",
        description: [
            "Refreshing lemon-lime flavor",
            "Perfect for summer refreshment",
            "Best served chilled",
        ],
        inStock: true,
    },
    {
        name: "Basmati Rice 5kg",
        category: "Grains",
        price: 550,
        offerPrice: 520,
        imageFile: "basmati_rice_image.png",
        description: [
            "Long grain and aromatic",
            "Perfect for biryani and pulao",
            "Premium quality",
        ],
        inStock: true,
    },
    {
        name: "Wheat Flour 5kg",
        category: "Grains",
        price: 250,
        offerPrice: 230,
        imageFile: "wheat_flour_image.png",
        description: [
            "High-quality whole wheat",
            "Soft and fluffy rotis",
            "Rich in nutrients",
        ],
        inStock: true,
    },
    {
        name: "Organic Quinoa 500g",
        category: "Grains",
        price: 450,
        offerPrice: 420,
        imageFile: "quinoa_image.png",
        description: [
            "High in protein and fiber",
            "Gluten-free",
            "Rich in vitamins and minerals",
        ],
        inStock: true,
    },
    {
        name: "Brown Rice 1kg",
        category: "Grains",
        price: 120,
        offerPrice: 110,
        imageFile: "brown_rice_image.png",
        description: [
            "Whole grain and nutritious",
            "Helps in weight management",
            "Good source of magnesium",
        ],
        inStock: true,
    },
    {
        name: "Barley 1kg",
        category: "Grains",
        price: 150,
        offerPrice: 140,
        imageFile: "barley_image.png",
        description: [
            "Rich in fiber",
            "Helps improve digestion",
            "Low in fat and cholesterol",
        ],
        inStock: true,
    },
    {
        name: "Brown Bread 400g",
        category: "Bakery",
        price: 40,
        offerPrice: 35,
        imageFile: "brown_bread_image.png",
        description: [
            "Soft and healthy",
            "Made from whole wheat",
            "Ideal for breakfast and sandwiches",
        ],
        inStock: true,
    },
    {
        name: "Butter Croissant 100g",
        category: "Bakery",
        price: 50,
        offerPrice: 45,
        imageFile: "butter_croissant_image.png",
        description: [
            "Flaky and buttery",
            "Freshly baked",
            "Perfect for breakfast or snacks",
        ],
        inStock: true,
    },
    {
        name: "Chocolate Cake 500g",
        category: "Bakery",
        price: 350,
        offerPrice: 325,
        imageFile: "chocolate_cake_image.png",
        description: [
            "Rich and moist",
            "Made with premium cocoa",
            "Ideal for celebrations and parties",
        ],
        inStock: true,
    },
    {
        name: "Whole Wheat Bread 400g",
        category: "Bakery",
        price: 45,
        offerPrice: 40,
        imageFile: "whole_wheat_bread_image.png",
        description: [
            "Healthy and nutritious",
            "Made with whole wheat flour",
            "Ideal for sandwiches and toast",
        ],
        inStock: true,
    },
    {
        name: "Vanilla Muffins 6 pcs",
        category: "Bakery",
        price: 100,
        offerPrice: 90,
        imageFile: "vanilla_muffins_image.png",
        description: [
            "Soft and fluffy",
            "Perfect for a quick snack",
            "Made with real vanilla",
        ],
        inStock: true,
    },
    {
        name: "Maggi Noodles 280g",
        category: "Instant",
        price: 55,
        offerPrice: 50,
        imageFile: "maggi_image.png",
        description: [
            "Instant and easy to cook",
            "Delicious taste",
            "Popular among kids and adults",
        ],
        inStock: true,
    },
    {
        name: "Top Ramen 270g",
        category: "Instant",
        price: 45,
        offerPrice: 40,
        imageFile: "top_ramen_image.png",
        description: [
            "Quick and easy to prepare",
            "Spicy and flavorful",
            "Loved by college students and families",
        ],
        inStock: true,
    },
    {
        name: "Knorr Cup Soup 70g",
        category: "Instant",
        price: 35,
        offerPrice: 30,
        imageFile: "knorr_soup_image.png",
        description: [
            "Convenient for on-the-go",
            "Healthy and nutritious",
            "Variety of flavors",
        ],
        inStock: true,
    },
    {
        name: "Yippee Noodles 260g",
        category: "Instant",
        price: 50,
        offerPrice: 45,
        imageFile: "yippee_image.png",
        description: [
            "Non-fried noodles for a healthier choice",
            "Tasty and filling",
            "Convenient for busy schedules",
        ],
        inStock: true,
    },
    {
        name: "Oats Noodles 72g",
        category: "Instant",
        price: 40,
        offerPrice: 35,
        imageFile: "maggi_oats_image.png",
        description: [
            "Healthy alternative with oats",
            "Good for digestion",
            "Perfect for breakfast or snacks",
        ],
        inStock: true,
    },
];

const requiredEnvVars = [
    "MONGODB_URI",
    "CLOUDINARY_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
];

const validateEnv = () => {
    const missing = requiredEnvVars.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required env vars: ${missing.join(", ")}`);
    }
};

const configureCloudinary = () => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
};

const uploadProductImage = async (imageFile) => {
    const absoluteImagePath = path.join(assetsDir, imageFile);

    await fs.access(absoluteImagePath);

    const uploaded = await cloudinary.uploader.upload(absoluteImagePath, {
        folder: "marketnest/seed-products",
        resource_type: "image",
        use_filename: true,
        unique_filename: false,
        overwrite: true,
    });

    return uploaded.secure_url;
};

const run = async () => {
    validateEnv();
    configureCloudinary();

    await mongoose.connect(process.env.MONGODB_URI);

    try {
        console.log(`Uploading ${seedProducts.length} product images...`);

        const productsWithImages = await Promise.all(
            seedProducts.map(async (product) => ({
                ...product,
                stockQuantity:
                    typeof product.stockQuantity === "number"
                        ? product.stockQuantity
                        : product.inStock
                        ? 24
                        : 0,
                inStock:
                    typeof product.stockQuantity === "number"
                        ? product.stockQuantity > 0
                        : Boolean(product.inStock),
                image: [await uploadProductImage(product.imageFile)],
            }))
        );

        const operations = productsWithImages.map(
            ({ imageFile, ...productData }) => ({
                updateOne: {
                    filter: {
                        name: productData.name,
                        category: productData.category,
                    },
                    update: { $set: productData },
                    upsert: true,
                },
            })
        );

        const result = await Product.bulkWrite(operations, { ordered: false });

        console.log("Seed complete.");
        console.log(
            JSON.stringify(
                {
                    matched: result.matchedCount,
                    modified: result.modifiedCount,
                    upserted: result.upsertedCount,
                },
                null,
                2
            )
        );
    } finally {
        await mongoose.disconnect();
    }
};

run().catch((error) => {
    console.error("Product seed failed:", error.message);
    process.exit(1);
});
