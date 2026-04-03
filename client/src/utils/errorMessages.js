const GENERIC_ERROR_MESSAGE = "Something unexpected happened. Please try again.";

export const ERROR_MESSAGES = {
    generic: GENERIC_ERROR_MESSAGE,
    loadProducts: "We couldn't load products right now.",
    updateCart: "We couldn't update your cart.",
    cartEmpty: "Your cart is empty.",
    selectAddress: "Please select a delivery address to continue.",
    enterCoupon: "Please enter a coupon code.",
    invalidCoupon: "That coupon code is not valid.",
    sellerAccessRequired: "Seller access is required for this action.",
    updateOrder: "We couldn't update the order.",
    validStockQuantity: "Please enter a valid stock quantity.",
    selectProducts: "Please select at least one product.",
    validBulkStockQuantity: "Please enter a valid bulk stock quantity.",
    updateStock: "We couldn't update stock right now.",
    updateProduct: "We couldn't update the product.",
    fetchOrders: "We couldn't load orders right now.",
    deleteOrder: "We couldn't delete the order.",
    updateStatus: "We couldn't update the status.",
    loadAnalytics: "We couldn't load analytics right now.",
    fetchCoupons: "We couldn't load coupons right now.",
    saveCoupon: "We couldn't save the coupon.",
    deleteCoupon: "We couldn't delete the coupon.",
};

const EXACT_MESSAGE_MAP = {
    "Something went wrong": GENERIC_ERROR_MESSAGE,
    "Something went wrong, please try again.": GENERIC_ERROR_MESSAGE,
    "Failed to load products": ERROR_MESSAGES.loadProducts,
    "Failed to update cart": ERROR_MESSAGES.updateCart,
    "Your cart is empty": ERROR_MESSAGES.cartEmpty,
    "Please select a delivery address": ERROR_MESSAGES.selectAddress,
    "Enter a coupon code": ERROR_MESSAGES.enterCoupon,
    "Invalid coupon code": ERROR_MESSAGES.invalidCoupon,
    "Access denied: Not a seller": ERROR_MESSAGES.sellerAccessRequired,
    "Failed to update order": ERROR_MESSAGES.updateOrder,
    "Enter a valid stock quantity": ERROR_MESSAGES.validStockQuantity,
    "Select products first": ERROR_MESSAGES.selectProducts,
    "Enter a valid bulk stock quantity":
        ERROR_MESSAGES.validBulkStockQuantity,
    "Failed to update stock": ERROR_MESSAGES.updateStock,
    "Failed to update product": ERROR_MESSAGES.updateProduct,
    "Failed to fetch orders": ERROR_MESSAGES.fetchOrders,
    "Failed to delete the order": ERROR_MESSAGES.deleteOrder,
    "Failed to update status": ERROR_MESSAGES.updateStatus,
    "Failed to load analytics": ERROR_MESSAGES.loadAnalytics,
    "Failed to fetch coupons": ERROR_MESSAGES.fetchCoupons,
    "Failed to save coupon": ERROR_MESSAGES.saveCoupon,
    "Failed to delete coupon": ERROR_MESSAGES.deleteCoupon,
    "User already exists": "An account with these details already exists.",
    "Invalid credentials": "The email or password you entered is incorrect.",
    "User not found": "We couldn't find your account.",
    "Not authenticated, token missing, please login to access this":
        "Please log in to continue.",
    "Invalid or expired token": "Your session has expired. Please log in again.",
    "Not authenticated": "Please log in to continue.",
    "Invalid address data": "Please check your address details and try again.",
    "Error while adding address": "We couldn't save your address right now.",
    "Invalid cart data":
        "We couldn't update your cart because some item details were invalid.",
    "Invalid order items":
        "Some items in your order are invalid. Please review your cart and try again.",
    "Invalid order data":
        "We couldn't process your order. Please review the details and try again.",
    "Invalid update payload":
        "We couldn't save your changes. Please review the form and try again.",
    "Invalid stock payload":
        "We couldn't update stock. Please check the stock values and try again.",
    "This coupon is not active": "This coupon is not active right now.",
    "This coupon has expired": "This coupon has expired.",
    "This coupon usage limit has been reached":
        "This coupon is no longer available.",
    "Coupon code already exists": "A coupon with this code already exists.",
    "Coupon not found": "We couldn't find that coupon.",
    "Percent coupons cannot exceed 100":
        "Discount percentage cannot be more than 100%.",
    "Invalid JSON format in 'productData'":
        "We couldn't save this product because some details were invalid.",
    "At least one product image is required":
        "Please upload at least one product image.",
    "Cloudinary is not configured":
        "Image upload is temporarily unavailable. Please try again later.",
    "Product not found": "We couldn't find that product.",
    "Offer price cannot be greater than price":
        "Offer price must be less than or equal to the regular price.",
    "Stripe is not configured":
        "Online payment is temporarily unavailable. Please try another payment method.",
    "Order not found": "We couldn't find that order.",
    "This order can no longer be cancelled":
        "This order can no longer be canceled.",
    "Order is already cancelled": "This order has already been canceled.",
    "Return requests are available after delivery":
        "You can request a return after the order is delivered.",
    "Return request already submitted":
        "A return request has already been submitted for this order.",
    "Too many requests, please try again later":
        "Too many attempts in a short time. Please try again later.",
    "Internal Server Error":
        "Something unexpected happened on our side. Please try again later.",
};

