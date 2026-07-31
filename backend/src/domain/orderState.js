import CustomError from "../utils/CustomError.js";

export const ORDER_STATUS = {
    PLACED: "Order Placed",
    PROCESSING: "Processing",
    SHIPPED: "Shipped",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
};

export const RETURN_STATUS = {
    NONE: "none",
    REQUESTED: "requested",
    APPROVED: "approved",
    REJECTED: "rejected",
    COMPLETED: "completed",
};

export const INVENTORY_ACTION = {
    NONE: "none",
    RESERVE: "reserve",
    RELEASE: "release",
};

const NON_RELEASABLE_STATUSES = [
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.DELIVERED,
];

export const shouldReleaseInventoryForStatus = (status) =>
    !NON_RELEASABLE_STATUSES.includes(status);

export const assertOrderCanBeCancelled = (order) => {
    if ([ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED].includes(order.status)) {
        throw new CustomError(400, "This order can no longer be cancelled");
    }

    if (order.status === ORDER_STATUS.CANCELLED) {
        throw new CustomError(400, "Order is already cancelled");
    }
};

export const assertReturnCanBeRequested = (order) => {
    if (order.status !== ORDER_STATUS.DELIVERED) {
        throw new CustomError(400, "Return requests are available after delivery");
    }

    if (order.returnStatus !== RETURN_STATUS.NONE) {
        throw new CustomError(400, "Return request already submitted");
    }
};

export const getInventoryActionForOrderUpdate = ({
    currentStatus,
    nextStatus,
    currentReturnStatus,
    nextReturnStatus,
}) => {
    if (
        nextReturnStatus === RETURN_STATUS.COMPLETED &&
        currentReturnStatus !== RETURN_STATUS.COMPLETED
    ) {
        return INVENTORY_ACTION.RELEASE;
    }

    if (
        nextStatus &&
        currentStatus !== ORDER_STATUS.CANCELLED &&
        nextStatus === ORDER_STATUS.CANCELLED
    ) {
        return INVENTORY_ACTION.RELEASE;
    }

    if (
        nextStatus &&
        currentStatus === ORDER_STATUS.CANCELLED &&
        nextStatus !== ORDER_STATUS.CANCELLED
    ) {
        return INVENTORY_ACTION.RESERVE;
    }

    return INVENTORY_ACTION.NONE;
};

export const buildOrderStatusUpdates = ({ status, returnStatus }) => {
    if (!status && !returnStatus) {
        throw new CustomError(400, "Invalid update payload");
    }

    const updates = {};

    if (status) {
        updates.status = status;
    }

    if (returnStatus) {
        updates.returnStatus = returnStatus;

        if (returnStatus === RETURN_STATUS.COMPLETED) {
            updates.status = ORDER_STATUS.CANCELLED;
        }
    }

    return updates;
};
