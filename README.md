# Brainstorm/Tapestry Protocols

The protocol specifications shared across the Brainstorm/Tapestry estate, plus what an implementer needs to use them: the ecosystem and adoption map ([ECOSYSTEM.md](./ECOSYSTEM.md)), the spec index below, and the status ladder.

One team operates two GitHub organizations — [NosFabrica](https://github.com/NosFabrica) (production) and [nous-clawds4](https://github.com/nous-clawds4) (research & development). Protocols are drafted and piloted on the R&D side; once a spec is implemented across the estate — or is ready for adoption beyond it — its working copy moves here. [ECOSYSTEM.md](./ECOSYSTEM.md) maps the repositories and deployments behind these specs.

## Layout

- `README.md` — this file: the spec index, status ladder, and admission rule
- `ECOSYSTEM.md` — the canonical map of the estate (organizations, repositories, deployments)
- `CONCEPTS.md` — the conceptual canon behind the specs: the five-claim model, the cast of roles, and the cross-cutting vocabulary no single spec owns
- `specs/` — one file per specification, flat. A spec's path never changes after it lands here; its status lives in its header and the index above, not in its location.

## What belongs here

**Admission rule: everything in this repo must serve someone implementing or consuming these protocols.**

In scope:

- **Wire formats** — event kinds, tag names and values, event shapes, resolution algorithms: anything that leaves the machine as signed nostr events that an independent implementation would need to parse or produce to interoperate.
- **Consumer-facing semantics** — what published values mean, e.g. how to interpret a Trusted Assertion's `rank` and `hops` tags.
- **Apparatus for implementers** — this index, the status ladder, the ecosystem/adoption map, and the conceptual canon ([CONCEPTS.md](./CONCEPTS.md)).

Out of scope, and where it lives instead:

- How a particular codebase stores, computes, or displays these structures → that repo's own docs (e.g. [tapestry's BIBLE.md](https://github.com/nous-clawds4/tapestry/blob/main/BIBLE.md)).
- Deployment and operations detail → each repo's ops docs.
- Early-stage drafting → [tapestry's `protocols/` directory](https://github.com/nous-clawds4/tapestry/blob/main/protocols/README.md), the drafting workshop.

## Maturity model

Specs mature through three layers:

1. **Repo-specific.** Drafted and used inside one codebase; lives there (today: [`tapestry/protocols/drafts/`](https://github.com/nous-clawds4/tapestry/tree/main/protocols/drafts)). A spec may stay at this layer forever by design.
2. **Ecosystem.** Implemented across the estate — R&D and production. The working copy moves to this repo; the old path keeps a pointer. Every wire format is normative in exactly one place.
3. **Published.** Intended for adoption beyond the estate. A signed snapshot is published to [NostrHub](https://nostrhub.io); **the file in this repo remains the normative working copy**, and its header records the canonical `naddr` and last-published date.

A spec relocates once in its life (layer 1 → 2). Layer 2 → 3 is a status change and a publication act, not a move — adopters' links keep working.

### Status ladder

| Status | Meaning |
|---|---|
| 💭 idea | not yet a coherent document |
| 📝 pre-NIP | local draft; may stay internal by design |
| 🧪 pre-NIP (publish-ready) | content complete; awaiting the decision/act of publication |
| 🚀 published | live on NostrHub; the file here is the normative working copy |
| 🚀 published (update pending) | the working copy has diverged ahead of the published snapshot; republish needed |

Each spec's header records: status, canonical external URL (`naddr`) once published, last-published date, sources, and **Adopted by** — its known implementations (see [ECOSYSTEM.md](./ECOSYSTEM.md)). Publishing is the author's act: republishing to NostrHub requires the author's keys, so repo work ends at "publish-ready."

## Spec index

Migration into this repo is gradual; "Lives today" names the current normative home. For drafts still living in tapestry, [tapestry's spec index](https://github.com/nous-clawds4/tapestry/blob/main/protocols/README.md) remains authoritative. Index last synced: 2026-08-17.

| Spec | Status | Lives today |
|---|---|---|
| Decentralized Lists — base NIP (kinds 9998/9999/39998/39999) | 🚀 published (update pending) | [tapestry/protocols/nips/](https://github.com/nous-clawds4/tapestry/blob/main/protocols/nips/decentralized-lists.md) |
| DList Cross-NIP Compatibility | 🧪 publish-ready | [tapestry/protocols/drafts/](https://github.com/nous-clawds4/tapestry/tree/main/protocols/drafts) |
| Tapestry Concepts (DList extensions) | 📝 pre-NIP | tapestry/protocols/drafts/ |
| Class Thread Relationships (`n`, `s`) | 📝 pre-NIP | tapestry/protocols/drafts/ |
| Inherit-From & Resolved Definition (`b`) | 📝 pre-NIP | tapestry/protocols/drafts/ |
| Communities | 📝 pre-NIP | tapestry/protocols/drafts/ |
| Tags & Taggings | 📝 pre-NIP | tapestry/protocols/drafts/ |
| Event Taggings | 📝 pre-NIP | tapestry/protocols/drafts/ |
| Trusted Lists (list analog of NIP-85) | 📝 pre-NIP | tapestry/protocols/drafts/ |
| Assistant Designation (NIP-85 companion) | 📝 pre-NIP | tapestry/protocols/drafts/ |
| Shared Concepts (policy layer) | 📝 pre-NIP | tapestry/protocols/drafts/ |
| Stamping | 📝 pre-NIP | tapestry/protocols/drafts/ |
| Profile Presentation | 📝 pre-NIP | [Brainstorm-UI/docs/nips/](https://github.com/NosFabrica/Brainstorm-UI/blob/main/docs/nips/profile-presentation.md) |
| Trusted Assertions consumer spec (kind 30382: `rank`, `hops` semantics) | 📝 pre-NIP | [specs/trusted-assertions.md](./specs/trusted-assertions.md) |
| GrapeRank — personalized trust-score computation | 📝 pre-NIP | [specs/graperank.md](./specs/graperank.md) |

## How a spec gets here

1. **Drafted** in [`tapestry/protocols/drafts/`](https://github.com/nous-clawds4/tapestry/tree/main/protocols/drafts) via the [Protocol-Spec workflow](https://github.com/nous-clawds4/tapestry/blob/main/engineering-team/workflows/protocol-spec-workflow.md).
2. **Promoted** here by pull request once it is implemented across the estate or ready for outside adoption. Ownership transfers; the old path keeps a pointer; the index above gains a row.
3. **Published** to NostrHub as a deliberate act by the author, recorded in the spec's header. Revisions continue here; each ratified revision is republished so the public snapshot never trails far behind the working copy.

## Contributing

Implementers' issues are the most valuable input this repo receives — ambiguities, interop failures, missing semantics. Open an issue. Spec changes land by pull request; a change to a 🚀 published spec should state whether it requires a republish to NostrHub.
