import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import connectDB from "./src/config/db.js";
import { getPostgresHealth } from "./src/db/postgres.js";
import connectCloudinary from "./src/config/cloudinary.js";
import userRouter from "./src/routes/userRoute.js";
import productRouter from "./src/routes/productRoute.js";
import cartRouter from "./src/routes/cartRoute.js";
import addressRouter from "./src/routes/addressRoute.js";
import orderRouter from "./src/routes/orderRoute.js";
import couponRouter from "./src/routes/couponRoute.js";
import paymentRouter from "./src/routes/paymentRoute.js";
import { createApiGateway } from "./src/gateway/apiGateway.js";
import errorHandler from "./src/middlewares/errorMiddleware.js";
import securityHeaders from "./src/middlewares/securityHeaders.js";
import { razorpayWebhooks } from "./src/controllers/paymentController.js";
import { registerPaymentOrderConsumers } from "./src/services/paymentOrderConsumer.js";
import { registerNotificationConsumers } from "./src/services/notificationService.js";
import { getObservabilitySnapshot } from "./src/services/observabilityService.js";
import { getServiceRegistrySnapshot } from "./src/services/serviceRegistry.js";
import {
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
    CLOUDINARY_NAME,
    CORS_ORIGINS,
    DATABASE_URL,
    isAllowedCorsOrigin,
    MESSAGE_QUEUE,
    NODE_ENV,
    PORT,
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
} from "./src/config/index.js";

import { validateStartupEnv } from "./src/config/validateEnv.js";

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
    validateStartupEnv();
    const app = express();
    app.disable("x-powered-by");
    app.set("trust proxy", 1);

    await connectDB();
    await connectCloudinary();
    registerPaymentOrderConsumers();
    registerNotificationConsumers();

    app.post(
        "/api/payment/razorpay/webhook",
        express.raw({ type: "application/json" }),
        razorpayWebhooks
    );
    app.post(
        "/api/payments/razorpay/webhook",
        express.raw({ type: "application/json" }),
        razorpayWebhooks
    );

    // Middlewares
    app.use(morgan("dev"));
    app.use(securityHeaders);
    app.use(express.json({ limit: "500kb" }));
    app.use(cookieParser());
    app.use(
        cors({
            origin: (origin, callback) => {
                if (isAllowedCorsOrigin(origin)) {
                    return callback(null, true);
                }

                return callback(null, false);
            },
            credentials: true,
        })
    );

    app.get("/", (req, res) => res.send("API is Working"));
    app.get("/health", async (req, res) => {
        const dbStatus = getDatabaseStatus();
        const postgresStatus = DATABASE_URL
            ? await getPostgresHealth()
            : "not_configured";
        const hasHealthyDatabase =
            dbStatus === "connected" || postgresStatus === "connected";
        const health = {
            status: hasHealthyDatabase ? "ok" : "degraded",
            service: "marketnest-api",
            environment: NODE_ENV,
            uptimeSeconds: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
            startedAt: startedAt.toISOString(),
            database: {
                mongo: dbStatus,
                postgres: postgresStatus,
            },
            integrations: {
                cloudinaryConfigured: Boolean(
                    CLOUDINARY_NAME &&
                        CLOUDINARY_API_KEY &&
                        CLOUDINARY_API_SECRET
                ),
                razorpayConfigured: Boolean(
                    RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
                ),
                messageQueue: MESSAGE_QUEUE,
            },
        };

        return res.status(health.status === "ok" ? 200 : 503).json(health);
    });
    app.get("/health/services", (req, res) => {
        res.status(200).json(getServiceRegistrySnapshot());
    });
    app.get("/health/observability", (req, res) => {
        res.status(200).json(getObservabilitySnapshot());
    });
    app.use(
        "/api",
        createApiGateway({
            userRouter,
            cartRouter,
            addressRouter,
            couponRouter,
            productRouter,
            orderRouter,
            paymentRouter,
        })
    );
    app.use("/api/user", userRouter);
    app.use("/api/product", productRouter);
    app.use("/api/cart", cartRouter);
    app.use("/api/address", addressRouter);
    app.use("/api/order", orderRouter);
    app.use("/api/coupon", couponRouter);
    app.use("/api/payment", paymentRouter);

    app.use(errorHandler);

    app.listen(PORT, () => {
        console.log(`Server running on ${PORT}`);
    });
};

bootstrap().catch((error) => {
    console.error("Server startup failed:", error.message);
    process.exit(1);
});
