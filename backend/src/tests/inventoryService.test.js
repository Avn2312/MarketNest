import test from "node:test";
import assert from "node:assert/strict";
import { createInventoryService } from "../services/inventoryService.js";

class TestError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

test("inventory reservation rolls back already reserved products when a later item is out of stock", async () => {
    const calls = {
        decrements: [],
        increments: [],
    };
    const ProductModel = {
        findOneAndUpdate: async (query) => {
            calls.decrements.push(query._id);
            return query._id === "p1" ? { _id: "p1" } : null;
        },
        findById: async () => ({
            _id: "p2",
            name: "Rice",
            stockQuantity: 1,
            inStock: true,
        }),
        findByIdAndUpdate: async (productId) => {
            calls.increments.push(productId);
            return { _id: productId };
        },
    };
    const inventory = createInventoryService({ ProductModel, ErrorClass: TestError });

    await assert.rejects(
        () =>
            inventory.reserveInventory([
                {
                    product: { _id: "p1", name: "Milk" },
                    item: { quantity: 2 },
                },
                {
                    product: { _id: "p2", name: "Rice" },
                    item: { quantity: 3 },
                },
            ]),
        /Rice has only 1 item/
    );

    assert.deepEqual(calls.decrements, ["p1", "p2"]);
    assert.deepEqual(calls.increments, ["p1"]);
});

test("inventory release increments each populated order item", async () => {
    const released = [];
    const ProductModel = {
        findByIdAndUpdate: async (productId) => {
            released.push(productId);
            return { _id: productId };
        },
    };
    const inventory = createInventoryService({ ProductModel, ErrorClass: TestError });

    await inventory.releaseInventoryForOrder({
        items: [
            { product: { _id: "p1" }, quantity: 2 },
            { product: { _id: "p2" }, quantity: 1 },
        ],
    });

    assert.deepEqual(released, ["p1", "p2"]);
});
