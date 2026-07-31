import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closePostgresPool, getPostgresPool } from "./postgres.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "migrations");

const ensureMigrationTable = async (client) => {
    await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);
};

const getAppliedMigrations = async (client) => {
    const result = await client.query("SELECT id FROM schema_migrations");
    return new Set(result.rows.map((row) => row.id));
};

export const runMigrations = async ({ pool = getPostgresPool() } = {}) => {
    const client = await pool.connect();

    try {
        await ensureMigrationTable(client);
        const appliedMigrations = await getAppliedMigrations(client);
        const files = (await fs.readdir(migrationsDir))
            .filter((file) => file.endsWith(".sql"))
            .sort();
        const applied = [];

        for (const file of files) {
            if (appliedMigrations.has(file)) continue;

            const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
            await client.query("BEGIN");
            try {
                await client.query(sql);
                await client.query(
                    "INSERT INTO schema_migrations (id) VALUES ($1)",
                    [file]
                );
                await client.query("COMMIT");
                applied.push(file);
            } catch (error) {
                await client.query("ROLLBACK");
                throw error;
            }
        }

        return applied;
    } finally {
        client.release();
    }
};

if (process.argv[1] === __filename) {
    runMigrations()
        .then((applied) => {
            if (applied.length === 0) {
                console.log("PostgreSQL schema is already up to date");
            } else {
                console.log(`Applied migrations: ${applied.join(", ")}`);
            }
        })
        .finally(closePostgresPool);
}
