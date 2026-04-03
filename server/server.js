import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import connectCloudinary from "./config/cloudinary.js";
import userRouter from "./routes/userRoute.js";
import productRouter from "./routes/productRoute.js";
import cartRouter from "./routes/cartRoute.js";
import addressRouter from "./routes/addressRoute.js";
import orderRouter from "./routes/orderRoute.js";
import couponRouter from "./routes/couponRoute.js";
import errorHandler from "./middlewares/errorMiddleware.js";
import securityHeaders from "./middlewares/securityHeaders.js";
import { stripeWebhooks } from "./controllers/orderController.js";
import {
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
    CLOUDINARY_NAME,
    CORS_ORIGINS,
    NODE_ENV,
    PORT,
    STRIPE_SECRET_KEY,
} from "./config/index.js";

const startedAt = new Date();

const getDatabaseStatus = () => {
    const states = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting",
    };

    return states[mongoose.connection.readyState] || "unknown";
};

const bootstrap = async () => {
    const app = express();
    app.disable("x-powered-by");
    app.set("trust proxy", 1);

    await connectDB();
    await connectCloudinary();

    app.post(
        "/stripe",
        express.raw({ type: "application/json" }),
        stripeWebhooks
    );

    // Middlewares
    app.use(morgan("dev"));
    app.use(securityHeaders);
    app.use(express.json({ limit: "500kb" }));
    app.use(cookieParser());
    app.use(
        cors({
            origin: (origin, callback) => {
                if (!origin || CORS_ORIGINS.includes(origin)) {
                    return callback(null, true);
                }

                return callback(new Error("CORS origin not allowed"));
            },
            credentials: true,
        })
    );

    app.get("/", (req, res) => res.send("API is Working"));
    app.get("/health", (req, res) => {
        const dbStatus = getDatabaseStatus();
        const health = {
            status: dbStatus === "connected" ? "ok" : "degraded",
            service: "marketnest-api",
            environment: NODE_ENV,
            uptimeSeconds: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
            startedAt: startedAt.toISOString(),
            database: {
                status: dbStatus,
            },
            integrations: {
                cloudinaryConfigured: Boolean(
                    CLOUDINARY_NAME &&
                        CLOUDINARY_API_KEY &&
                        CLOUDINARY_API_SECRET
                ),
                stripeConfigured: Boolean(STRIPE_SECRET_KEY),
            },
        };

        return res.status(health.status === "ok" ? 200 : 503).json(health);
    });
    app.use("/api/user", userRouter);
    app.use("/api/product", productRouter);
    app.use("/api/cart", cartRouter);
    app.use("/api/address", addressRouter);
    app.use("/api/order", orderRouter);
    app.use("/api/coupon", couponRouter);

    app.use(errorHandler);

    app.listen(PORT, () => {
        console.log(`Server running on ${PORT}`);
    });
};

bootstrap().catch((error) => {
    console.error("Server startup failed:", error.message);
    process.exit(1);
});
