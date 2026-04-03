import Joi from "joi";

export const productValidationSchema = Joi.object({
    name: Joi.string().trim().required(),
    description: Joi.array().items(Joi.string()).required(),
    price: Joi.number().positive().required(),
    offerPrice: Joi.number().positive().required(),
    category: Joi.string().required(),
    stockQuantity: Joi.number().integer().min(0).default(24),
    inStock: Joi.boolean().default(true),
}).custom((value, helpers) => {
    if (value.offerPrice > value.price) {
        return helpers.error("any.invalid", {
            message: "Offer price cannot be greater than price",
        });
    }

    return value;
}, "product pricing validation");
