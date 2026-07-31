import mongoose from "mongoose";
import CustomError from "../utils/CustomError.js";

export const validateObjectIdParam = (paramName) => (req, res, next) => {
  const value = req.params[paramName];

  if (!mongoose.Types.ObjectId.isValid(value)) {
    return next(new CustomError(400, `Invalid ${paramName}`));
  }

  next();
};
