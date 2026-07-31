import test from "node:test";
import assert from "node:assert/strict";
import {
    calculateOrderTotals,
    getOrderSubtotal,
    getValidatedItems,
} from "../services/checkoutService.js";

class TestError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

test("checkout totals apply percent coupon, cap discount, and add tax", async () => {
    const CouponModel = {
        findOne: async () => ({
            _id: "coupon-1",
            code: "SAVE50",
            type: "percent",
            value: 50,
            minOrder: 100,
            usageLimit: 10,
            usedCount: 2,
            isActive: true,
            expiresAt: new Date(Date.now() + 60_000),
        }),
    };

    const totals = await calculateOrderTotals(200, "save50", {
        CouponModel,
        ErrorClass: TestError,
    });

    assert.equal(totals.amount, 104);
    assert.equal(totals.discountAmount, 100);
    assert.equal(totals.tax, 4);
    assert.equal(totals.couponCode, "SAVE50");
});

test("checkout rejects exhausted coupon usage", async () => {
    const CouponModel = {
        findOne: async () => ({
            code: "USEDUP",
            type: "flat",
            value: 20,
            minOrder: 0,
            usageLimit: 5,
            usedCount: 5,
            isActive: true,
            expiresAt: null,
        }),
    };

    await assert.rejects(
        () =>
            calculateOrderTotals(200, "USEDUP", {
                CouponModel,
                ErrorClass: TestError,
            }),
        /usage limit/
    );
});

test("checkout validates products and calculates subtotal from DB prices", async () => {
    const ProductModel = {
        find: async () => [
            { _id: "p1", name: "Milk", offerPrice: 40 },
            { _id: "p2", name: "Rice", offerPrice: 120 },
        ],
    };

    const entries = await getValidatedItems(
        [
            { product: "p1", quantity: 2 },
            { product: "p2", quantity: 1 },
        ],
        { ProductModel, ErrorClass: TestError }
    );

    assert.equal(entries.length, 2);
    assert.equal(getOrderSubtotal(entries), 200);
});

test("checkout rejects invalid item quantities", async () => {
    await assert.rejects(
        () =>
            getValidatedItems([{ product: "p1", quantity: 0 }], {
                ProductModel: { find: async () => [] },
                ErrorClass: TestError,
            }),
        /Invalid order items/
    );
});
