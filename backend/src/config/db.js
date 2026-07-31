import mongoose from "mongoose";
import { MONGODB_URI, DATABASE_URL, ORDER_STORAGE } from "./index.js";

const connectDB = async () => {
    if (!MONGODB_URI) {
        if (ORDER_STORAGE === "postgres" || DATABASE_URL) {
            console.log("PostgreSQL active: Skipping MongoDB connection (MONGODB_URI not configured)");
            return;
        }
        throw new Error("MONGODB_URI is not configured");
    }

    mongoose.connection.removeAllListeners("connected");
    mongoose.connection.removeAllListeners("error");
    mongoose.connection.removeAllListeners("disconnected");

    mongoose.connection.on("connected", () => {
        console.log("MongoDB Database Connected");
    });

    mongoose.connection.on("error", (error) => {
        console.error("MongoDB connection error:", error.message);
    });

    mongoose.connection.on("disconnected", () => {
        console.error("MongoDB disconnected");
    });

    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });
    } catch (err) {
        if (ORDER_STORAGE === "postgres" || DATABASE_URL) {
            console.warn("MongoDB connection failed, but PostgreSQL is active:", err.message);
            return;
        }
        throw err;
    }
};

export default connectDB;
