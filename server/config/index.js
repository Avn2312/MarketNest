import dotenv from "dotenv";

dotenv.config();

const LOCAL_CLIENT_URL = "http://localhost:5173";
const DEPLOYED_CLIENT_URL = "https://market-nest-phi.vercel.app";

export const PORT = Number(process.env.PORT) || 5000;
export const NODE_ENV = process.env.NODE_ENV || "development";
export const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env";
export const MONGODB_URI = process.env.MONGODB_URI ;
export const CLOUDINARY_NAME = process.env.CLOUDINARY_NAME;
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY ;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET ;
export const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
export const CLIENT_URL =
    process.env.CLIENT_URL ||
    (NODE_ENV === "production" ? DEPLOYED_CLIENT_URL : LOCAL_CLIENT_URL);
export const CORS_ORIGINS = (
    process.env.CORS_ORIGINS || `${LOCAL_CLIENT_URL},${DEPLOYED_CLIENT_URL}`
)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
