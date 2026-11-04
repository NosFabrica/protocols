> **Repo metadata — not part of the spec text.**
> **Status:** 📝 pre-NIP
> **Canonical:** not yet published
> **Last updated:** 2026-11-05
> **Sources:** `NosFabrica/brainstorm_graperank_algorithm` (`grape/GrapeRankAlgorithm.java`, `grape/Constants.java`, `grape/GrapeRankParams.java`, `rank/ScoreCard.java` — the reference implementation this spec transcribes); `NosFabrica/brainstorm_server` (preset seed migration `4fcfe9570a50`, `CONTEXT.md`); `nous-clawds4/tapestry` (`customers/default/preferences/graperank.conf`).
> **Adopted by:** `brainstorm_graperank_algorithm` (production reference implementation), `tapestry` (JS variant — see *Implementation variance*).
> **Companion:** [trusted-assertions.md](./trusted-assertions.md) — the wire format the outputs are published in; [vouch-list.md](./vouch-list.md) — the wire format vouch edges are read from.

GrapeRank — Personalized Trust-Score Computation
=====

`draft` `optional`

GrapeRank computes, for one **Observer**, a personalized trust score — **Influence**, in `[0, 1]` — for every user in the Observer's extended follow network, from public nostr assertions (follows, mutes, reports, vouches). The scores, and several companion outputs, are published as kind-30382 Trusted Assertions per [trusted-assertions.md](./trusted-assertions.md).

GrapeRank is sometimes glossed as "PageRank for people," but it differs in the ways that matter for trust: scores are bounded rather than a probability distribution, computed *per Observer* rather than globally, gated by an explicit confidence model (a user with one weak endorsement scores near zero no matter how the graph is shaped), and negative assertions (mutes, reports) subtract.

This spec defines the computation normatively, so that an independent implementation given the same input graph and parameters reproduces compatible scores, and so that a consumer of published scores can understand — and in principle audit — what the numbers claim.

## Terminology

- **Observer** — the user from whose perspective the computation runs. Fixed for one run.
- **Observee** — any user being scored.
- **Rater** — a user whose published assertion about an Observee is counted.
- **Rating** (`r ∈ [−1, 1]`) — the value a single assertion contributes: positive for follows, negative (by default) for mutes and reports.
- **Edge confidence** (`c ∈ [0, 1]`) — how seriously one assertion of a given type is taken, before considering who made it.
- **Input** — the total weight of assertions received by an Observee; the raw material of confidence.
- **Average** — the weighted mean rating an Observee has received.
- **Confidence** — how settled the Average is, derived from Input.
- **Influence** — the score: `max(Average × Confidence, 0)`.

## Input graph

Vertices are users (pubkeys). Directed edges come from public nostr events, one edge per (rater, type, target):

| Edge | Source event | Notes |
|---|---|---|
| `FOLLOWS` | kind 3 (contact list) | one edge per listed `p` tag |
| `MUTES` | kind 10000 (mute list) | |
| `REPORTS` | kind 1984 (NIP-56) | **user-level reports only** — a `p`-tag report with no `e` tag; note/media reports are excluded |
| `VOUCHES` | kind 30000, `d` = `vouches` (vouch list, [vouch-list.md](./vouch-list.md)) | one edge per listed `p` tag |

A rater who both follows and mutes the same target contributes two data points; likewise a follow and a vouch. The edges are distinct kinds with distinct weights — a vouch is a deliberate endorsement, a follow is ambient attention, and conflating them would let the cheap signal corrupt the costly one.

**Candidate set.** The computation scores the Observer plus every user within `H` hops of the Observer along `FOLLOWS` edges (the production hop limit is `H = 8`). `hops(u)` is the shortest follow-path distance from the Observer: `0` is the Observer, `1` a direct follow, and so on. Implementations MAY carry additional candidates (for example, users scored in a previous run who are no longer reachable); such candidates take the unreachable sentinel internally and their `hops` is omitted on the wire.

**Ratings considered.** Every `FOLLOWS` / `MUTES` / `REPORTS` / `VOUCHES` edge whose rater and target are both in the candidate set. Assertions from users outside the candidate set are ignored — a rater the Observer cannot reach has no voice in the Observer's scores. Unlike a kind-10040 designation, a vouch never adds its target to the candidate set: it weights someone the follow graph already reaches, and cannot inject strangers into the run.

## Rating interpretation

Each edge becomes a data point `(rater, target, r, c)`:

