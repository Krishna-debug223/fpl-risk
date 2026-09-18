# FPL Risk model validation

The production dashboard currently identifies the active model as `1.2.0-beta.2` in [`lib/risk-v12.ts`](lib/risk-v12.ts). Validation is designed to catch rule and implementation regressions; it is not a claim of historical predictive accuracy.

## Automated checks

Run the two deterministic suites locally:

```bash
npm run model:check
npm run model:check:v12
```

Together they cover:

- early-season historical-prior weighting and its decay to zero with sufficient current minutes;
- expected-direction response to team quality, opponent quality and fixture difficulty;
- availability discounts and fully unavailable players across the forecast horizon;
- Double Gameweek aggregation and Blank Gameweek zero-fixture behaviour;
- exact transfer-hit treatment when free transfers are exhausted;
- resistance to short-term points and bonus leakage into the forecast;
- deterministic seeded simulations for identical inputs;
- sportsbook fail-open and zero-weight invariance;
- bounded market influence and directional clean-sheet/attack responses;
- shared-budget, duplicate-player and three-per-club legality for joint transfers.

The GitHub Actions workflow also runs `npm run typecheck`, a full walk-forward backtest and the production build on pushes and pull requests.

## How to describe the outputs

High, Medium and Low are model-confidence labels based on data coverage, signal size and uncertainty. They are not calibrated probabilities. A simulation success percentage is the share of model-generated paths in which a transfer beats holding under the current assumptions; it should not be presented as a proven real-world frequency until walk-forward calibration supports that claim.

## Versioning

Increment `MODEL_VERSION` for material changes to weights, priors, thresholds, simulation logic or data sources. Preserve the model version alongside any forecast snapshot or retrospective evaluation so historical comparisons remain reproducible.
