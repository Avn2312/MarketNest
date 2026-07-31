import Joi from "joi";

export const registerUserSchema = Joi.object({
    name: Joi.string().trim().min(2).max(60).required().messages({}),
    email: Joi.string().trim().lowercase().email().required().messages({}),
    password: Joi.string().trim().min(8).max(128).required().messages({}),
});

export const loginUserSchema = Joi.object({
    email: Joi.string().trim().lowercase().email().required().messages({}),
    password: Joi.string().min(8).max(128).required().messages({}),
});
