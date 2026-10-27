# The Afterlife Compiler

**Every object has another possible life.**

The Afterlife Compiler is a competition prototype for component-level circularity decisions. It maps likely components, flags hazards, compares repair/reuse/salvage/recycling routes, explains the score and tracks user-reported outcomes.

## Current MVP

- Responsive interface: Overview, Compile an object, Afterlife Passport, Impact ledger and Methodology.
- Curated demos for a damaged smartphone, torn denim jacket and broken electric kettle.
- Rule-based category drafts for entered objects.
- Optional authenticated server-side AI analysis handler for text and image input. **The live AI endpoint has not been tested end-to-end yet.**
- Component-level estimated mass ranges, material assumptions, hazards and safe next steps.
- Deterministic route scoring with configurable priorities: Highest impact, Fastest route and Lowest cost / effort proxy. The cost setting is a proxy; actual prices are not measured.
- Browser-local passport history, JSON export, print / Save as PDF, route selection and outcome reporting.
- Planned routes are distinct from self-reported completed routes. Residual disposal is excluded from recovery-associated metrics. No CO₂, water, or cost savings are claimed.

## Limitations

Sample outputs are curated demo data, not AI predictions. Rule-based drafts use category heuristics. Mass ranges, route scores, recovery potentials and local-access assumptions are estimates—not a lifecycle assessment, verified collection-point database, or measured recycling yield. User-confirmed actions are self-reports, not independent verification. Verify real collection instructions and consult qualified help for electrical or battery hazards.

The optional AI path requires sign-in and Base44 AI/workspace access and credits. It has not been verified end-to-end and should not be represented as proven during demos.

## Architecture

- `src/routes/index.jsx` — primary app UI, demo data, passport and ledger workflows.
- `src/index.css` — styling and print layout.
- `src/lib/afterlife-scoring.js` — deterministic route-scoring function.
- `src/lib/afterlife-scoring.test.js` — Node unit tests for ranking, priorities, hazard penalty and fallback behavior.
- `src/lib/afterlife-ai.js` — optional authenticated AI handler with schema validation and safety-text filter.
- `src/lib/ai.server.js` — Base44 AI gateway adapter.
- `localStorage` key `afterlife.passports.v1` — local-first passport history.
- Built with React, TanStack Start/Router, Vite, Base44, Tailwind CSS and Node.js.

## Run locally

Requires a compatible Node.js version for the locked Vite/TanStack toolchain.

```bash
npm ci
npm test
npm run lint
npm run dev
```

For a production compilation, run `npm run build`. The Base44 auth and optional AI features require app/workspace configuration; the demo samples and client-side route scorer are intended to work without a live AI response.

## Automated checks

The project's scoring tests, lint and production build passed in the last verified run. These checks do not verify the live AI endpoint, the full browser workflow or the environmental validity of model assumptions.

## Demo flow (~90 seconds)

1. Click **Run a sample** to open the smartphone passport.
2. Point out the demo provenance badge and battery / broken-glass safety notes.
3. Change the priority between **Highest impact**, **Fastest route** and **Lowest cost / effort proxy**.
4. Open **Why this route?** and explain the transparent scoring factors.
5. Export JSON or use Print / Save PDF.
6. Only report a completion if a route was actually completed; the ledger labels it self-reported.
7. Open the Impact ledger. Explain that item mass is estimated, not measured recovered material, and residual disposal is never counted as recovery.
8. Open the denim sample to show how category and condition can affect recommendations.

## Next priorities

1. Verify the live AI handler end-to-end with signed-in users and available credits; test image/text input, validation, failures and safety filtering.
2. Add tests for component mass aggregation and AI failure paths.
3. Validate weights with real outcomes and replace local-access assumptions with verified route data.
4. User-test whether recommendations change real repair, reuse and recycling outcomes.
