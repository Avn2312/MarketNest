import { createLogger, format, transports } from "winston";
import fs from "node:fs";
import { NODE_ENV } from "../config/index.js";

const loggerTransports = [new transports.Console()];

if (NODE_ENV !== "production") {
    try {
        if (!fs.existsSync("logs")) {
            fs.mkdirSync("logs", { recursive: true });
        }
        loggerTransports.push(new transports.File({ filename: "logs/error.log" }));
    } catch (err) {
        // Fallback gracefully to Console transport on read-only / restricted filesystems
        console.warn("File transport disabled (directory not writable):", err.message);
    }
}

const logger = createLogger({
    level: "error",
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.printf(({ timestamp, level, message, stack }) => {
            return `[${timestamp}] ${level.toUpperCase()}: ${message}\n${
                stack || ""
            }`;
        })
    ),
    transports: loggerTransports,
});

export default logger;
