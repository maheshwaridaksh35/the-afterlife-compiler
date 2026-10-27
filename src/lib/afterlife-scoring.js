export const WEIGHTS = {
  impact: { recover: 0.28, safety: 0.18, effort: 0.10, access: 0.14, waste: 0.30 },
  fast: { recover: 0.12, safety: 0.20, effort: 0.30, access: 0.28, waste: 0.10 },
  cost: { recover: 0.18, safety: 0.18, effort: 0.30, access: 0.18, waste: 0.16 }
};

export const ROUTES = [
  { id: "repair", name: "Repair & return", label: "KEEP THE WHOLE OBJECT", recover: 94, safety: 74, effort: 42, access: 70, waste: 96, desc: "Restore function and retain the most embedded value." },
  { id: "reuse", name: "Reuse / donate", label: "EXTEND ITS LIFE", recover: 83, safety: 91, effort: 82, access: 74, waste: 82, desc: "Pass on a working object or components to someone who can use them." },
  { id: "salvage", name: "Parts salvage", label: "SAVE WHAT STILL WORKS", recover: 70, safety: 56, effort: 48, access: 52, waste: 73, desc: "Recover usable components for another repair or build." },
  { id: "recycle", name: "Specialist recycling", label: "RECOVER MATERIALS", recover: 62, safety: 94, effort: 77, access: 78, waste: 59, desc: "Use a collection route that accepts the item's actual materials." },
  { id: "residual", name: "Residual disposal", label: "LAST RESORT", recover: 9, safety: 88, effort: 91, access: 89, waste: 5, desc: "Use only when safer recovery routes are unavailable." }
];

export function scoreRoutes(passport, priority = passport.priority || "impact") {
  const weights = WEIGHTS[priority] || WEIGHTS.impact;
  const hasHighHazard = (passport.hazards || []).some((hazard) => hazard.severity === "high");

  return ROUTES.map((route) => {
    let recover = route.recover;
    let safety = route.safety;
    let effort = route.effort;
    let access = route.access;
    let waste = route.waste;

    if (route.id === "repair" && passport.condition === "working") {
      recover = 99;
      effort = 89;
    }
    if (route.id === "repair" && passport.condition === "broken") {
      recover -= 24;
      effort -= 24;
    }
    if (route.id === "repair" && passport.condition === "unknown") recover -= 6;
    if (route.id === "reuse" && passport.condition === "broken") recover -= 35;
    if (route.id === "reuse" && passport.condition === "damaged") recover -= 14;
    if (passport.category === "textile" && route.id === "repair") {
      recover = Math.min(100, recover + 8);
      effort += 8;
      access += 7;
    }
    if (passport.category === "electronics" && route.id === "recycle") access += 7;
    if (passport.category === "appliance" && route.id === "recycle") access += 4;
    if (route.id === "residual") {
      recover = 8;
      waste = 5;
    }
    if (route.id === "salvage" && hasHighHazard) safety -= 18;

    // All factors are higher-is-better proxies. Effort is expressed as convenience,
    // not actual labour time or money. This is a decision aid, not an LCA model.
    let score = Math.round(
      recover * weights.recover +
      safety * weights.safety +
      effort * weights.effort +
      Math.min(100, access) * weights.access +
      waste * weights.waste
    );

    if (route.id === "salvage" && safety < 45) score = Math.min(score, 35);
    if (route.id === "residual") score = Math.min(score, 40);

    return {
      ...route,
      recover: Math.round(recover),
      safety: Math.round(safety),
      effort: Math.round(effort),
      access: Math.min(100, Math.round(access)),
      waste,
      score: Math.max(0, Math.min(100, score)),
      reason: routeReason(route.id, passport)
    };
  }).sort((a, b) => b.score - a.score);
}

function routeReason(id, passport) {
  if (id === "repair") {
    if (passport.condition === "working") return "Preserves the complete product and its embedded materials.";
    if (passport.condition === "broken") return "Check repair diagnosis and cost before committing.";
    return "A repair assessment may retain more value than material recovery.";
  }
  if (id === "reuse") {
    return passport.condition === "working"
      ? "Extends use with little additional processing."
      : "Better fit after safe repair and a condition check.";
  }
  if (id === "salvage") {
    return (passport.hazards || []).length
      ? "Component value may exist, but hazards make unqualified teardown inappropriate."
      : "Keep intact parts in use only if compatibility and demand are confirmed.";
  }
  if (id === "recycle") return "Fallback when reuse is not viable; check collection acceptance for the exact item.";
  return "Lowest-value fallback. Use only if safe recovery routes are unavailable.";
}