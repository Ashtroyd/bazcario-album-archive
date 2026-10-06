import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePasswordChange } from "./password-policy";

test("password changes require current password, a strong matching new value, and no reuse", () => {
  assert.match(validatePasswordChange("", "a-new-long-password", "a-new-long-password")!, /current/);
  assert.match(validatePasswordChange("old", "short", "short")!, /12/);
  assert.match(validatePasswordChange("old", "a".repeat(129), "a".repeat(129))!, /128/);
  assert.match(validatePasswordChange("old", "a-new-long-password", "different")!, /match/);
  assert.match(validatePasswordChange("same-long-password", "same-long-password", "same-long-password")!, /different/);
  assert.equal(validatePasswordChange("old", "a-new-long-password", "a-new-long-password"), null);
});
