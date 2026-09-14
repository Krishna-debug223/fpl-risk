# FPL Risk Model v1.1 — Validation Note

## What “launch ready” means here

Model v1.1 has passed deterministic engineering and model-invariant checks. That means the implementation behaves consistently with its stated rules and does not contain several high-impact logical errors that existed in earlier prototypes.

It does **not** mean the model has already demonstrated a specific hit rate or calibration score over historical Premier League seasons. FPL Risk should not advertise a predictive-accuracy percentage until a proper walk-forward retrospective test has been completed.

## Launch checks currently automated

`scripts/model-validation.ts` verifies:

1. Early-season history contributes materially for an established player with no current minutes.
2. Historical influence reaches zero by 900 current-season minutes.
3. Team/opponent quality changes projections in the expected direction for otherwise identical players.
4. An injured player is discounted and a player marked fully unavailable is not assumed to recover later in the forecast horizon.
5. A Double Gameweek correctly sums multiple fixtures inside one event horizon.
6. A Blank Gameweek contributes zero.
7. A manager with zero free transfers receives an exact -4 transfer-cost adjustment versus the same move with one free transfer.
8. Two players with identical underlying data remain close even if one has a short-term FPL points/bonus haul.
9. A weak-xG/xA defender cannot project near 10 points per Gameweek merely because of early returns.
10. The Monte Carlo engine is deterministic for identical inputs.

Run the suite with:

```powershell
npm.cmd run model:check
```

## Important prototype errors fixed before v1.1

### Transfer hits

Earlier recommendation ranking could evaluate a transfer as if it were free even when the user had zero free transfers. Model v1 deducts the hit from **net expected gain before ranking the move**.

### Availability

Earlier simulations could discount availability once in the projection and then effectively discount it again in the simulation. Model v1 carries explicit appearance probabilities into the simulator so availability is handled once.

## Confidence is not probability calibration

The High / Medium / Low recommendation label is a **model confidence / data-coverage classification**. It reflects sample quality, signal size and uncertainty. It must not be described as “the model is X% sure this transfer will work.”

The separate Monte Carlo success probability is the share of model-generated paths in which the transfer beats holding under the current assumptions. Until retrospective calibration is complete, it should be described as a **model probability**, not a proven real-world frequency.

## Post-launch calibration plan

For every public model version, preserve or log only non-sensitive forecast snapshots needed for aggregate evaluation, then compare forecasts with realized FPL outcomes after the horizon closes. Do not add FPL Team IDs or manager identities to this research dataset.

Priority validation metrics:

- MAE / RMSE of player expected points by horizon
- calibration of transfer success-probability buckets
- calibration of clean-sheet and appearance probabilities
- recommendation win rate versus holding after accounting for hits
- performance by position, price band and early/mid/late season
- performance when historical prior is high vs low
- performance with and without optional Elo input

Use walk-forward evaluation: predictions for a Gameweek must use only information that would have been available before that Gameweek deadline.

## Versioning rule

Any material change to weights, priors, thresholds, simulation logic or data sources should increment `MODEL_VERSION`. Do not silently change the production model while reporting historical performance from an older version.

### Short-term points leakage

The earlier projection still allowed recent `ep_next`/Form effects to leak into expected minutes and the empirical anchor. That could amplify an early goal, clean sheet or bonus haul. v1.1 removes Form/PPG from the forecast, removes `ep_next` from minutes security, makes the component model 92–98% of fixture xPts, and sample-size shrinks live xG/xA/DefCon rates.

### Underlying team quality

v1.1 derives current team xG, xA and xGA from live FPL underlying data, shrinks small samples toward league average, and uses those signals ahead of actual goals scored/conceded when adjusting fixtures.
