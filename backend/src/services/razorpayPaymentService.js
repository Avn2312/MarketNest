import crypto from "node:crypto";
import CustomError from "../utils/CustomError.js";
import PaymentEvent from "../models/PaymentEvent.js";
import {
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET,
} from "../config/index.js";
import {
    PAYMENT_EVENTS,
    publishPaymentEvent,
} from "./paymentEventBus.js";
import {
    markRazorpayPaymentFailedIfConfigured,
    markRazorpayPaymentSucceededIfConfigured,
} from "../repositories/postgresPaymentRepository.js";

const RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";
const RAZORPAY_PAYMENTS_URL = "https://api.razorpay.com/v1/payments";

export const assertRazorpayConfigured = ({
    keyId = RAZORPAY_KEY_ID,
    keySecret = RAZORPAY_KEY_SECRET,
    ErrorClass = CustomError,
} = {}) => {
    if (!keyId || !keySecret) {
        throw new ErrorClass(500, "Razorpay is not configured");
    }
};

export const assertRazorpayWebhookConfigured = ({
    webhookSecret = RAZORPAY_WEBHOOK_SECRET,
    ErrorClass = CustomError,
} = {}) => {
    if (!webhookSecret) {
        throw new ErrorClass(500, "Razorpay webhook is not configured");
    }
};

export const toRazorpayPaise = (amount) => Math.round(Number(amount) * 100);