| Edge | Rating `r` | Edge confidence `c` |
|---|---|---|
| `FOLLOWS` | `followRating` | `followConfidenceOfObserver` when the rater **is** the Observer; otherwise `followConfidence` |
| `MUTES` | `muteRating` | `muteConfidence` |
| `REPORTS` | `reportRating` | `reportConfidence` |
| `VOUCHES` | `vouchRating` | `vouchConfidence` |

Only follows special-case the Observer: the Observer's own follow carries high confidence (default `0.5` vs `0.03`), which is what seeds the network — everyone else's influence ultimately chains back to the Observer's own assertions.

## State and seeding

Each candidate has a scorecard `(average, input, confidence, influence, hops)`.

- **The Observer's own card is fixed**: `average = 1`, `input = ∞`, `confidence = 1`, `influence = 1`, `hops = 0`. It is never updated.
- **Every other card starts at zero** (all four score fields), with `hops` from the follow-graph distance.

## The iteration

Let `α = attenuationFactor` and `ρ = rigor`. Repeat full passes over all candidates except the Observer; for each Observee `e` with incoming data points `D(e)`:

```
weight of one data point (rater x, rating r, edge confidence c):
    w  =  c × influence(x) × α

input(e)      =  Σ w                    over D(e)
average(e)    =  Σ (w × r)  /  input(e)     (0 when input(e) = 0)
confidence(e) =  1 − ρ^input(e)
influence(e)  =  max( average(e) × confidence(e), 0 )
```

Iterate until a full pass changes no candidate's influence by more than `ε = 0.0001`.

Notes:

