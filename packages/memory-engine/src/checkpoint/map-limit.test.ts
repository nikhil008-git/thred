import assert from "node:assert/strict";
import test from "node:test";
import { mapWithLimit } from "./map-limit.js";

test("mapWithLimit keeps result order while overlapping work", async () => {
  let active = 0;
  let peak = 0;
  const results = await mapWithLimit([30, 10, 20, 5, 15, 25], 3, async (delay) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, delay));
    active -= 1;
    return delay;
  });

  assert.deepEqual(results, [30, 10, 20, 5, 15, 25]);
  assert.ok(peak <= 3);
  assert.ok(peak > 1);
});
