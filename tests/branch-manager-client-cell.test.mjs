import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("long Branch Manager client names stay inside the Client column", () => {
  const app = readFileSync(
    new URL("../src/app/branch-manager/branch-manager-app.tsx", import.meta.url),
    "utf8",
  );
  const styles = readFileSync(
    new URL("../src/app/branch-manager/branch-manager.module.css", import.meta.url),
    "utf8",
  );

  assert.match(app, /className=\{styles\.clientCell\} title=\{loan\.name\}/);
  assert.match(styles, /\.tableContainer \.clientCell\{max-width:0;overflow:hidden;text-overflow:ellipsis\}/);
});
