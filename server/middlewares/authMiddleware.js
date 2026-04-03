import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import CustomError from "../utils/CustomError.js";
import { JWT_SECRET } from "../config/index.js";
import { getAuthCookieClearOptions } from "../utils/cookieOptions.js";

export const authenticate = asyncHandler(async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return next(
            new CustomError(
                401,
                "Not authenticated, token missing, please login to access this"
            )
        );
    }

    let decodedToken;
    try {
        decodedToken = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        res.clearCookie("token", getAuthCookieClearOptions(req));
        throw new CustomError(401, "Invalid or expired token");
    }

    const user = await User.findById(decodedToken.id)
        .select("_id name email role cartItems")
        .lean();

    if (!user) {
        return next(new CustomError(401, "User not found"));
    }

    user.id = user._id.toString();
    req.user = user;

    next();
});

export const authorize =
    (...roles) =>
    asyncHandler(async (req, res, next) => {
        const allowedRoles = roles.length ? roles : ["seller"];

        if (!req.user) {
            return next(new CustomError(401, "Not authenticated"));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(
                new CustomError(
                    403,
                    `Forbidden: ${allowedRoles.join(", ")} access only`
                )
            );
        }

        next();
    });
