import assert from "node:assert/strict";
import test from "node:test";
import { isTransientNetworkError } from "./transient.js";

test("detects a dropped socket reported on the cause chain", () => {
  const wrapped = new Error("Connection error.", { cause: new Error("fetch failed") });
  assert.equal(isTransientNetworkError(wrapped), true);
});

test("detects a plain request timeout", () => {
  assert.equal(isTransientNetworkError(new Error("Request timed out.")), true);
});

test("does not treat a bad request as transient", () => {
  assert.equal(isTransientNetworkError(Object.assign(new Error("Invalid schema"), { status: 400 })), false);
});
