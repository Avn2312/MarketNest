import test from "node:test";
import assert from "node:assert/strict";
import {
    INVENTORY_ACTION,
    ORDER_STATUS,
    RETURN_STATUS,
    assertOrderCanBeCancelled,
    assertReturnCanBeRequested,
    buildOrderStatusUpdates,
    getInventoryActionForOrderUpdate,
    shouldReleaseInventoryForStatus,
} from "../domain/orderState.js";

test("order state rejects cancellation after shipment", () => {
    assert.throws(
        () => assertOrderCanBeCancelled({ status: ORDER_STATUS.SHIPPED }),
        /can no longer be cancelled/
    );
});

test("order state allows return requests only after delivery", () => {
    assert.doesNotThrow(() =>
        assertReturnCanBeRequested({
            status: ORDER_STATUS.DELIVERED,
            returnStatus: RETURN_STATUS.NONE,
        })
    );

    assert.throws(
        () =>
            assertReturnCanBeRequested({
                status: ORDER_STATUS.PROCESSING,
                returnStatus: RETURN_STATUS.NONE,
            }),
        /after delivery/
    );
});

test("order state describes inventory action for status transitions", () => {
    assert.equal(
        getInventoryActionForOrderUpdate({
            currentStatus: ORDER_STATUS.PROCESSING,
            nextStatus: ORDER_STATUS.CANCELLED,
            currentReturnStatus: RETURN_STATUS.NONE,
        }),
        INVENTORY_ACTION.RELEASE
    );

    assert.equal(
        getInventoryActionForOrderUpdate({
            currentStatus: ORDER_STATUS.CANCELLED,
            nextStatus: ORDER_STATUS.PROCESSING,
            currentReturnStatus: RETURN_STATUS.NONE,
        }),
        INVENTORY_ACTION.RESERVE
    );
});

test("order state forces completed returns to cancelled order status", () => {
    assert.deepEqual(
        buildOrderStatusUpdates({ returnStatus: RETURN_STATUS.COMPLETED }),
        {
            returnStatus: RETURN_STATUS.COMPLETED,
            status: ORDER_STATUS.CANCELLED,
        }
    );
});

test("order delete releases inventory only before fulfillment leaves the warehouse", () => {
    assert.equal(shouldReleaseInventoryForStatus(ORDER_STATUS.PROCESSING), true);
    assert.equal(shouldReleaseInventoryForStatus(ORDER_STATUS.SHIPPED), false);
    assert.equal(shouldReleaseInventoryForStatus(ORDER_STATUS.DELIVERED), false);
});