- The confidence formula is the closed form of `1 − exp(−input × (−ln ρ))` and requires `ρ ∈ (0, 1)`. Read `ρ` as *residual doubt per unit of input*: after accumulating input `i`, confidence is `1 − ρ^i`. Smaller `ρ` means confidence saturates faster.
- The reference implementation updates scorecards **in place** during a pass (later candidates in the same pass see earlier candidates' new influence), in unspecified order. Implementations MAY update in place or synchronously per pass; both MUST iterate to the same `ε`, and at the published quantization (see below) the difference is immaterial.
- Bounds: `average ∈ [−1, 1]`, `confidence ∈ [0, 1)`, and therefore `influence ∈ [0, 1)` for everyone but the Observer (whose fixed influence is `1`). Negative products clamp to `0` — Influence never goes negative on the wire; negative signal shows up as suppressed Influence and in the `muters`/`reporters` counts.

## Parameters

Fourteen parameters govern a run. Both implementations use exactly this set, under these names (the two vouch parameters were added after the original twelve; an implementation predating them has no `VOUCHES` edges to weight and is unaffected otherwise):

| Parameter | Range | DEFAULT | Meaning |
|---|---|---|---|
| `rigor` | (0, 1) | 0.5 | residual doubt per unit input; larger = stricter |
| `attenuationFactor` | [0, 1] | 0.85 | per-edge damping; compounds along chains |
| `followRating` | [−1, 1] | 1.0 | rating contributed by a follow |
| `followConfidence` | [0, 1] | 0.03 | edge confidence of a non-Observer follow |
| `followConfidenceOfObserver` | [0, 1] | 0.5 | edge confidence of the Observer's own follow |
| `muteRating` | [−1, 1] | −0.1 | rating contributed by a mute |
| `muteConfidence` | [0, 1] | 0.5 | edge confidence of a mute |
| `reportRating` | [−1, 1] | −0.1 | rating contributed by a report |
| `reportConfidence` | [0, 1] | 0.5 | edge confidence of a report |
| `verifiedFollowersInfluenceCutoff` | [0, 1] | 0.02 | rater threshold for the `followers` count and the `verified` flag |
| `verifiedReportersInfluenceCutoff` | [0, 1] | 0.1 | rater threshold for the `reporters` count |
| `verifiedMutersInfluenceCutoff` | [0, 1] | 0.01 | rater threshold for the `muters` count |
| `vouchRating` | [−1, 1] | 1.0 | rating contributed by a vouch |
| `vouchConfidence` | [0, 1] | 0.4 | edge confidence of a vouch |

Providers expose parameter **presets** as policy; the production presets (informative — the deployment database is authoritative after seeding):

| Parameter | DEFAULT | PERMISSIVE | RESTRICTIVE |
|---|---|---|---|
| `rigor` | 0.5 | 0.3 | 0.65 |
| `attenuationFactor` | 0.85 | 0.95 | 0.5 |
| `followRating` | 1.0 | 1.0 | 1.0 |
| `followConfidence` | 0.03 | 0.1 | 0.03 |
| `followConfidenceOfObserver` | 0.5 | 0.1 | 0.5 |
| `muteRating` | −0.1 | 0.0 | −0.9 |
| `muteConfidence` | 0.5 | 0.1 | 0.9 |
| `reportRating` | −0.1 | 0.0 | −0.9 |
| `reportConfidence` | 0.5 | 0.1 | 0.9 |
| `verifiedFollowersInfluenceCutoff` | 0.02 | 0.002 | 0.5 |
| `verifiedReportersInfluenceCutoff` | 0.1 | 0.002 | 0.5 |
| `verifiedMutersInfluenceCutoff` | 0.01 | 0.002 | 0.5 |
| `vouchRating` | 1.0 | 1.0 | 1.0 |
| `vouchConfidence` | 0.4 | 0.5 | 0.4 |

## Derived outputs

After convergence:

- **`verified` flag** — `influence > verifiedFollowersInfluenceCutoff`, strict.
- **Trusted-rater counts** — for each Observee and each relationship type, the number of its raters (among candidates) whose **raw, unrounded** influence strictly exceeds that type's cutoff. These are the `followers`, `reporters`, and `muters` tags of the published Trusted Assertion. One rule, three cutoffs; a counted rater need not itself clear the publish threshold. Vouches count toward none of the three (as designations do not): a voucher is not thereby a follower, and the published counts keep their plain meaning.
- **`hops`** — the follow-graph distance from the candidate set construction; the internal unreachable sentinel (999) is never published — the wire encoding is an absent tag.
- **Change detection** — scores are compared across runs at two-decimal rounding, matching the published `rank` quantization (`rank = round(influence × 100)`): a candidate is *changed* when its rounded score differs from the previous run, and *dropped* when it falls from at-or-above to below the publish threshold (production: `round(influence, 2) ≥ 0.02`). These lists drive the incremental publish/delete behavior described in [trusted-assertions.md](./trusted-assertions.md).

## Worked example (test vector)

Default parameters, and a graph containing only the edges named:

1. **Observee `A`, followed by the Observer and no one else.**
   `w = 0.5 × 1.0 × 0.85 = 0.425` → `input = 0.425`, `average = 1.0`,
   `confidence = 1 − 0.5^0.425 = 0.255162…` → **`influence ≈ 0.2552`, `rank = 26`**.
2. **Observee `B`, followed only by `A`.**
   `w = 0.03 × 0.2552 × 0.85 = 0.006507` → `confidence = 1 − 0.5^0.006507 ≈ 0.00450` → **`influence ≈ 0.0045`** — below the 0.02 publish threshold: no Trusted Assertion.

An implementation reproducing these two fixpoints (and the general rule they illustrate: a single chain of endorsements decays fast; breadth of already-trusted raters is what accumulates input) can be considered on-spec for the core iteration.

## Interpretation notes (informative)

- **Distance decay is emergent.** No term reads `hops`; attenuation and edge confidence apply per edge, and because a rater's weight carries its own (already attenuated) influence, damping compounds along chains. `hops` is published as a description of the path, not an input to the score.
- **Sybil resistance comes from the confidence gate.** Input is weighted by the raters' influence, so a cluster with no inbound edges from already-trusted users has `input ≈ 0` and `influence ≈ 0` regardless of its internal edge count.
- **Scores are parameter-relative as well as Observer-relative.** The same graph under PERMISSIVE and RESTRICTIVE presets yields very different scores; a published `rank` is a claim under one provider's parameters, not a property of the graph alone.
- **Interoperability bar.** Two implementations agree when, given the same candidate set, edges, and parameters, every candidate's influence rounds to the same published `rank` (0.01 resolution). Convergence tolerance, pass ordering, and floating-point detail below that quantization are implementation-private.

## Implementation variance (informative)

- **`brainstorm_graperank_algorithm`** (production, Java) — the reference this spec transcribes. Fetches the candidate set and hop distances from the estate's graph store, runs the iteration, computes the derived outputs and the changed/dropped lists consumed by the publisher.
- **`tapestry`** (R&D, JavaScript) — the same three preset names and the original twelve parameters (its `graperank.conf` is the parameter contract's second attestation; the vouch pair is not yet adopted there). It additionally computes a separate `personalizedPageRank`, publishes raw scorecard internals as extension tags (`personalizedGrapeRank_influence`, `_average`, `_confidence`, `_input`), and applies a different publication gate that also includes strong-negative-signal Observees — differences at the *publication* layer, described in [trusted-assertions.md](./trusted-assertions.md), not in the core iteration.
