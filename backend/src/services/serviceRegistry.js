export const SERVICE_DATABASE_OWNERSHIP = {
    userService: {
        routes: ["/auth", "/cart", "/addresses"],
        tables: ["users", "refresh_tokens", "addresses"],
    },
    productService: {
        routes: ["/products"],
        tables: ["products", "categories"],
    },
    orderService: {
        routes: ["/orders", "/coupons"],
        tables: ["orders", "order_items", "coupons"],
    },
    paymentService: {
        routes: ["/payments"],
        tables: ["payments", "payment_events"],
    },
    notificationService: {
        routes: [],
        tables: ["notifications"],
    },
};

export const getServiceRegistrySnapshot = () => ({
    generatedAt: new Date().toISOString(),
    services: SERVICE_DATABASE_OWNERSHIP,
});
