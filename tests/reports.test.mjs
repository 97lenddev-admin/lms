import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const exports = {};
runInNewContext(ts.transpileModule(readFileSync(new URL("../src/app/branch-manager/report-data.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports });
const { filterReport, reportProduct, reportSummary, reportCsv } = exports;
const make = (id, submitted, status = "Approved", amount = "₱60,000.00", term = "60 days") => ({ id, submitted, status, amount, term, name: `Client, ${id}` });
const loans = [make("start", "Jun 1, 2025"), make("end", "Apr 30, 2026"), make("before", "May 31, 2025"), make("after", "May 1, 2026"), make("status", "Dec 1, 2025", "Rejected"), make("product", "Dec 1, 2025", "Approved", "₱100,000.00")];
const filters = { from: "2025-06-01", to: "2026-04-30", status: "Approved", product: reportProduct(loans[0]), sort: "newest" };

test("status, product and inclusive date filters intersect and sort without mutating source", () => {
  assert.equal(filterReport(loans, filters).map(row => row.id).join(), "end,start");
  assert.equal(filterReport(loans, { ...filters, sort: "oldest" }).map(row => row.id).join(), "start,end");
  assert.equal(loans[0].id, "start");
  assert.equal(filterReport(loans, { ...filters, product: "nonexistent" }).length, 0);
  assert.equal(filterReport(loans, { ...filters, from: "2026-05-01" }).length, 0);
});

test("clearing dates removes date restrictions and product includes term", () => {
  assert.equal(filterReport(loans, { ...filters, from: "", to: "" }).length, 4);
  assert.equal(filterReport([make("other-term", "Jul 1, 2025", "Approved", "₱60,000.00", "90 days")], filters).length, 0);
});

test("summary and CSV consume only the full filtered set, including more than ten matches", () => {
  const matches = filterReport([...loans, ...Array.from({ length: 12 }, (_, i) => make(`extra-${i}`, "Jan 1, 2026"))], filters);
  assert.equal(matches.length, 14);
  assert.equal(reportSummary(matches).submissions, 14);
  assert.equal(reportSummary(matches).approvalRate, 100);
  assert.equal(reportSummary(matches).disbursed, null);
  assert.equal(reportSummary(matches).restructured, null);
  const csv = reportCsv(matches);
  assert.equal(csv.split("\r\n").length, 15);
  for (const id of ["before", "after", "status", "product"]) assert.ok(!csv.includes(`"${id}"`));
  assert.ok(csv.includes('"Client, end"'));
  assert.ok(csv.includes('"60000.00"'));
});

test("summary handles servicing facts, undecided loans and empty results without invented totals", () => {
  const summary = reportSummary([
    { ...make("active", "Jul 1, 2025", "Active"), disbursedAmount: 60000, isRestructured: true },
    { ...make("rejected", "Jul 1, 2025", "Rejected"), disbursedAmount: 0, isRestructured: false },
    { ...make("pending", "Jul 1, 2025", "Pending"), disbursedAmount: 0, isRestructured: false },
  ]);
  assert.equal(summary.approvalRate, 50);
  assert.equal(summary.disbursed, 60000);
  assert.equal(summary.restructured, 1);
  assert.equal(reportSummary([]).approvalRate, null);
  assert.equal(reportSummary([]).disbursed, 0);
  assert.equal(reportCsv([]).split("\r\n").length, 1);
});

test("CSV quotes embedded quotes and neutralizes spreadsheet formulas", () => {
  const csv = reportCsv([{ ...loans[0], name: '=SUM(1,2) "test"' }]);
  assert.ok(csv.includes('"\'=SUM(1,2) ""test"""'));
});
