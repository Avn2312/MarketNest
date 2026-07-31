import test from "node:test";
import assert from "node:assert/strict";
import { createPostgresOrderRepository } from "../repositories/postgresOrderRepository.js";

class TestError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

test("getUserOrders queries orders and items for given user", async () => {
    const queryCalls = [];
    const mockQuery = async (sql, params = []) => {
        queryCalls.push({ sql, params });

        if (sql.includes("FROM orders")) {
            return {
                rows: [
                    {
                        id: "order-1",
                        user_id: "user-1",
                        status: "order_placed",
                        subtotal_cents: 4000,
                        discount_cents: 0,
                        tax_cents: 80,
                        total_cents: 4080,
                        payment_provider: "cod",
                        payment_status: "succeeded",
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ],
            };
        }

        if (sql.includes("FROM order_items")) {
            return {
                rows: [
                    {
                        id: "item-1",
                        order_id: "order-1",
                        product_id: "prod-1",
                        product_name_snapshot: "Fresh Milk",
                        unit_price_cents: 4000,
                        quantity: 1,
                    },
                ],
            };
        }

        return { rows: [] };
    };

    const repo = createPostgresOrderRepository({
        query: mockQuery,
        ErrorClass: TestError,
    });

    const orders = await repo.getUserOrders("user-1");

    assert.equal(orders.length, 1);
    assert.equal(orders[0].id, "order-1");
    assert.equal(orders[0].amount, 40.8);
    assert.equal(orders[0].items[0].product.name, "Fresh Milk");
});

test("cancelUserOrder updates order status to cancelled and restores product stock", async () => {
    const clientCalls = [];
    const mockClient = {
        async query(sql, params = []) {
            clientCalls.push({ sql, params });

            if (sql.includes("SELECT id, status")) {
                return {
                    rows: [
                        {
                            id: "order-1",
                            status: "order_placed",
                        },
                    ],
                };
            }

            return { rows: [] };
        },
    };

    const mockTransaction = async (callback) => callback(mockClient);

    const repo = createPostgresOrderRepository({
        transaction: mockTransaction,
        ErrorClass: TestError,
    });

    await repo.cancelUserOrder({
        orderId: "order-1",
        userId: "user-1",
        reason: "Customer changed mind",
    });

    assert.equal(clientCalls.length, 3);
    assert.ok(clientCalls[1].sql.includes("UPDATE products"));
    assert.ok(clientCalls[2].sql.includes("UPDATE orders"));
});
