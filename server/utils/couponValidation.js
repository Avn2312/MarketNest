import Joi from "joi";

export const couponValidationSchema = Joi.object({
    code: Joi.string().trim().uppercase().required(),
    type: Joi.string().valid("flat", "percent").required(),
    value: Joi.number().positive().required(),
    minOrder: Joi.number().min(0).required(),
    description: Joi.string().allow("").trim().required(),
    expiresAt: Joi.date().allow(null, "").optional(),
    usageLimit: Joi.number().integer().min(1).allow(null, "").optional(),
    isActive: Joi.boolean().default(true),
}).custom((value, helpers) => {
    if (value.type === "percent" && value.value > 100) {
        return helpers.error("any.invalid", {
            message: "Percent coupons cannot exceed 100",
        });
    }

    return value;
}, "coupon business validation");
