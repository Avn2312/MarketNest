import test from "node:test";
import assert from "node:assert/strict";
import { validateStartupEnv } from "../config/validateEnv.js";

test("validateStartupEnv passes without error in development mode", () => {
    assert.doesNotThrow(() => {
        validateStartupEnv();
    });
});
