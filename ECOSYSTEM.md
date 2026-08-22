# The Brainstorm/Tapestry Ecosystem

**Last updated: 2026-08-22.** The map of the estate behind the specs in this repo: the organizations, repositories, and deployments, and how work flows between them. If you are evaluating these protocols, this file answers *who implements them, where, and at what release stage*.

This file is the **canonical inventory** of the estate: the lists of repositories, hostnames, and roles are normative here. Two related things live elsewhere by design: the security-facing ownership *attestation* belongs to each codebase's SECURITY.md (see [Deployments](#deployments)), and per-host operational *status* belongs to point-in-time surveys (the most recent: the [estate audit](https://github.com/NosFabrica/Brainstorm-UI/blob/main/docs/estate-audit.md) of 2026-08-11/12).

## One team, two organizations

Brainstorm is a personalized web-of-trust system for nostr: it computes contextual trust scores (GrapeRank) from each observer's point of view and publishes them back to nostr as signed events. The work spans two GitHub organizations operated by the same team. The deployments resemble one another because they share codebases at different release stages — they are not clones operated by different parties.

| Organization | Role |
|---|---|
| [NosFabrica](https://github.com/NosFabrica) | Production. The company ([nosfabrica.com](https://nosfabrica.com)); operates the flagship deployment at [brainstorm.world](https://brainstorm.world). |
| [nous-clawds4](https://github.com/nous-clawds4) | Research & development. Protocols and features are drafted, piloted, and hardened here first. |

Work graduates from R&D to production: features and specs are developed and proven in `nous-clawds4/tapestry`, then adopted by the NosFabrica repositories. Cross-org contributions flow by fork and pull request. Protocol maturation follows the same gradient — see the [maturity model](./README.md#maturity-model).

## Repositories

| Repository | Org | Role |
|---|---|---|
| [tapestry](https://github.com/nous-clawds4/tapestry) | nous-clawds4 | R&D application: local-first personal knowledge graph and web-of-trust engine. Reference implementation for most specs in this repo; drafting workshop in [`protocols/`](https://github.com/nous-clawds4/tapestry/blob/main/protocols/README.md); canonical concept docs in [`BIBLE.md`](https://github.com/nous-clawds4/tapestry/blob/main/BIBLE.md). |
| [tapestry-cli](https://github.com/nous-clawds4/tapestry-cli) | nous-clawds4 | CLI for curating concepts via the Tapestry Protocol — the agent-facing interface to tapestry. |
| [brainstorm-cli](https://github.com/nous-clawds4/brainstorm-cli) | nous-clawds4 | CLI enabling LLM agents to use the production Brainstorm backend. |
| [Brainstorm-UI](https://github.com/NosFabrica/Brainstorm-UI) | NosFabrica | Production web UI (React + TypeScript + Vite, served by nginx). |
| [brainstorm_server](https://github.com/NosFabrica/brainstorm_server) | NosFabrica | Production backend (Python/FastAPI): ingests nostr events, maintains the follow/mute/report graph (Neo4j), schedules GrapeRank runs, publishes Trusted Assertions, serves profile search (Vespa). |
| [brainstorm_graperank_algorithm](https://github.com/NosFabrica/brainstorm_graperank_algorithm) | NosFabrica | The GrapeRank computation itself — the Java worker invoked per run. |
| [brainstorm-k8s](https://github.com/NosFabrica/brainstorm-k8s) | NosFabrica | Kubernetes charts for the production and staging fleets (private). |
| [brainstorm_one_click_deployment](https://github.com/NosFabrica/brainstorm_one_click_deployment) | NosFabrica | Docker-based deployment bundle, including the Vespa application package. |
| [brainstorm_integration_tests](https://github.com/NosFabrica/brainstorm_integration_tests) | NosFabrica | Integration tests for queueing GrapeRank calculations in bulk. |
| [neofry](https://github.com/NosFabrica/neofry), [strfry](https://github.com/NosFabrica/strfry) | NosFabrica | The estate's nostr relays (strfry-based). |
| protocols (this repo) | NosFabrica | Shared protocol specifications and this map. |

**Lineage:** the historical protocol repos [wds4/DCoSL](https://github.com/wds4/DCoSL) and [wds4/tapestry-protocol](https://github.com/wds4/tapestry-protocol) (superseded by the specs indexed here), and the original [Brainstorm prototype](https://github.com/pretty-good-freedom-tech/brainstorm), are the ancestors of the current estate.

### External implementations

Implementations of these protocols maintained outside the estate's two
organizations. They are inventoried here so *"who implements this?"* keeps one
answer, but the estate does not operate or attest them — ownership and security
contact are those repositories' own.

| Repository | Maintainer | Role |
|---|---|---|
| [magic-carpet-desktop](https://github.com/matthiasdebernardini/magic-carpet-desktop) | [matthiasdebernardini](https://github.com/matthiasdebernardini) | Desktop auto-payer for Magic Carpet bounties (Rust): consumes Decentralized-Lists claim events and Trusted Assertions to pay bounty claims from the issuer's own machine, so the issuer's nsec never reaches a server. Developed against the `magic-carpet.brainstorm.world` sandbox. |

## Deployments

All hosts below are operated by the same team; both the `brainstorm.world` and `nosfabrica.com` domains are ours.

**Division of authority.** This file is the canonical *inventory*: the full list of hosts and their roles is normative here. The ownership *attestation* — the security-policy statement that these deployments are ours, together with how to report a vulnerability — lives in each codebase's SECURITY.md ([Brainstorm-UI/SECURITY.md](https://github.com/NosFabrica/Brainstorm-UI/blob/main/SECURITY.md), [tapestry/SECURITY.md](https://github.com/nous-clawds4/tapestry/blob/main/SECURITY.md)), scoped to the hosts that codebase serves, and is what each host's `/.well-known/security.txt` (RFC 9116) points at. Those scoped tables are deliberate copies: if one of them disagrees with this file, this file is right and the copy has a bug.

**Product UI — Brainstorm-UI**

| Host | Role |
|---|---|
| brainstorm.world | Production |
| brainstorm.nosfabrica.com | Production alias |
| brainstorm-staging.nosfabrica.com | Staging |

**R&D UI — tapestry**

| Host | Role |
|---|---|
| tapestry.brainstorm.world | Reference deployment |
| staging.brainstorm.world | Pre-production |
| tags.brainstorm.world, communities.brainstorm.world, magic-carpet.brainstorm.world, curate.brainstorm.world | Feature sandboxes |

**Backend APIs — brainstorm_server**

| Host | Role |
|---|---|
| api.brainstorm.world | Production API |
| search.brainstorm.world | Search API |
| brainstormserver.nosfabrica.com | Production API |
| brainstormserver-staging.nosfabrica.com | Staging API |

**Relays — strfry/neofry**

| Host | Role |
|---|---|
| scores.brainstorm.world | Public relay |
| nip85.brainstorm.world | Trusted Assertions |
| dcosl.brainstorm.world | Decentralized lists |
| nip85.nosfabrica.com | NIP-85 |
| nip85-staging.nosfabrica.com | NIP-85 staging |

## How a trust score is born

1. Nostr events — follows, mutes, reports, profiles — are ingested by `brainstorm_server`, which maintains the social graph in Neo4j.
2. A **Brainstorm request** runs the GrapeRank calculation (the Java worker) for one **Observer**, assigning every reachable user an **Influence** score in [0, 1] from that observer's point of view.
3. Above-cutoff scores are published as **Trusted Assertions** — signed kind-30382 events whose `rank` tag carries `round(Influence × 100)` and whose `hops` tag carries follow-path distance — to the estate's relays, and mirrored into Vespa for search.
4. Clients — the Brainstorm UI, tapestry, and any third-party consumer — read Trusted Assertions from relays and filter or rank content per point of view.

The event formats and semantics in steps 2–4 are exactly what this repo specifies.

## Keeping this map honest

Update this file when a repository is created, renamed, or retired; when a hostname is added or dropped; or when a spec gains or loses an implementation. Inventories drift silently — the estate audit exists because this one did. Per-host operational status does **not** belong here; run and link a dated survey instead.

Because this file is the canonical inventory, a change to the estate lands *here first*, then propagates to the scoped SECURITY.md tables. The published security.txt documents carry an `Expires` date (currently 2027-08-11, all fleets); when that renewal comes due, re-verify every SECURITY.md table against this file as part of the same ritual — copies drift between renewals, and the renewal is the scheduled moment to catch them.
