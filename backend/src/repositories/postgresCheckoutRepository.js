import CustomError from "../utils/CustomError.js";
import { withPostgresTransaction } from "../db/postgres.js";

const toCents = (amount) => Math.round(Number(amount || 0) * 100);

const normalizeItems = (items, ErrorClass) => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new ErrorClass(400, "Invalid order items");
    }

    const normalizedItems = items.map((item) => ({
        productId: item?.productId || item?.product,
        quantity: Number(item?.quantity),
    }));

    if (
        normalizedItems.some(
            (item) =>
                !item.productId ||
                !Number.isInteger(item.quantity) ||
                item.quantity <= 0
        )
    ) {
        throw new ErrorClass(400, "Invalid order items");
    }

    return Array.from(
        normalizedItems.reduce((itemsByProductId, item) => {
            const existingItem = itemsByProductId.get(item.productId);
            itemsByProductId.set(item.productId, {
                productId: item.productId,
                quantity: (existingItem?.quantity || 0) + item.quantity,
            });
            return itemsByProductId;
        }, new Map()).values()
    );
};

const calculateCouponDiscount = ({ coupon, subtotalCents }) => {
    if (!coupon) return 0;

    const rawDiscount =
        coupon.type === "percent"
            ? Math.floor((subtotalCents * coupon.value) / 100)
            : coupon.value;

    return Math.min(rawDiscount, subtotalCents);
};

