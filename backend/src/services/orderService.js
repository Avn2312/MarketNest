import mongoose from "mongoose";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import Address from "../models/Address.js";
import CustomError from "../utils/CustomError.js";
import { RAZORPAY_KEY_ID } from "../config/index.js";
import { usePostgresOrderStorage } from "../config/orderStorage.js";
import {
    calculateOrderTotals,
    getOrderSubtotal,
    getValidatedItems,
} from "./checkoutService.js";
import {
    createRazorpayOrder,
} from "./razorpayPaymentService.js";
import {
    releaseInventoryForEntries,
    releaseInventoryForOrder,
    reserveInventory,
} from "./inventoryService.js";
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
import { ORDER_EVENTS, publishOrderEvent } from "./orderEventBus.js";
import { postgresCheckoutRepository } from "../repositories/postgresCheckoutRepository.js";
import { postgresOrderRepository } from "../repositories/postgresOrderRepository.js";
import { updateRazorpayProviderOrderIdIfConfigured } from "../repositories/postgresPaymentRepository.js";

const defaultIsValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const mapOrderItems = (orderEntries) =>
    orderEntries.map(({ item }) => item);

const fromCents = (amountCents) => Number(amountCents || 0) / 100;

const mapPostgresOrderForApi = ({ order, payment }) => ({
    _id: order.id,
    id: order.id,
    userId: order.user_id,
    items: [],
    amount: fromCents(order.total_cents),
    address: order.address_id,
    couponCode: order.coupon_code || "",
    discountAmount: fromCents(order.discount_cents),
    status: order.status === "order_placed" ? "Order Placed" : order.status,
    paymentType: payment?.provider === "cod" ? "COD" : "Online",
    paymentProvider: payment?.provider || "",
    providerOrderId: payment?.provider_order_id || "",
    providerPaymentId: payment?.provider_payment_id || "",
    isPaid: payment?.status === "succeeded",
    createdAt: order.created_at,
    updatedAt: order.updated_at,
});

export const getOrderEntriesFromPopulatedOrder = async (order) => {
    const replenishedOrder = await order.populate("items.product");

    return replenishedOrder.items
        .filter((item) => item.product)
        .map((item) => ({
            item: {
                product: item.product._id,
                quantity: item.quantity,
            },
            product: item.product,
        }));
};

