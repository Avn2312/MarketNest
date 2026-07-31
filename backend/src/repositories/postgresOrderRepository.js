import CustomError from "../utils/CustomError.js";
import { withPostgresTransaction, queryPostgres } from "../db/postgres.js";

const fromCents = (amountCents) => Number(amountCents || 0) / 100;

const mapPostgresOrderRowForApi = (orderRow, items = []) => ({
    _id: orderRow.id,
    id: orderRow.id,
    userId: orderRow.user_id,
    items: items.map((item) => ({
        _id: item.id,
        product: {
            _id: item.product_id,
            name: item.product_name_snapshot,
            offerPrice: fromCents(item.unit_price_cents),
        },
        quantity: item.quantity,
    })),
    amount: fromCents(orderRow.total_cents),
    address: orderRow.address_id,
    couponCode: orderRow.coupon_code || "",
    discountAmount: fromCents(orderRow.discount_cents),
    status: orderRow.status === "order_placed" ? "Order Placed" : orderRow.status,
    paymentType: orderRow.payment_provider === "cod" ? "COD" : "Online",
    paymentProvider: orderRow.payment_provider || "",
    providerOrderId: orderRow.provider_order_id || "",
    providerPaymentId: orderRow.provider_payment_id || "",
    isPaid: orderRow.payment_status === "succeeded",
    returnStatus: orderRow.return_status || "",
    cancelReason: orderRow.cancel_reason || "",
    createdAt: orderRow.created_at,
    updatedAt: orderRow.updated_at,
});

export const createPostgresOrderRepository = ({
    query = queryPostgres,
    transaction = withPostgresTransaction,
    ErrorClass = CustomError,
} = {}) => {
    const getUserOrders = async (userId) => {
        const ordersResult = await query(
            `
                SELECT o.*, p.provider AS payment_provider, p.status AS payment_status,
                       p.provider_order_id, p.provider_payment_id
                FROM orders o
                LEFT JOIN payments p ON p.order_id = o.id
                WHERE o.user_id = $1
                  AND (p.provider = 'cod' OR p.status = 'succeeded')
                ORDER BY o.created_at DESC
            `,
            [userId]
        );

        if (ordersResult.rows.length === 0) return [];

        const orderIds = ordersResult.rows.map((o) => o.id);
        const itemsResult = await query(
            `
                SELECT * FROM order_items
                WHERE order_id = ANY($1::uuid[])
            `,
            [orderIds]
        );

        const itemsByOrderId = new Map();
        for (const item of itemsResult.rows) {
            if (!itemsByOrderId.has(item.order_id)) {
                itemsByOrderId.set(item.order_id, []);
            }
            itemsByOrderId.get(item.order_id).push(item);
        }

        return ordersResult.rows.map((row) =>
            mapPostgresOrderRowForApi(row, itemsByOrderId.get(row.id) || [])
        );
    };

    const getAllOrders = async () => {
        const ordersResult = await query(
            `
                SELECT o.*, p.provider AS payment_provider, p.status AS payment_status,
                       p.provider_order_id, p.provider_payment_id
                FROM orders o
                LEFT JOIN payments p ON p.order_id = o.id
                WHERE (p.provider = 'cod' OR p.status = 'succeeded')
                ORDER BY o.created_at DESC
            `
        );

        if (ordersResult.rows.length === 0) return [];

        const orderIds = ordersResult.rows.map((o) => o.id);
        const itemsResult = await query(
            `
                SELECT * FROM order_items
                WHERE order_id = ANY($1::uuid[])
            `,
            [orderIds]
        );

        const itemsByOrderId = new Map();
        for (const item of itemsResult.rows) {
            if (!itemsByOrderId.has(item.order_id)) {
                itemsByOrderId.set(item.order_id, []);
            }
            itemsByOrderId.get(item.order_id).push(item);
        }

        return ordersResult.rows.map((row) =>
            mapPostgresOrderRowForApi(row, itemsByOrderId.get(row.id) || [])
        );
    };

    const cancelUserOrder = async ({ orderId, userId, reason = "" }) =>
        transaction(async (client) => {
            const orderResult = await client.query(
                `
                    SELECT id, status
                    FROM orders
                    WHERE id = $1 AND user_id = $2
                    FOR UPDATE
                `,
                [orderId, userId]
            );

            const order = orderResult.rows[0];
            if (!order) {
                throw new ErrorClass(404, "Order not found");
            }

            if (["shipped", "delivered", "cancelled"].includes(order.status)) {
                throw new ErrorClass(
                    400,
                    `Order cannot be cancelled in state: ${order.status}`
                );
            }

            // Restore stock
            await client.query(
                `
                    UPDATE products AS p
                    SET stock_quantity = p.stock_quantity + oi.quantity
                    FROM order_items oi
                    WHERE oi.order_id = $1 AND oi.product_id = p.id
                `,
                [orderId]
            );

            await client.query(
                `
                    UPDATE orders
                    SET status = 'cancelled', cancel_reason = $2, updated_at = now()
                    WHERE id = $1
                `,
                [orderId, reason]
            );
        });

    return {
        getUserOrders,
        getAllOrders,
        cancelUserOrder,
    };
};

export const postgresOrderRepository = createPostgresOrderRepository();
