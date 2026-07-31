import pg from "pg";
import { DATABASE_URL, NODE_ENV } from "../config/index.js";

const { Pool } = pg;

let pool;

export const createPostgresPool = (connectionString = DATABASE_URL) => {
    if (!connectionString) {
        throw new Error("DATABASE_URL is not configured.");
    }

    const sanitizedConnectionString =
        connectionString.includes("sslmode=require") &&
        !connectionString.includes("uselibpqcompat")
            ? connectionString.replace(
                  "sslmode=require",
                  "uselibpqcompat=true&sslmode=require"
              )
            : connectionString;

    return new Pool({
        connectionString: sanitizedConnectionString,
        ssl:
            NODE_ENV === "production"
                ? { rejectUnauthorized: false }
                : undefined,
    });
};

export const getPostgresPool = () => {
    if (!pool) {
        pool = createPostgresPool();
    }

    return pool;
};

export const closePostgresPool = async () => {
    if (pool) {
        await pool.end();
        pool = undefined;
    }
};

export const withPostgresTransaction = async (operation, client = null) => {
    const transactionClient = client || (await getPostgresPool().connect());
    const shouldRelease = !client;

    try {
        await transactionClient.query("BEGIN");
        const result = await operation(transactionClient);
        await transactionClient.query("COMMIT");
        return result;
    } catch (error) {
        await transactionClient.query("ROLLBACK");
        throw error;
    } finally {
        if (shouldRelease) {
            transactionClient.release();
        }
    }
};

export const queryPostgres = async (sql, params = []) => {
    return getPostgresPool().query(sql, params);
};

export const getPostgresHealth = async () => {
    try {
        await getPostgresPool().query("SELECT 1");
        return "connected";
    } catch {
        return "disconnected";
    }
};
