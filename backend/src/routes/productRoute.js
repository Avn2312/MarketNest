import { Router } from "express";
import { upload } from "../config/multer.js";
import { authenticate, authorize } from "./../middlewares/authMiddleware.js";
import { validateObjectIdParam } from "../middlewares/validateObjectId.js";
import {
    addProduct,
    changeStock,
    deleteProduct,
    getProductById,
    productList,
    sellerProductList,
    updateProduct,
    updateProductStatus,
} from "../controllers/productController.js";

const productRouter = Router();

productRouter.post(
    "/add",
    upload.array("images", 4),
    authenticate,
    authorize("seller"),
    addProduct
);
productRouter.get("/list", productList);
productRouter.get(
    "/seller/list",
    authenticate,
    authorize("seller"),
    sellerProductList
);
productRouter.patch(
    "/:id/status",
    authenticate,
    authorize("seller"),
    validateObjectIdParam("id"),
    updateProductStatus
);
productRouter.get("/:id", validateObjectIdParam("id"), getProductById);
productRouter.put(
    "/:id",
    authenticate,
    authorize("seller"),
    validateObjectIdParam("id"),
    updateProduct
);
productRouter.patch(
    "/:id",
    authenticate,
    authorize("seller"),
    validateObjectIdParam("id"),
    changeStock
);
productRouter.delete(
    "/:id",
    authenticate,
    authorize("seller"),
    validateObjectIdParam("id"),
    deleteProduct
);

export default productRouter;