const getRazorpayAuthHeader = ({ keyId, keySecret }) =>
    `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

const timingSafeEqual = (left, right) => {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return (
        leftBuffer.length === rightBuffer.length &&
        crypto.timingSafeEqual(leftBuffer, rightBuffer)
    );
};

export const signRazorpayPayload = (payload, secret) =>
    crypto.createHmac("sha256", secret).update(payload).digest("hex");

export const verifyRazorpaySignature = ({ payload, signature, secret }) => {
    if (!signature || !secret) return false;

    const expectedSignature = signRazorpayPayload(payload, secret);
    return timingSafeEqual(expectedSignature, signature);
};

export const verifyRazorpayCheckoutSignature = ({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    keySecret = RAZORPAY_KEY_SECRET,
    ErrorClass = CustomError,
}) => {
    if (!keySecret) {
        throw new ErrorClass(500, "Razorpay is not configured");
    }

    const isValid = verifyRazorpaySignature({
        payload: `${razorpayOrderId}|${razorpayPaymentId}`,
        signature: razorpaySignature,
        secret: keySecret,
    });

    if (!isValid) {
        throw new ErrorClass(400, "Invalid Razorpay payment signature");
    }
};

export const createRazorpayOrder = async ({
    internalOrderId,
    amount,
    userId,
    currency = "INR",
    keyId = RAZORPAY_KEY_ID,
    keySecret = RAZORPAY_KEY_SECRET,
    fetchImpl = fetch,
    ErrorClass = CustomError,
}) => {
    assertRazorpayConfigured({ keyId, keySecret, ErrorClass });

    const response = await fetchImpl(RAZORPAY_ORDERS_URL, {
        method: "POST",
        headers: {
            Authorization: getRazorpayAuthHeader({ keyId, keySecret }),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            amount: toRazorpayPaise(amount),
            currency,
            receipt: internalOrderId.toString(),
            notes: {
                internalOrderId: internalOrderId.toString(),
                userId: userId.toString(),
            },
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new ErrorClass(
            response.status,
            data?.error?.description || "Unable to create Razorpay order"
        );
    }

    return data;
};

export const fetchRazorpayPayment = async ({
    razorpayPaymentId,
    keyId = RAZORPAY_KEY_ID,
    keySecret = RAZORPAY_KEY_SECRET,
    fetchImpl = fetch,
    ErrorClass = CustomError,
}) => {
    assertRazorpayConfigured({ keyId, keySecret, ErrorClass });

    const response = await fetchImpl(`${RAZORPAY_PAYMENTS_URL}/${razorpayPaymentId}`, {
        method: "GET",
        headers: {
            Authorization: getRazorpayAuthHeader({ keyId, keySecret }),
        },
    });
    const data = await response.json();

    if (!response.ok) {
        throw new ErrorClass(
            response.status,
            data?.error?.description || "Unable to fetch Razorpay payment"
        );
    }

    return data;
};

export const fetchRazorpayOrderPayments = async ({
    razorpayOrderId,
    keyId = RAZORPAY_KEY_ID,
    keySecret = RAZORPAY_KEY_SECRET,
    fetchImpl = fetch,
    ErrorClass = CustomError,
}) => {
    assertRazorpayConfigured({ keyId, keySecret, ErrorClass });

    const response = await fetchImpl(
        `${RAZORPAY_ORDERS_URL}/${razorpayOrderId}/payments`,
        {
            method: "GET",
            headers: {
                Authorization: getRazorpayAuthHeader({ keyId, keySecret }),
            },
        }
    );
    const data = await response.json();

    if (!response.ok) {
        throw new ErrorClass(
            response.status,
            data?.error?.description || "Unable to fetch Razorpay order payments"
        );
    }

    return data.items || [];
};

export const assertRazorpayPaymentMatchesCallback = ({
    payment,
    razorpayOrderId,
    razorpayPaymentId,
    ErrorClass = CustomError,
}) => {
    if (payment.id !== razorpayPaymentId || payment.order_id !== razorpayOrderId) {
        throw new ErrorClass(400, "Razorpay payment does not match checkout data");
    }
};

const getRazorpayEntity = (event, entityName) =>
    event?.payload?.[entityName]?.entity || null;

export const getInternalOrderIdFromRazorpayEvent = (event) => {
    const payment = getRazorpayEntity(event, "payment");
    const order = getRazorpayEntity(event, "order");

    return (
        payment?.notes?.internalOrderId ||
        order?.notes?.internalOrderId ||
        order?.receipt ||
        null
    );
};

export const getUserIdFromRazorpayEvent = (event) => {
    const payment = getRazorpayEntity(event, "payment");
    const order = getRazorpayEntity(event, "order");

    return payment?.notes?.userId || order?.notes?.userId || null;
};

export const getProviderOrderIdFromRazorpayEvent = (event) => {
    const payment = getRazorpayEntity(event, "payment");
    const order = getRazorpayEntity(event, "order");

    return payment?.order_id || order?.id || "";
};

export const getProviderPaymentIdFromRazorpayEvent = (event) => {
    const payment = getRazorpayEntity(event, "payment");

    return payment?.id || "";
};

export const normalizeRazorpayPaymentEvent = (event) => {
    const orderId = getInternalOrderIdFromRazorpayEvent(event);
    const userId = getUserIdFromRazorpayEvent(event);

    return {
        provider: "razorpay",
        providerEventId: event.id,
        eventType: event.event,
        orderId,
        userId,
        providerOrderId: getProviderOrderIdFromRazorpayEvent(event),
        providerPaymentId: getProviderPaymentIdFromRazorpayEvent(event),
        payload: event,
    };
};

export const persistPaymentEvent = async (
    eventData,
    { PaymentEventModel = PaymentEvent } = {}
) => {
    try {
        return {
            duplicate: false,
            paymentEvent: await PaymentEventModel.create(eventData),
        };
    } catch (error) {
        if (error?.code === 11000) {
            return { duplicate: true, paymentEvent: null };
        }

        throw error;
    }
};

const getPaymentBusEventName = (eventType) => {
    if (["payment.captured", "order.paid"].includes(eventType)) {
        return PAYMENT_EVENTS.PAYMENT_SUCCEEDED;
    }

    if (["payment.failed"].includes(eventType)) {
        return PAYMENT_EVENTS.PAYMENT_FAILED;
    }

    return null;
};

const syncRazorpayPaymentState = async ({
    event,
    markPaymentSucceeded,
    markPaymentFailed,
}) => {
    if (event.eventType === "payment.captured" || event.eventType === "order.paid") {
        await markPaymentSucceeded({
            providerOrderId: event.providerOrderId,
            providerPaymentId: event.providerPaymentId,
            amount: event.payload?.payload?.payment?.entity?.amount,
            currency: event.payload?.payload?.payment?.entity?.currency,
        });
    }

    if (event.eventType === "payment.failed") {
        await markPaymentFailed({
            providerOrderId: event.providerOrderId,
            providerPaymentId: event.providerPaymentId,
        });
    }
};

export const processRazorpayWebhook = async ({
    rawBody,
    signature,
    webhookSecret = RAZORPAY_WEBHOOK_SECRET,
    PaymentEventModel = PaymentEvent,
    publish = publishPaymentEvent,
    markPaymentSucceeded = markRazorpayPaymentSucceededIfConfigured,
    markPaymentFailed = markRazorpayPaymentFailedIfConfigured,
    ErrorClass = CustomError,
}) => {
    assertRazorpayWebhookConfigured({ webhookSecret, ErrorClass });

    const bodyText = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
    const isValid = verifyRazorpaySignature({
        payload: bodyText,
        signature,
        secret: webhookSecret,
    });

    if (!isValid) {
        throw new ErrorClass(400, "Invalid Razorpay webhook signature");
    }

    const event = JSON.parse(bodyText);
    const normalizedEvent = normalizeRazorpayPaymentEvent(event);
    const { duplicate, paymentEvent } = await persistPaymentEvent(
        normalizedEvent,
        { PaymentEventModel }
    );

    if (duplicate) {
        return { duplicate: true, event: normalizedEvent };
    }

    const busEventName = getPaymentBusEventName(normalizedEvent.eventType);

    if (busEventName && normalizedEvent.orderId) {
        await syncRazorpayPaymentState({
            event: normalizedEvent,
            markPaymentSucceeded,
            markPaymentFailed,
        });
        await publish(busEventName, normalizedEvent);

        if (paymentEvent?.updateOne) {
            await paymentEvent.updateOne({ processedAt: new Date() });
        }
    }

    return { duplicate: false, event: normalizedEvent };
};

export const processRazorpayCheckoutVerification = async ({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    orderId,
    userId,
    keyId = RAZORPAY_KEY_ID,
    keySecret = RAZORPAY_KEY_SECRET,
    fetchPayment = fetchRazorpayPayment,
    PaymentEventModel = PaymentEvent,
    publish = publishPaymentEvent,
    markPaymentSucceeded = markRazorpayPaymentSucceededIfConfigured,
    ErrorClass = CustomError,
}) => {
    verifyRazorpayCheckoutSignature({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        keySecret,
        ErrorClass,
    });

    const payment = await fetchPayment({
        razorpayPaymentId,
        keyId,
        keySecret,
        ErrorClass,
    });
    assertRazorpayPaymentMatchesCallback({
        payment,
        razorpayOrderId,
        razorpayPaymentId,
        ErrorClass,
    });

    const isCaptured = payment.status === "captured";

    const eventData = {
        provider: "razorpay",
        providerEventId: `frontend:${razorpayPaymentId}`,
        eventType: isCaptured
            ? "payment.frontend_verified_captured"
            : "payment.frontend_verified_pending",
        orderId,
        userId,
        providerOrderId: razorpayOrderId,
        providerPaymentId: razorpayPaymentId,
        payload: {
            razorpayOrderId,
            razorpayPaymentId,
            paymentStatus: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            orderId,
            userId,
        },
    };
    const { duplicate, paymentEvent } = await persistPaymentEvent(eventData, {
        PaymentEventModel,
    });

    if (duplicate) {
        return { duplicate: true, event: eventData };
    }

    if (isCaptured) {
        await markPaymentSucceeded({
            providerOrderId: razorpayOrderId,
            providerPaymentId: razorpayPaymentId,
            amount: payment.amount,
            currency: payment.currency,
        });
        await publish(PAYMENT_EVENTS.PAYMENT_SUCCEEDED, eventData);
    }

    if (paymentEvent?.updateOne) {
        await paymentEvent.updateOne({ processedAt: new Date() });
    }

    return { duplicate: false, event: eventData, paymentStatus: payment.status };
};

export const reconcileRazorpayOrderPayments = async ({
    razorpayOrderId,
    orderId,
    userId,
    keyId = RAZORPAY_KEY_ID,
    keySecret = RAZORPAY_KEY_SECRET,
    fetchOrderPayments = fetchRazorpayOrderPayments,
    PaymentEventModel = PaymentEvent,
    publish = publishPaymentEvent,
    markPaymentSucceeded = markRazorpayPaymentSucceededIfConfigured,
    ErrorClass = CustomError,
}) => {
    const payments = await fetchOrderPayments({
        razorpayOrderId,
        keyId,
        keySecret,
        ErrorClass,
    });
    const capturedPayment = payments.find(
        (payment) =>
            payment.order_id === razorpayOrderId && payment.status === "captured"
    );

    if (!capturedPayment) {
        return { reconciled: false, paymentStatus: "not_captured" };
    }

    const eventData = {
        provider: "razorpay",
        providerEventId: `reconciliation:${capturedPayment.id}`,
        eventType: "payment.reconciled_captured",
        orderId,
        userId,
        providerOrderId: razorpayOrderId,
        providerPaymentId: capturedPayment.id,
        payload: {
            razorpayOrderId,
            razorpayPaymentId: capturedPayment.id,
            paymentStatus: capturedPayment.status,
            amount: capturedPayment.amount,
            currency: capturedPayment.currency,
            orderId,
            userId,
        },
    };
    const { duplicate, paymentEvent } = await persistPaymentEvent(eventData, {
        PaymentEventModel,
    });

    if (duplicate) {
        return { reconciled: true, duplicate: true, event: eventData };
    }

    await markPaymentSucceeded({
        providerOrderId: razorpayOrderId,
        providerPaymentId: capturedPayment.id,
        amount: capturedPayment.amount,
        currency: capturedPayment.currency,
    });
    await publish(PAYMENT_EVENTS.PAYMENT_SUCCEEDED, eventData);

    if (paymentEvent?.updateOne) {
        await paymentEvent.updateOne({ processedAt: new Date() });
    }

    return { reconciled: true, duplicate: false, event: eventData };
};