export const createOrderService = ({
    OrderModel = Order,
    UserModel = User,
    CouponModel = Coupon,
    AddressModel = Address,
    ErrorClass = CustomError,
    isValidObjectId = defaultIsValidObjectId,
    getItems = getValidatedItems,
    calculateTotals = calculateOrderTotals,
    createRazorpayProviderOrder = createRazorpayOrder,
    reserveInventoryForEntries = reserveInventory,
    releaseInventoryEntries = releaseInventoryForEntries,
    releaseInventoryOrder = releaseInventoryForOrder,
    publishEvent = publishOrderEvent,
    razorpayKeyId = RAZORPAY_KEY_ID,
    shouldUsePostgresOrders = usePostgresOrderStorage,
    postgresCheckout = postgresCheckoutRepository,
    postgresOrders = postgresOrderRepository,
    updateRazorpayProviderOrderId = updateRazorpayProviderOrderIdIfConfigured,
} = {}) => {
    const getValidatedAddress = async (addressId, userId) => {
        if (!addressId || !isValidObjectId(addressId)) {
            throw new ErrorClass(400, "Invalid order data");
        }

        const address = await AddressModel.findOne({
            _id: addressId,
            userId,
        }).select("_id");

        if (!address) {
            throw new ErrorClass(404, "Address not found");
        }

        return address;
    };

    const buildOrderEntries = async ({ items, address, userId }) => {
        if (!address || !items || items.length === 0) {
            throw new ErrorClass(400, "Invalid order data");
        }

        const [orderEntries, validatedAddress] = await Promise.all([
            getItems(items),
            getValidatedAddress(address, userId),
        ]);

        return { orderEntries, validatedAddress };
    };

    const reserveEntriesAndPublish = async ({ orderEntries, userId }) => {
        await reserveInventoryForEntries(orderEntries);
        await publishEvent(ORDER_EVENTS.INVENTORY_RESERVED, {
            userId,
            items: orderEntries.map(({ item, product }) => ({
                productId: product._id,
                quantity: item.quantity,
            })),
        });
    };

    const publishCreated = async (order) => {
        await publishEvent(ORDER_EVENTS.ORDER_CREATED, {
            orderId: order._id,
            userId: order.userId,
            paymentType: order.paymentType,
            amount: order.amount,
        });
    };

    const confirmOrderSideEffects = async ({ order, userId, coupon }) => {
        if (coupon) {
            await CouponModel.findByIdAndUpdate(coupon._id, {
                $inc: { usedCount: 1 },
            });
        }

        if (userId) {
            await UserModel.findByIdAndUpdate(userId, { cartItems: {} });
        }

        await publishEvent(ORDER_EVENTS.ORDER_CONFIRMED, {
            orderId: order._id,
            userId,
            paymentType: order.paymentType,
        });
    };

    const createCodOrder = async ({ items, address, couponCode, userId }) => {
        if (shouldUsePostgresOrders()) {
            const { order, payment } =
                await postgresCheckout.createOrderWithInventoryReservation({
                    userId: userId.toString(),
                    addressId: address,
                    items,
                    couponCode,
                    paymentProvider: "cod",
                });
            const mappedOrder = mapPostgresOrderForApi({ order, payment });

            await publishEvent(ORDER_EVENTS.ORDER_CREATED, {
                orderId: mappedOrder._id,
                userId: mappedOrder.userId,
                paymentType: mappedOrder.paymentType,
                amount: mappedOrder.amount,
            });
            await publishEvent(ORDER_EVENTS.ORDER_CONFIRMED, {
                orderId: mappedOrder._id,
                userId: mappedOrder.userId,
                paymentType: mappedOrder.paymentType,
            });

            return mappedOrder;
        }

        const { orderEntries, validatedAddress } = await buildOrderEntries({
            items,
            address,
            userId,
        });
        const subtotal = getOrderSubtotal(orderEntries);
        const {
            amount,
            coupon,
            couponCode: appliedCouponCode,
            discountAmount,
        } = await calculateTotals(subtotal, couponCode);

        await reserveEntriesAndPublish({ orderEntries, userId });

        let order;

        try {
            order = await OrderModel.create({
                userId,
                items: mapOrderItems(orderEntries),
                amount,
                address: validatedAddress._id,
                couponCode: appliedCouponCode,
                discountAmount,
                paymentType: "COD",
            });
        } catch (error) {
            await releaseInventoryEntries(orderEntries);
            throw error;
        }

        await publishCreated(order);
        await confirmOrderSideEffects({ order, userId, coupon });

        return order;
    };

    const createRazorpayOrderForCheckout = async ({
        items,
        address,
        couponCode,
        userId,
    }) => {
        if (shouldUsePostgresOrders()) {
            const { order, payment } =
                await postgresCheckout.createOrderWithInventoryReservation({
                    userId: userId.toString(),
                    addressId: address,
                    items,
                    couponCode,
                    paymentProvider: "razorpay",
                });

            let razorpayOrder;

            try {
                razorpayOrder = await createRazorpayProviderOrder({
                    internalOrderId: order.id,
                    amount: fromCents(order.total_cents),
                    userId,
                });
                await updateRazorpayProviderOrderId({
                    internalOrderId: order.id,
                    providerOrderId: razorpayOrder.id,
                });
                await publishEvent(ORDER_EVENTS.ORDER_CREATED, {
                    orderId: order.id,
                    userId: order.user_id,
                    paymentType: "Online",
                    amount: fromCents(order.total_cents),
                });
            } catch (error) {
                if (postgresCheckout.releasePendingOrderInventory) {
                    await postgresCheckout.releasePendingOrderInventory({
                        orderId: order.id,
                    });
                }
                throw error;
            }

            return {
                key: razorpayKeyId,
                orderId: order.id,
                razorpayOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                newOrder: mapPostgresOrderForApi({
                    order,
                    payment: {
                        ...payment,
                        provider_order_id: razorpayOrder.id,
                    },
                }),
            };
        }

        const { orderEntries, validatedAddress } = await buildOrderEntries({
            items,
            address,
            userId,
        });
        const subtotal = getOrderSubtotal(orderEntries);
        const {
            amount,
            couponCode: appliedCouponCode,
            discountAmount,
        } = await calculateTotals(subtotal, couponCode);

        await reserveEntriesAndPublish({ orderEntries, userId });

        let order;

        try {
            order = await OrderModel.create({
                userId,
                items: mapOrderItems(orderEntries),
                amount,
                address: validatedAddress._id,
                couponCode: appliedCouponCode,
                discountAmount,
                paymentType: "Online",
                paymentProvider: "razorpay",
            });
        } catch (error) {
            await releaseInventoryEntries(orderEntries);
            throw error;
        }

        let razorpayOrder;

        try {
            razorpayOrder = await createRazorpayProviderOrder({
                internalOrderId: order._id,
                amount,
                userId,
            });
            await OrderModel.findByIdAndUpdate(order._id, {
                providerOrderId: razorpayOrder.id,
            });
            await publishCreated(order);
        } catch (error) {
            await releaseInventoryEntries(orderEntries);
            await OrderModel.findByIdAndDelete(order._id);
            throw error;
        }

        return {
            key: razorpayKeyId,
            orderId: order._id,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
        };
    };

    const markOrderPaidFromPayment = async ({
        orderId,
        userId,
        providerPaymentId,
        providerOrderId,
    }) => {
        const order = await OrderModel.findOneAndUpdate(
            {
                _id: orderId,
                isPaid: false,
                ...(providerOrderId ? { providerOrderId } : {}),
            },
            {
                isPaid: true,
                providerPaymentId: providerPaymentId || "",
                providerOrderId: providerOrderId || "",
            },
            { new: true }
        );

        if (!order) {
            return null;
        }

        if (order.couponCode) {
            await CouponModel.findOneAndUpdate(
                { code: order.couponCode },
                { $inc: { usedCount: 1 } }
            );
        }

        if (userId) {
            await UserModel.findByIdAndUpdate(userId, { cartItems: {} });
        }

        await publishEvent(ORDER_EVENTS.PAYMENT_SUCCEEDED, {
            orderId,
            userId,
            providerPaymentId,
            providerOrderId,
        });
        await publishEvent(ORDER_EVENTS.ORDER_CONFIRMED, {
            orderId,
            userId,
            paymentType: order.paymentType,
        });

        return order;
    };

    const releaseOrderFromFailedPayment = async ({ orderId, providerOrderId }) => {
        const order = await OrderModel.findOne({
            _id: orderId,
            ...(providerOrderId ? { providerOrderId } : {}),
        }).populate("items.product");

        if (!order || order.isPaid) return null;

        await releaseInventoryOrder(order);
        await OrderModel.findByIdAndDelete(orderId);

        return order;
    };

    const getUserOrders = async (userId) => {
        if (shouldUsePostgresOrders()) {
            return postgresOrders.getUserOrders(userId.toString());
        }

        return OrderModel.find({
            userId,
            $or: [{ paymentType: "COD" }, { isPaid: true }],
        })
            .populate("items.product address")
            .sort({ createdAt: -1 });
    };

    const getAllOrders = async () => {
        if (shouldUsePostgresOrders()) {
            return postgresOrders.getAllOrders();
        }

        return OrderModel.find({
            $or: [{ paymentType: "COD" }, { isPaid: true }],
        })
            .populate("items.product address")
            .sort({ createdAt: -1 });
    };

    const cancelUserOrder = async ({ orderId, userId, reason = "" }) => {
        if (shouldUsePostgresOrders()) {
            await postgresOrders.cancelUserOrder({
                orderId: orderId.toString(),
                userId: userId.toString(),
                reason,
            });
            await publishEvent(ORDER_EVENTS.ORDER_CANCELLED, {
                orderId,
                userId,
                reason,
            });
            return;
        }

        const order = await OrderModel.findOne({
            _id: orderId,
            userId,
        });

        if (!order) {
            throw new ErrorClass(404, "Order not found");
        }

        assertOrderCanBeCancelled(order);
        await releaseInventoryOrder(order);

        await OrderModel.findByIdAndUpdate(orderId, {
            status: ORDER_STATUS.CANCELLED,
            cancelReason: reason,
        });

        await publishEvent(ORDER_EVENTS.ORDER_CANCELLED, {
            orderId,
            userId,
            reason,
        });
    };

    const requestReturn = async ({ orderId, userId, reason = "" }) => {
        const order = await OrderModel.findOne({
            _id: orderId,
            userId,
        });

        if (!order) {
            throw new ErrorClass(404, "Order not found");
        }

        assertReturnCanBeRequested(order);

        await OrderModel.findByIdAndUpdate(orderId, {
            returnStatus: RETURN_STATUS.REQUESTED,
            returnReason: reason,
        });

        await publishEvent(ORDER_EVENTS.RETURN_REQUESTED, {
            orderId,
            userId,
            reason,
        });
    };

    const deleteOrder = async (orderId) => {
        const order = await OrderModel.findById(orderId);

        if (!order) {
            throw new ErrorClass(404, "Order not found");
        }

        if (shouldReleaseInventoryForStatus(order.status)) {
            await releaseInventoryOrder(order);
        }

        await OrderModel.findByIdAndDelete(orderId);
    };

    const changeOrderStatus = async ({ orderId, status, returnStatus }) => {
        const updates = buildOrderStatusUpdates({ status, returnStatus });
        const order = await OrderModel.findById(orderId);

        if (!order) {
            throw new ErrorClass(404, "Order not found");
        }

        const inventoryAction = getInventoryActionForOrderUpdate({
            currentStatus: order.status,
            nextStatus: status,
            currentReturnStatus: order.returnStatus,
            nextReturnStatus: returnStatus,
        });

        if (inventoryAction === INVENTORY_ACTION.RELEASE) {
            await releaseInventoryOrder(order);
        }

        if (inventoryAction === INVENTORY_ACTION.RESERVE) {
            await reserveInventoryForEntries(
                await getOrderEntriesFromPopulatedOrder(order)
            );
        }

        await OrderModel.findByIdAndUpdate(orderId, updates);

        if (updates.status === ORDER_STATUS.CANCELLED) {
            await publishEvent(ORDER_EVENTS.ORDER_CANCELLED, {
                orderId,
                userId: order.userId,
                reason: order.cancelReason || "",
            });
        } else if (updates.status) {
            await publishEvent(ORDER_EVENTS.ORDER_STATUS_UPDATED, {
                orderId,
                userId: order.userId,
                status: updates.status,
                previousStatus: order.status,
            });
        }

        if (updates.returnStatus === RETURN_STATUS.REQUESTED) {
            await publishEvent(ORDER_EVENTS.RETURN_REQUESTED, {
                orderId,
                userId: order.userId,
                reason: order.returnReason || "",
            });
        } else if (updates.returnStatus) {
            await publishEvent(ORDER_EVENTS.RETURN_STATUS_UPDATED, {
                orderId,
                userId: order.userId,
                returnStatus: updates.returnStatus,
                previousReturnStatus: order.returnStatus,
            });
        }
    };

    return {
        cancelUserOrder,
        changeOrderStatus,
        createCodOrder,
        createRazorpayOrderForCheckout,
        deleteOrder,
        getAllOrders,
        getUserOrders,
        markOrderPaidFromPayment,
        releaseOrderFromFailedPayment,
        requestReturn,
    };
};

const orderService = createOrderService();

export const cancelUserOrder = orderService.cancelUserOrder;
export const changeOrderStatusBySeller = orderService.changeOrderStatus;
export const createCodOrder = orderService.createCodOrder;
export const createRazorpayOrderForCheckout =
    orderService.createRazorpayOrderForCheckout;
export const deleteOrder = orderService.deleteOrder;
export const getAllOrders = orderService.getAllOrders;
export const getUserOrders = orderService.getUserOrders;
export const markOrderPaidFromPayment = orderService.markOrderPaidFromPayment;
export const releaseOrderFromFailedPayment =
    orderService.releaseOrderFromFailedPayment;
export const requestReturn = orderService.requestReturn;
