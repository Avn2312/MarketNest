import mongoose from "mongoose";
import { MONGODB_URI } from "./index.js";

const connectDB = async () => {
    if (!MONGODB_URI) {
        throw new Error("MONGODB_URI is not configured");
    }

    mongoose.connection.removeAllListeners("connected");
    mongoose.connection.removeAllListeners("error");
    mongoose.connection.removeAllListeners("disconnected");

    mongoose.connection.on("connected", () => {
        console.log("Database Connected");
    });

    mongoose.connection.on("error", (error) => {
        console.error("MongoDB connection error:", error.message);
    });

    mongoose.connection.on("disconnected", () => {
        console.error("MongoDB disconnected");
    });

    await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
    });
};

export default connectDB;
