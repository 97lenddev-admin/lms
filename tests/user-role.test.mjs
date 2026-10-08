import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const exports = {};
const source = readFileSync(
  new URL("../src/lib/supabase/user-role.ts", import.meta.url),
  "utf8",
);

runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  { exports, require: () => ({}) },
);

test("maps supported user profile roles to their dashboards", () => {
  assert.equal(exports.getRoleHomePath("Credit Analyst"), "/credit-analyst");
  assert.equal(
    exports.getRoleHomePath("Credit Investigator"),
    "/credit-investigator",
  );
  assert.equal(exports.getRoleHomePath("Branch Manager"), "/branch-manager");
  assert.equal(exports.getRoleHomePath("Cashier"), "/cashier");
});

test("normalizes surrounding whitespace in a role", () => {
  assert.equal(exports.getRoleHomePath("  Cashier  "), "/cashier");
});

test("rejects missing and unsupported roles", () => {
  assert.equal(exports.getRoleHomePath(undefined), null);
  assert.equal(exports.getRoleHomePath("Administrator"), null);
});

test("loads the signed-in user's name and role from user_profiles by id", async () => {
  const calls = [];
  const query = {
    select(column) {
      calls.push(["select", column]);
      return this;
    },
    eq(column, value) {
      calls.push(["eq", column, value]);
      return this;
    },
    async maybeSingle() {
      calls.push(["maybeSingle"]);
      return {
        data: { full_name: "  Alex Rivera  ", roles: "Branch Manager" },
        error: null,
      };
    },
  };
  const supabase = {
    from(table) {
      calls.push(["from", table]);
      return query;
    },
  };

  const profile = await exports.getUserProfile(supabase, "auth-user-id");
  assert.equal(profile.fullName, "Alex Rivera");
  assert.equal(profile.role, "Branch Manager");
  assert.equal(profile.homePath, "/branch-manager");
  assert.deepEqual(calls, [
    ["from", "user_profiles"],
    ["select", "full_name, roles"],
    ["eq", "id", "auth-user-id"],
    ["maybeSingle"],
  ]);
});

test("uses a safe display-name fallback when full_name is empty", async () => {
  const query = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    async maybeSingle() {
      return { data: { full_name: "", roles: "Cashier" }, error: null };
    },
  };

  const profile = await exports.getUserProfile(
    { from: () => query },
    "auth-user-id",
  );

  assert.equal(profile.fullName, "User");
  assert.equal(profile.role, "Cashier");
});
