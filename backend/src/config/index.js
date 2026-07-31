import dotenv from "dotenv";

dotenv.config();

const LOCAL_CLIENT_URL = "http://localhost:5173";
const DEPLOYED_CLIENT_URL = "https://market-nest-phi.vercel.app";
const parseOriginList = (origins = "") =>
    origins
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

export const PORT = Number(process.env.PORT) || 3000;
export const NODE_ENV = process.env.NODE_ENV || "development";
export const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env";
export const MONGODB_URI = process.env.MONGODB_URI;
export const DATABASE_URL = process.env.DATABASE_URL;
export const ORDER_STORAGE = process.env.ORDER_STORAGE || "mongo";
export const USE_POSTGRES_ORDERS = process.env.USE_POSTGRES_ORDERS === "true";
export const MESSAGE_QUEUE = process.env.MESSAGE_QUEUE || "in-memory";
export const RABBITMQ_URL =
    process.env.RABBITMQ_URL || "amqp://localhost:5672";
export const CLOUDINARY_NAME = process.env.CLOUDINARY_NAME;
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
export const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
export const CLIENT_URL =
    process.env.CLIENT_URL ||
    (NODE_ENV === "production" ? DEPLOYED_CLIENT_URL : LOCAL_CLIENT_URL);
export const CORS_ORIGINS = [
    ...new Set([
        ...parseOriginList(
            process.env.CORS_ORIGINS ||
                `${LOCAL_CLIENT_URL},${DEPLOYED_CLIENT_URL}`
        ),
        CLIENT_URL,
    ]),
];
