import test from "node:test";
import assert from "node:assert/strict";
import { ROUTES, scoreRoutes } from "./afterlife-scoring.js";

const brokenPhone = {
  title: "Broken smartphone",
  category: "electronics",
  condition: "broken",
  priority: "impact",
  hazards: [{ severity: "high", name: "Lithium-ion battery", note: "Keep intact." }]
};

test("returns all five routes in descending score order", () => {
  const routes = scoreRoutes(brokenPhone, "impact");
  assert.equal(routes.length, ROUTES.length);
  assert.deepEqual(new Set(routes.map((route) => route.id)), new Set(ROUTES.map((route) => route.id)));
  for (let index = 0; index < routes.length; index += 1) {
    assert.ok(routes[index].score >= 0 && routes[index].score <= 100);
    if (index > 0) assert.ok(routes[index - 1].score >= routes[index].score);
  }
});

test("priority changes the score weights", () => {
  const impact = scoreRoutes(brokenPhone, "impact");
  const fast = scoreRoutes(brokenPhone, "fast");
  const costProxy = scoreRoutes(brokenPhone, "cost");
  const getScore = (routes, id) => routes.find((route) => route.id === id)?.score;
  assert.notEqual(getScore(impact, "repair"), getScore(fast, "repair"));
  assert.notEqual(getScore(fast, "recycle"), getScore(costProxy, "recycle"));
});

test("high hazards penalise salvage and residual remains a capped fallback", () => {
  const routes = scoreRoutes(brokenPhone, "impact");
  const salvage = routes.find((route) => route.id === "salvage");
  const residual = routes.find((route) => route.id === "residual");
  assert.ok(salvage.safety < 45);
  assert.ok(salvage.score <= 35);
  assert.ok(residual.score <= 40);
});

test("textile repair gets its category-specific adjustment", () => {
  const item = { category: "textile", condition: "damaged", hazards: [] };
  const routes = scoreRoutes(item, "impact");
  const repair = routes.find((route) => route.id === "repair");
  assert.equal(repair.recover, 100);
  assert.equal(repair.access, 77);
});

test("unknown priority safely falls back to impact weighting", () => {
  const fallback = scoreRoutes(brokenPhone, "nonsense");
  const impact = scoreRoutes(brokenPhone, "impact");
  assert.deepEqual(fallback.map((route) => [route.id, route.score]), impact.map((route) => [route.id, route.score]));
});