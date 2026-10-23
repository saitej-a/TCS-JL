# Phase 11 — Validation Strategy (Nyquist)

**Sampling level chosen for each deliverable:** every task's verify commands run the
*real* gates (suites, budgets, drills), and the two behavior-bearing rules carry
**fail-on-revert drills** — the strongest cheap evidence available for "the test would
catch a regression."

| # | Deliverable (task) | Level | Evidence |
|---|--------------------|-------|----------|
| 1 | Depth rule deleted (T1) | Full + drill | Rewritten suites green; `nested_reply` import fails; grep clean; **revert drill recorded** (re-add rejection → FAIL, restore → PASS) |
| 2 | Branch closure (T2) | Full + drill | New closure suite; two-removed-ancestors restore case; `makemigrations --check` clean; **bypass drill recorded** |
| 3 | Bounded assembly (T3) | Full + pathological fixtures | Budget test rewritten with the new ceiling; deep-60/wide-50 fixtures return 200, bounded queries, true counts |
| 4 | Deep thread UI (T4) | Full suite + backstops | `CommentThread`/`PostDetailPage` suites; depth-50 fixture renders capped; `tsc -b` strict on the recursive types; aria-expanded + keyboard backstops asserted |
| 5 | Gates (T5) | Full | lint / typecheck / tsc -b / vitest / build / backend suite / contrast audit |
| 6 | Supersession record (T6) | Full | `! grep` proves no source asserts the old rule; reversal-note greps; VERIFICATION.md exists with verbatim gates + both drills |

**Why no human-check layer:** every deliverable is machine-observable (suites, budgets,
greps, DOM assertions). Nothing in this phase needs a human eye to confirm — the UI
contract's subjective qualities (rail aesthetics, copy voice) are pinned by the UI-SPEC's
constants and the copy-contract strings, which tests assert verbatim.
