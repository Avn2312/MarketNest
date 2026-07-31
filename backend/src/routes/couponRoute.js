import { Router } from "express";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import { validateObjectIdParam } from "../middlewares/validateObjectId.js";
import {
    createCoupon,
    deleteCoupon,
    getPublicCoupons,
    getSellerCoupons,
    updateCoupon,
} from "../controllers/couponController.js";

const couponRouter = Router();

couponRouter.get("/", getPublicCoupons);
couponRouter.get("/seller", authenticate, authorize("seller"), getSellerCoupons);
couponRouter.post("/", authenticate, authorize("seller"), createCoupon);
couponRouter.put(
    "/:id",
    authenticate,
    authorize("seller"),
    validateObjectIdParam("id"),
    updateCoupon
);
couponRouter.delete(
    "/:id",
    authenticate,
    authorize("seller"),
    validateObjectIdParam("id"),
    deleteCoupon
);

export default couponRouter;
