# Concepts

> **Role:** the conceptual canon behind the specs in this repo — the model that makes them make sense. This is apparatus, not a specification: nothing here is normative for wire formats, and where a term has a normative definition in a spec, this document points there instead of redefining it.
> **Last updated:** 2026-08-18. **Sources:** distilled from `brainstorm_server/CONTEXT.md`, tapestry's architecture invariants (`CLAUDE.md`) and SECURITY.md trust-model note, and the two specs below.

Brainstorm computes **personalized web-of-trust scores** for nostr. Five claims define the model; everything in [trusted-assertions.md](./specs/trusted-assertions.md) and [graperank.md](./specs/graperank.md) is downstream of them.

## The model in five claims

**1. Publishing is permissionless.** Anyone may publish follows, mutes, reports, tags, list elements — assertions of any kind, about anyone. Nothing in the system gates publication, and no participant can prevent others from publishing assertions about them. There is no admin who approves content and no registry of allowed authors.

**2. There is no global truth — only views from a point of view.** Every judgment the system produces — a trust score, a "verified" count, whether an assertion counts — is computed *from a specific Observer's perspective*. The same user can be highly trusted from one point of view and invisible from another, and both answers are correct. Any design or consumer expecting "the" score is asking a question the model refuses to answer.

**3. Trust is computed, not administered.** An Observer's trusted set is not a list anyone maintains; it emerges from published assertions run through an open algorithm (GrapeRank) under stated parameters. Because the inputs are public signed events and the algorithm is specified, a score is in principle *auditable*: given the same graph and parameters, anyone can recompute it.

**4. Filtering happens at read time.** A point of view's picture of the world is (everyone's assertions) × (that POV's trust scoring), and both factors change continuously. The model therefore filters when reading, rather than gating when writing — accept all signed events, apply the active Observer's scores at query time.

**5. A score is a claim, not a fact.** A published trust score is an attributable statement — "provider P, computing for observer O under parameters Θ, assigns this value" — signed, timestamped, replaceable, and deletable. Consumers present it as such. Two corollaries from the specs: *presence is not endorsement* (a score can exist to carry negative signal), and *absence is not distrust* (below threshold, not yet computed, or unreachable).

## The cast

Normative definitions live in the specs; these are the roles and how they relate.

- **Observer** — the person from whose perspective trust is computed. Everything is relative to one. *(Defined in both specs.)*
- **Rater** — anyone whose published assertion (follow, mute, report) is counted as input. Every participant is a rater the moment they publish. *(Defined in [graperank.md](./specs/graperank.md).)*
- **Observee** — the subject a score is about. *(Defined in both specs.)*
- **Provider** — the service that computes an Observer's scores and publishes them on the Observer's behalf, signing with a **dedicated per-Observer key** (the "assistant" key). The Observer authorizes a provider by publishing a designation event; the provider cannot designate itself. *(Defined in [trusted-assertions.md](./specs/trusted-assertions.md).)*
- **Consumer** — any client that reads published scores and uses them to filter, rank, or display. Consumers choose whose perspective to present and verify whose claims they relay.

One person typically occupies several roles at once: every Observer is also a rater in other Observers' webs, and an Observee in all of them.

## From assertions to scores — the pipeline in one paragraph

Raters publish ordinary nostr events (follows, mutes, user-level reports). A provider builds the assertion graph, and for a given Observer runs **GrapeRank** — a fixed-point iteration in which each assertion's weight depends on the asserter's own standing in that Observer's web — yielding an **Influence** in [0, 1] per Observee ([graperank.md](./specs/graperank.md)). Scores that clear the provider's publish policy are quantized to a **Rank** (0–100) and published as signed, per-Observee **Trusted Assertion** events, discoverable through the Observer's **designation** ([trusted-assertions.md](./specs/trusted-assertions.md)). Consumers resolve the designation, verify signatures, and read the world from that Observer's point of view.

## Cross-cutting vocabulary

Terms that recur across the estate but are owned by no single spec:

- **Web of trust (WoT)** — the directed graph of published assertions (follows, mutes, reports), as seen from an Observer: the raw material scores are computed from. "My WoT" in product UIs means "scores computed with me as Observer."
- **House POV** (default observer) — the deployment-chosen Observer whose perspective is presented to logged-out or unconfigured users. A convenience default, not a privileged truth: the house perspective is computed and published exactly like any other Observer's.
- **Preset** — a named parameter bundle for the scoring algorithm (e.g. default / permissive / restrictive). Scores are parameter-relative as well as Observer-relative, so a preset is part of the claim a score makes. Parameter semantics: [graperank.md](./specs/graperank.md); preset values are provider policy.
- **Verified (count)** — of an Observee's raters, how many themselves clear a trust threshold in the same Observer's web. "Verified followers" answers *"how many accounts that I'd trust follow this person?"* — a sybil-resistant refinement of a raw follower count. Thresholds are preset-relative.
- **Valid** (publish-worthy) — clearing the provider's publish cutoff, i.e. scoring high enough that a Trusted Assertion is published at all. Orthogonal to *verified*: a rater can count as verified without itself being published, and vice versa.
- **The estate** — the repositories and deployments implementing all of this, across two organizations operated by one team. Canonical inventory: [ECOSYSTEM.md](./ECOSYSTEM.md).

## What this document is not

Not a wire-format spec (those live in [`specs/`](./specs/) and are normative each in exactly one place); not implementation documentation (each codebase's own docs cover how *its* stack stores, computes, and displays — see the repos in [ECOSYSTEM.md](./ECOSYSTEM.md)); and not a statement of any deployment's policy (cutoffs, presets, and hop limits belong to providers). Per this repo's admission rule, it exists because implementers and consumers of the protocols need the model — if a change here wouldn't matter to them, it belongs elsewhere.
