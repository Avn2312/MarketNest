import { Router } from "express";
import { authenticate } from "./../middlewares/authMiddleware.js";
import { createRateLimiter } from "../middlewares/rateLimit.js";
import {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
} from "../controllers/userController.js";

const userRouter = Router();
const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    key: "auth",
});

userRouter.post("/register", authLimiter, registerUser);
userRouter.post("/login", authLimiter, loginUser);
userRouter.delete("/logout", logoutUser);
userRouter.get("/me", authenticate, getCurrentUser);

export default userRouter;
