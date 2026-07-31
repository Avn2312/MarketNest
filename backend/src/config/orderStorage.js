export const ORDER_STORAGE_MODES = {
    MONGO: "mongo",
    POSTGRES: "postgres",
};

export const getOrderStorageMode = () => {
    const rawMode = String(process.env.ORDER_STORAGE || "").trim().toLowerCase();

    if (rawMode === ORDER_STORAGE_MODES.POSTGRES) {
        return ORDER_STORAGE_MODES.POSTGRES;
    }

    if (rawMode === ORDER_STORAGE_MODES.MONGO) {
        return ORDER_STORAGE_MODES.MONGO;
    }

    return process.env.USE_POSTGRES_ORDERS === "true"
        ? ORDER_STORAGE_MODES.POSTGRES
        : ORDER_STORAGE_MODES.MONGO;
};

export const usePostgresOrderStorage = () =>
    getOrderStorageMode() === ORDER_STORAGE_MODES.POSTGRES;