const JOI_RULES = [
    [/^"name" is required$/, "Please enter your name."],
    [
        /^"name" length must be at least 2 characters long$/,
        "Name must be at least 2 characters long.",
    ],
    [/^"email" must be a valid email$/, "Please enter a valid email address."],
    [
        /^"password" length must be at least 8 characters long$/,
        "Password must be at least 8 characters long.",
    ],
    [/^"description" must be an array$/, "Description format is invalid."],
    [/^"price" must be a positive number$/, "Price must be greater than 0."],
    [
        /^"offerPrice" must be a positive number$/,
        "Offer price must be greater than 0.",
    ],
    [
        /^"stockQuantity" must be greater than or equal to 0$/,
        "Stock quantity cannot be negative.",
    ],
    [
        /^"type" must be one of \[flat, percent\]$/,
        "Coupon type must be either flat or percent.",
    ],
    [
        /^"usageLimit" must be greater than or equal to 1$/,
        "Usage limit must be at least 1.",
    ],
];

export const getFriendlyErrorMessage = (message, fallback = GENERIC_ERROR_MESSAGE) => {
    if (!message) {
        return fallback;
    }

    if (EXACT_MESSAGE_MAP[message]) {
        return EXACT_MESSAGE_MAP[message];
    }

    if (/^Forbidden: /i.test(message)) {
        return "You do not have permission to perform this action.";
    }

    if (/^Invalid (id|orderId|productId|couponId)$/i.test(message)) {
        const key = message.slice("Invalid ".length).toLowerCase();

        if (key === "orderid") return "We couldn't find that order.";
        if (key === "productid") return "We couldn't find that product.";
        if (key === "couponid") return "We couldn't find that coupon.";
        return "We couldn't find the requested item.";
    }

    let match = message.match(/^(.+) has only 1 item left right now\.$/);
    if (match) {
        return `Only 1 unit of ${match[1]} is available right now.`;
    }

    match = message.match(/^(.+) has only (\d+) items left right now\.$/);
    if (match) {
        return `Only ${match[2]} units of ${match[1]} are available right now.`;
    }

    match = message.match(/^(.+) is now out of stock and was removed from your cart\.$/);
    if (match) {
        return `${match[1]} is now out of stock, so it was removed from your cart.`;
    }

    match = message.match(
        /^We updated (.+) to (\d+) in your cart based on current stock\.$/
    );
    if (match) {
        return `We updated ${match[1]} quantity to ${match[2]} in your cart based on available stock.`;
    }

    match = message.match(/^This coupon requires a minimum order of (.+)\.$/);
    if (match) {
        return `This coupon requires a minimum order of ${match[1]}.`;
    }

    match = message.match(/^(.+) has only (\d+) item\(s\) left in stock$/);
    if (match) {
        return `Only ${match[2]} units of ${match[1]} are left in stock.`;
    }

    match = message.match(/^Product not found: (.+)$/);
    if (match) {
        return "One of the selected products could not be found.";
    }

    for (const [pattern, friendlyMessage] of JOI_RULES) {
        if (pattern.test(message)) {
            return friendlyMessage;
        }
    }

    return message || fallback;
};

export const getApiErrorMessage = (error, fallback = GENERIC_ERROR_MESSAGE) =>
    getFriendlyErrorMessage(error?.response?.data?.message, fallback);
