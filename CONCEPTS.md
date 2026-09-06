# Concepts

> **Role:** the conceptual canon behind the specs in this repo — the model that makes them make sense. This is apparatus, not a specification: nothing here is normative for wire formats, and where a term has a normative definition in a spec, this document points there instead of redefining it.
> **Last updated:** 2026-09-05. **Sources:** distilled from `brainstorm_server/CONTEXT.md`, tapestry's architecture invariants (`CLAUDE.md`) and SECURITY.md trust-model note, the two specs below, and, for site roles, the deployed role and settings models of tapestry (`BIBLE.md` § Assistant Keys, the owner-gated settings API) and brainstorm.world (`brainstorm_server` observer and assistant-key handling).

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

### Site roles

The cast above is about *scores*. A deployment (a site: brainstorm.world, tapestry.brainstorm.world, a community hub) also has roles about *operating the site*. They recur across the estate under these names; which of them a given site has, and the defaults it chooses, are practice, recorded with their reasonable alternatives in [PRACTICES.md](./PRACTICES.md).

- **Owner** — exactly one pubkey per deployment, fixed in deployment configuration. The only role that can name Admins.
- **Admin** — zero or more pubkeys named by the Owner. May write the site's house defaults; may not change the Admin list or the Owner.
- **House POV** — the Observer whose perspective the site presents to the public and to anyone who has not configured their own (see the vocabulary entry below). A *setting*, writable by the Owner or an Admin and publicly readable, not an actor: nothing in a site may assume it can sign as the House pubkey.
- **Branded npub** — the pubkey that carries the site's name and profile, by convention the one resolvable at the site's root NIP-05 name `_@<domain>`. It signs the site's own acts of intent (the Tags it defines, the list headers it publishes, its designation). By default it is also the House POV.
- **Assistant** — a server-side key held by the deployment, one per pubkey, that signs that pubkey's *automated* publications. The per-Observer "assistant key" a Provider signs Trusted Assertions with ([trusted-assertions.md](./specs/trusted-assertions.md)) is an Assistant in this sense. A pubkey has one Assistant however many roles it holds.
- **Member** — a pubkey admitted by the site's membership rule (a vouch closure, a trust cutoff, a pairing) and granted the member surfaces. What the rule is, is site policy.
- **Customer** — a pubkey for whom the site computes and publishes under that pubkey's own point of view, possibly for a fee. Whether Customer and Member are one role or two is per deployment.
- **Guest** — signed in with a nostr identity but holding none of the roles above.
- **Public** — not signed in. Sees the house perspective, read-only.

A pubkey may hold several of these at once (an Admin who is also a Member and a Customer); the one-Assistant rule holds regardless. The **intent versus automation** principle decides which key signs what: an act of intent (defining a Tag, applying a Tagging, publishing a list header, signing a designation) is signed by the pubkey itself; an automated act (recomputing list items, republishing scores) is signed by its Assistant. Its defaults and its one recognized exception are in [PRACTICES.md](./PRACTICES.md).

## From assertions to scores — the pipeline in one paragraph

Raters publish ordinary nostr events (follows, mutes, user-level reports). A provider builds the assertion graph, and for a given Observer runs **GrapeRank** — a fixed-point iteration in which each assertion's weight depends on the asserter's own standing in that Observer's web — yielding an **Influence** in [0, 1] per Observee ([graperank.md](./specs/graperank.md)). Scores that clear the provider's publish policy are quantized to a **Rank** (0–100) and published as signed, per-Observee **Trusted Assertion** events, discoverable through the Observer's **designation** ([trusted-assertions.md](./specs/trusted-assertions.md)). Consumers resolve the designation, verify signatures, and read the world from that Observer's point of view.

## Cross-cutting vocabulary

Terms that recur across the estate but are owned by no single spec:

- **Web of trust (WoT)** — the directed graph of published assertions (follows, mutes, reports), as seen from an Observer: the raw material scores are computed from. "My WoT" in product UIs means "scores computed with me as Observer."
- **House POV** (default observer) — the deployment-chosen Observer whose perspective is presented to logged-out or unconfigured users. A convenience default, not a privileged truth: the house perspective is computed and published exactly like any other Observer's. The one thing a site may legitimately privilege to it is *admission*, since a not-yet-member has no personal perspective to be judged from. By default the House is the site's branded npub; the alternatives a site may reasonably choose instead, and how the House is changed at runtime, are in [PRACTICES.md](./PRACTICES.md).
- **Personal POV** ("my WoT") — a signed-in user's own perspective as Observer, once a Provider has computed it. Personal settings cascade over house defaults: absent a personal value, the house value applies; a personal value overrides it for that user only.
- **Preset** — a named parameter bundle for the scoring algorithm (e.g. default / permissive / restrictive). Scores are parameter-relative as well as Observer-relative, so a preset is part of the claim a score makes. Parameter semantics: [graperank.md](./specs/graperank.md); preset values are provider policy.
- **Verified (count)** — of an Observee's raters, how many themselves clear a trust threshold in the same Observer's web. "Verified followers" answers *"how many accounts that I'd trust follow this person?"* — a sybil-resistant refinement of a raw follower count. Thresholds are preset-relative.
- **Valid** (publish-worthy) — clearing the provider's publish cutoff, i.e. scoring high enough that a Trusted Assertion is published at all. Orthogonal to *verified*: a rater can count as verified without itself being published, and vice versa.
- **The estate** — the repositories and deployments implementing all of this, across two organizations operated by one team. Canonical inventory: [ECOSYSTEM.md](./ECOSYSTEM.md).

## What this document is not

Not a wire-format spec (those live in [`specs/`](./specs/) and are normative each in exactly one place); not a statement of operating practice (defaults and their alternatives live in [PRACTICES.md](./PRACTICES.md)); not implementation documentation (each codebase's own docs cover how *its* stack stores, computes, and displays — see the repos in [ECOSYSTEM.md](./ECOSYSTEM.md)); and not a statement of any deployment's policy (cutoffs, presets, and hop limits belong to providers). Per this repo's admission rule, it exists because implementers and consumers of the protocols need the model — if a change here wouldn't matter to them, it belongs elsewhere.
