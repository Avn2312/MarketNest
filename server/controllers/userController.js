import asyncHandler from "express-async-handler";
import CustomError from "../utils/CustomError.js";
import User from "../models/User.js";
import genToken from "../utils/jwt.js";
import {
    registerUserSchema,
    loginUserSchema,
} from "../utils/userValidation.js";
import {
    getAuthCookieClearOptions,
    getAuthCookieOptions,
} from "../utils/cookieOptions.js";

//! Register User : /api/user/register

export const registerUser = asyncHandler(async (req, res, next) => {
    const { error, value } = registerUserSchema.validate(req.body, {
        convert: true,
        stripUnknown: true,
    });
    if (error) {
        return next(
            new CustomError(
                400,
                error.details[0].message || "Invalid registration payload"
            )
        );
    }

    const { name, email, password } = value;

    const existinUser = await User.findOne({ email });

    if (existinUser) {
        return next(new CustomError(409, "User already exists"));
    }

    const user = await User.create({ name, email, password, role: "user" });

    const token = await genToken(user._id);

    res.cookie("token", token, getAuthCookieOptions(req));

    res.status(201).json({
        success: true,
        message: "New user created successfully",
        user: { name: user.name, email: user.email, role: user.role },
    });
});

//! Login User : /api/user/login

export const loginUser = asyncHandler(async (req, res, next) => {
    const { error, value } = loginUserSchema.validate(req.body, {
        convert: true,
        stripUnknown: true,
    });
    if (error) {
        return next(
            new CustomError(400, error.details[0].message || "Invalid login payload")
        );
    }

    const { email, password } = value;

    const user = await User.findOne({ email });

    if (!user) {
        return next(new CustomError(401, "Invalid credentials"));
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        return next(new CustomError(401, "Invalid credentials"));
    }

    const token = await genToken(user._id);

    res.cookie("token", token, getAuthCookieOptions(req));

    res.status(200).json({
        success: true,
        message: "User logged-in successfully",
        user: { email: user.email, name: user.name, role: user.role },
    });
});

//! Logout User : /api/user/logout

export const logoutUser = asyncHandler(async (req, res) => {
    res.clearCookie("token", getAuthCookieClearOptions(req));

    res.status(200).json({
        success: true,
        message: "Logged-out successfully",
    });
});

//! Get logged-in user details: /api/user/me

export const getCurrentUser = (req, res) => {
    res.status(200).json({
        success: true,
        user: req.user,
    });
};
