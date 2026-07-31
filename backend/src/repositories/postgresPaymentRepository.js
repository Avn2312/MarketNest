import { withPostgresTransaction } from "../db/postgres.js";
import { usePostgresOrderStorage } from "../config/orderStorage.js";

const shouldUsePostgresPayments = () =>
    usePostgresOrderStorage();

export const markRazorpayPaymentSucceededIfConfigured = async ({
    providerOrderId,
    providerPaymentId,
    amount,
    currency = "INR",
    transaction = withPostgresTransaction,
    enabled = shouldUsePostgresPayments(),
} = {}) => {
    if (!enabled || !providerOrderId) return null;

    return transaction(async (client) => {
        const paymentResult = await client.query(
            `
                UPDATE payments
                SET
                    status = 'succeeded',
                    provider_payment_id = $2,
                    amount_cents = COALESCE($3, amount_cents),
                    currency = COALESCE($4, currency)
                WHERE provider = 'razorpay'
                    AND provider_order_id = $1
                RETURNING *
            `,
            [providerOrderId, providerPaymentId || null, amount || null, currency]
        );
        const payment = paymentResult.rows[0] || null;

        if (payment) {
            await client.query(
                `
                    UPDATE orders
                    SET status = 'confirmed'
                    WHERE id = $1
                        AND status = 'payment_pending'
                `,
                [payment.order_id]
            );
        }

        return payment;
    });
};

export const markRazorpayPaymentFailedIfConfigured = async ({
    providerOrderId,
    providerPaymentId,
    transaction = withPostgresTransaction,
    enabled = shouldUsePostgresPayments(),
} = {}) => {
    if (!enabled || !providerOrderId) return null;

    return transaction(async (client) => {
        const paymentResult = await client.query(
            `
                UPDATE payments
                SET
                    status = 'failed',
                    provider_payment_id = COALESCE($2, provider_payment_id)
                WHERE provider = 'razorpay'
                    AND provider_order_id = $1
                RETURNING *
            `,
            [providerOrderId, providerPaymentId || null]
        );
        const payment = paymentResult.rows[0] || null;

        if (payment) {
            await client.query(
                `
                    UPDATE orders
                    SET status = 'cancelled'
                    WHERE id = $1
                        AND status = 'payment_pending'
                `,
                [payment.order_id]
            );
        }

        return payment;
    });
};

export const updateRazorpayProviderOrderIdIfConfigured = async ({
    internalOrderId,
    providerOrderId,
    transaction = withPostgresTransaction,
    enabled = shouldUsePostgresPayments(),
} = {}) => {
    if (!enabled || !internalOrderId || !providerOrderId) return null;

    return transaction(async (client) => {
        const paymentResult = await client.query(
            `
                UPDATE payments
                SET provider_order_id = $2
                WHERE order_id = $1
                    AND provider = 'razorpay'
                    AND status = 'created'
                RETURNING *
            `,
            [internalOrderId, providerOrderId]
        );

        return paymentResult.rows[0] || null;
    });
};
