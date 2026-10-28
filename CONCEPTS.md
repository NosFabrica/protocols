# Concepts

> **Role:** the conceptual canon behind the specs in this repo — the model that makes them make sense. This is apparatus, not a specification: nothing here is normative for wire formats, and where a term has a normative definition in a spec, this document points there instead of redefining it.
> **Last updated:** 2026-10-28. **Sources:** distilled from `brainstorm_server/CONTEXT.md`, tapestry's architecture invariants (`CLAUDE.md`) and SECURITY.md trust-model note, and the two specs below; the concept graph's vocabulary from tapestry's BIBLE (§§ 6, 21, 23) and its Class Thread Relationships draft.

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
- **The estate** — the repositories and deployments implementing all of this, across three GitHub accounts operated by one team. Canonical inventory: [ECOSYSTEM.md](./ECOSYSTEM.md).

## The concept graph's vocabulary

Tapestry turns flat nostr lists into a graph of concepts. The mistake that recurs in modelling with it is treating two different things as one, so these words are kept apart, and this is the one place they are defined. Other glossaries, such as tapestry's BIBLE § 21, point here. Where a spec owns a term's wire format, the term links to it.

- **Concept** — an abstract idea, such as *widget* or *Irish setter*. It is not the set of things it describes: the idea of a widget is one thing, and all the widgets there are is another. A concept lives in a graph database (Neo4j, in the reference implementation), where its class thread gives it structure.
- **Superset** — the set of everything a concept describes: *all widgets*, *all Irish setters*. A concept points to its superset (`IS_THE_CONCEPT_FOR`).
- **Element**, or **instance** — one member of a set: *the widget on my table*, *Spot*. As an object is to its class in object-oriented programming, an element is an instance of the idea, not the idea.
- **Subset** — a set whose members all belong to a larger set: *Irish setters*, the set, is a subset of *dogs*.

The test case: *Irish setters*, the superset, is a subset of *dogs*. *Irish setter*, the abstract concept, is not a subset of dogs: it is an element of the list of *dog breeds*.

- **DList** — a decentralized list, the nostr form of a concept: a header (kind `39998` or `9998`) that names the list and its fields, and items (kind `39999` or `9999`) that point to it with a `z` tag. A DList lives on nostr, and a concept lives in a graph database; a concept often begins as a DList. Wire format: [Decentralized Lists](https://github.com/nousclawds4/tapestry/blob/staging/protocols/nips/decentralized-lists.md).
- **Class thread** — the path that structures a concept in the graph, in three relationship types:
  - **initiation**: the concept to its superset (`IS_THE_CONCEPT_FOR`);
  - **propagation**: a superset to its subsets, zero or more hops (`IS_A_SUPERSET_OF`);
  - **termination**: a set to its elements (`HAS_ELEMENT`).

  Wire format for propagation and termination: [Class Thread Relationships](https://github.com/nousclawds4/tapestry/blob/staging/protocols/drafts/class-thread-relationships.md) (`n`, `s`).
- **Vertical integration** — joining concepts up and down a class thread, in two kinds:
  - **by subset** (propagation): *Irish setters* is a subset of *dogs*, and *restaurants in Boston* is a subset of *restaurants*;
  - **by element** (termination): *Spot* is an element of *Irish setters*.
- **Horizontal integration** — joining concepts across, rather than up and down: one concept's elements are the values allowed for a property of another, through an `ENUMERATES` edge from the first concept's superset to that property. The elements of *dog breeds* are the values allowed for a dog's breed.

**Retired words.** None yet. When one of these words is renamed, the old word is listed here with the word that replaced it, so older writing still reads correctly.

## What this document is not

Not a wire-format spec (those live in [`specs/`](./specs/) and are normative each in exactly one place); not implementation documentation (each codebase's own docs cover how *its* stack stores, computes, and displays — see the repos in [ECOSYSTEM.md](./ECOSYSTEM.md)); and not a statement of any deployment's policy (cutoffs, presets, and hop limits belong to providers). Per this repo's admission rule, it exists because implementers and consumers of the protocols need the model — if a change here wouldn't matter to them, it belongs elsewhere.
