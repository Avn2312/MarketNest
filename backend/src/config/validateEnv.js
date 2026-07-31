import {
    JWT_SECRET,
    MONGODB_URI,
    DATABASE_URL,
    NODE_ENV,
    ORDER_STORAGE,
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
    CLOUDINARY_NAME,
} from "./index.js";

export const validateStartupEnv = () => {
    const isProduction = NODE_ENV === "production";

    // 1. JWT Secret Verification
    if (isProduction && (!JWT_SECRET || JWT_SECRET === "change-me-in-env")) {
        throw new Error(
            "FATAL: JWT_SECRET must be set to a secure, random string in production environment."
        );
    }

    // 2. Database Connection String Verification
    if (!MONGODB_URI && (!DATABASE_URL || ORDER_STORAGE !== "postgres")) {
        throw new Error(
            "FATAL: MONGODB_URI is required unless ORDER_STORAGE=postgres with a valid DATABASE_URL."
        );
    }

    // 3. Informational Startup Status Warnings
    if (isProduction) {
        if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
            console.warn(
                "WARNING: Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing. Online payment checkout will fail."
            );
        }
        if (!CLOUDINARY_NAME) {
            console.warn(
                "WARNING: Cloudinary credentials (CLOUDINARY_NAME) are missing. Product image uploads will fail."
            );
        }
    }
};
