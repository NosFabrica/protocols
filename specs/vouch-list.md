> **Repo metadata — not part of the spec text.**
> **Status:** 📝 pre-NIP
> **Canonical:** not yet published
> **Last updated:** 2026-11-03
> **Sources:** `NosFabrica/brainstorm_server` (`app/message_queue_tasks/process_strfry_event.py` — the ingestion this spec transcribes); `NosFabrica/brainstorm_graperank_algorithm` (the consumer).
> **Adopted by:** `brainstorm_server` (ingestion), `brainstorm_graperank_algorithm` (scoring).
> **Companion:** [graperank.md](./graperank.md) — the computation a vouch feeds.

Vouch List — a deliberate endorsement set
=====

`draft` `optional`

A **vouch list** is where a user names the keys they *stand behind*, as opposed
to the keys they merely read. A follow (kind 3) is ambient attention: cheap,
dense, and handed out for content. A vouch is a reputational act: sparse,
deliberate, and costly to the voucher — a vouch for a bad actor visibly
damages the voucher's own standing in every web of trust that counts it. The
two signals must not share a carrier, or the cheap one corrupts the costly one.

This spec defines the wire format. What a computation makes of it — GrapeRank
reads a vouch as a separate rating kind with its own parameters — lives in
[graperank.md](./graperank.md).

## Event shape

A vouch list is a NIP-51 **follow set** — kind `30003` — whose `d` tag is
exactly `vouches`:

```json
{
  "kind": 30003,
  "tags": [
    ["d", "vouches"],
    ["p", "<vouched pubkey, 64 hex>"],
    ["p", "..."]
  ],
  "content": ""
}
```

- **Addressable and replaceable.** Per NIP-01, a newer kind-30003 event with
  `d = "vouches"` from the same author replaces the older one wholesale. The
  newest list is the whole list; an empty `p` set retracts every vouch.
- **One list per author.** An author has exactly one vouch list (the `d` value
  is fixed); there is no namespacing.
- **Membership is public.** The `p` tags are the list. `content` carries
  nothing; an encrypted payload, if present, is not part of the assertion set.
- **Any other `d` value is not a vouch list.** Follow sets named anything else
  (`interesting-people`, `muted`, …) are ordinary NIP-51 lists and carry no
  assertion. Consumers MUST NOT read them as vouches.

Riding kind 30003 — rather than a dedicated kind — is deliberate: any client
that can publish a follow set can publish a vouch list today, and relays that
accept NIP-51 lists already store and serve it.

## Semantics

A vouch from author A for key B asserts: *A endorses B — not B's posts, B.* It
says nothing about why, and nothing about scope. Consumers looking for
topic-scoped trust ("I trust them *about restaurants*") want a categorised
list mechanism, not this one.

A vouch is not:

- **a follow.** Following is reading; vouching is standing behind. The same
  author will normally follow an order of magnitude more keys than they vouch.
- **a designation (kind 10040).** A designation is operational — *this key may
  publish assertions for me* — and is pinned at a fixed score. A vouch is
  reputational and flows through the computation like any other rating.
- **a certificate of identity.** A vouch makes no claim that B is who they
  claim to be; that is NIP-05's job, and the computation penalises
  impersonation independently.

## Consumer guidance

- **Read the newest replaceable event only.** Older vouch lists from the same
  author are retracted.
- **Attribute the cost correctly.** A vouch's value is the voucher's own
  standing. Consumers SHOULD weight a vouch by their trust in the voucher, as
  GrapeRank does — never by the vouched party's properties.
- **Self-vouches carry no signal.** An author vouching their own key asserts
  nothing a computation can't already assume.
