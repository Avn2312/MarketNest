import { createLogger, format, transports } from "winston";
import { NODE_ENV } from "../config/index.js";

const loggerTransports = [new transports.Console()];

if (NODE_ENV !== "production") {
    loggerTransports.push(new transports.File({ filename: "logs/error.log" }));
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