export const createPostgresCheckoutRepository = ({
    transaction = withPostgresTransaction,
    ErrorClass = CustomError,
} = {}) => {
    const createOrderWithInventoryReservation = async ({
        userId,
        addressId,
        items,
        couponCode = "",
        paymentProvider = "cod",
        providerOrderId = null,
        currency = "INR",
        taxRate = 0.02,
    }) =>
        transaction(async (client) => {
            const normalizedItems = normalizeItems(items, ErrorClass);
            const productIds = normalizedItems.map((item) => item.productId);
            const productResult = await client.query(
                `
                    SELECT id, seller_id, name, offer_price_cents, stock_quantity, status
                    FROM products
                    WHERE id = ANY($1::uuid[])
                    FOR UPDATE
                `,
                [productIds]
            );
            const productsById = new Map(
                productResult.rows.map((product) => [product.id, product])
            );

            for (const item of normalizedItems) {
                const product = productsById.get(item.productId);

                if (!product || product.status !== "active") {
                    throw new ErrorClass(404, `Product not found: ${item.productId}`);
                }

                if (product.stock_quantity < item.quantity) {
                    throw new ErrorClass(
                        400,
                        `${product.name} has only ${product.stock_quantity} item(s) left in stock`
                    );
                }
            }

            let coupon = null;
            const normalizedCouponCode = String(couponCode).trim().toUpperCase();

            if (normalizedCouponCode) {
                const couponResult = await client.query(
                    `
                        SELECT *
                        FROM coupons
                        WHERE code = $1
                        FOR UPDATE
                    `,
                    [normalizedCouponCode]
                );
                coupon = couponResult.rows[0];

                if (!coupon) {
                    throw new ErrorClass(400, "Invalid coupon code");
                }

                if (!coupon.is_active) {
                    throw new ErrorClass(400, "This coupon is not active");
                }

                if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
                    throw new ErrorClass(400, "This coupon has expired");
                }

                if (
                    coupon.usage_limit &&
                    coupon.used_count >= coupon.usage_limit
                ) {
                    throw new ErrorClass(
                        400,
                        "This coupon usage limit has been reached"
                    );
                }
            }

            const subtotalCents = normalizedItems.reduce((total, item) => {
                const product = productsById.get(item.productId);
                return total + product.offer_price_cents * item.quantity;
            }, 0);

            if (coupon && subtotalCents < coupon.min_order_cents) {
                throw new ErrorClass(
                    400,
                    `This coupon requires a minimum order of INR ${(
                        coupon.min_order_cents / 100
                    ).toFixed(2)}`
                );
            }

            const discountCents = calculateCouponDiscount({
                coupon,
                subtotalCents,
            });
            const taxCents = Math.round(subtotalCents * taxRate);
            const totalCents = subtotalCents + taxCents - discountCents;
            const orderStatus =
                paymentProvider === "cod" ? "order_placed" : "payment_pending";

            const orderResult = await client.query(
                `
                    INSERT INTO orders (
                        user_id,
                        address_id,
                        status,
                        subtotal_cents,
                        discount_cents,
                        tax_cents,
                        total_cents,
                        coupon_id,
                        coupon_code
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING *
                `,
                [
                    userId,
                    addressId,
                    orderStatus,
                    subtotalCents,
                    discountCents,
                    taxCents,
                    totalCents,
                    coupon?.id || null,
                    coupon?.code || "",
                ]
            );
            const order = orderResult.rows[0];

            for (const item of normalizedItems) {
                const product = productsById.get(item.productId);

                await client.query(
                    `
                        UPDATE products
                        SET stock_quantity = stock_quantity - $2
                        WHERE id = $1
                    `,
                    [item.productId, item.quantity]
                );
                await client.query(
                    `
                        INSERT INTO order_items (
                            order_id,
                            product_id,
                            seller_id,
                            product_name_snapshot,
                            unit_price_cents,
                            quantity
                        )
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `,
                    [
                        order.id,
                        product.id,
                        product.seller_id,
                        product.name,
                        product.offer_price_cents,
                        item.quantity,
                    ]
                );
            }

            if (coupon) {
                await client.query(
                    `
                        UPDATE coupons
                        SET used_count = used_count + 1
                        WHERE id = $1
                    `,
                    [coupon.id]
                );
            }

            await client.query(
                `
                    UPDATE users
                    SET cart_items = '{}'::jsonb
                    WHERE id = $1
                `,
                [userId]
            );

            let payment = null;
            if (paymentProvider) {
                const fallbackProviderOrderId = `${paymentProvider}_${order.id}`;
                const paymentResult = await client.query(
                    `
                        INSERT INTO payments (
                            order_id,
                            provider,
                            provider_order_id,
                            status,
                            amount_cents,
                            currency
                        )
                        VALUES ($1, $2, $3, $4, $5, $6)
                        RETURNING *
                    `,
                    [
                        order.id,
                        paymentProvider,
                        providerOrderId || fallbackProviderOrderId,
                        paymentProvider === "cod" ? "succeeded" : "created",
                        totalCents,
                        currency,
                    ]
                );
                payment = paymentResult.rows[0];
            }

            return {
                order,
                payment,
                totals: {
                    subtotalCents,
                    discountCents,
                    taxCents,
                    totalCents,
                },
            };
        });

    const releasePendingOrderInventory = async ({
        orderId,
        reason = "payment provider order creation failed",
    }) =>
        transaction(async (client) => {
            const orderResult = await client.query(
                `
                    SELECT id, status
                    FROM orders
                    WHERE id = $1
                    FOR UPDATE
                `,
                [orderId]
            );
            const order = orderResult.rows[0] || null;

            if (!order || order.status !== "payment_pending") {
                return null;
            }

            await client.query(
                `
                    UPDATE products AS products
                    SET stock_quantity = products.stock_quantity + order_items.quantity
                    FROM order_items
                    WHERE order_items.order_id = $1
                        AND order_items.product_id = products.id
                `,
                [orderId]
            );
            await client.query(
                `
                    UPDATE payments
                    SET status = 'failed'
                    WHERE order_id = $1
                        AND provider = 'razorpay'
                        AND status = 'created'
                `,
                [orderId]
            );
            const cancelledOrderResult = await client.query(
                `
                    UPDATE orders
                    SET
                        status = 'cancelled',
                        cancel_reason = $2
                    WHERE id = $1
                    RETURNING *
                `,
                [orderId, reason]
            );

            return cancelledOrderResult.rows[0] || null;
        });

    return {
        createOrderWithInventoryReservation,
        releasePendingOrderInventory,
    };
};

export const postgresCheckoutRepository = createPostgresCheckoutRepository();
export { toCents };
