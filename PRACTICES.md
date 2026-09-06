# Practices

> **Role:** the operating practices shared across the estate, each stated as a **default** together with the **reasonable alternatives** a deployment may choose instead. This is apparatus, like [CONCEPTS.md](./CONCEPTS.md): nothing here is normative for wire formats. Where a practice touches a wire format, it points at the spec. Where a practice is only a default, it says so, and a site that departs from it should record why in its own docs.
> **Last updated:** 2026-09-05. **Sources:** the deployed behavior of tapestry.brainstorm.world (`BIBLE.md` § Assistant Keys; the owner-gated settings API; `/api/owner-info` and `/api/grapevine/preferences`), brainstorm.world (`brainstorm_server`: `default_observer_pubkey`, the per-pubkey assistant nsec, the NIP-05 `_` name; `Brainstorm-UI`: house-observer resolution, kind-10040 signing, the `/setup` prompt), the Les Femmes Orange hub (tag-gated membership), and the Brainstorm Cafe's design documents ([trusted-agents](https://github.com/nous-clawds4/trusted-agents)), which are the first to write these down.
> **Adopted by:** tapestry, brainstorm.world, LFO hub (each as noted per practice); the Brainstorm Cafe (specified, pre-implementation).

Roles named here are defined in [CONCEPTS.md § Site roles](./CONCEPTS.md#site-roles).

## 1. Choosing the House POV

**Default: the site's branded npub.** The House POV is the pubkey that carries the site's name and profile, resolvable at the root NIP-05 name `_@<domain>`. The public then reads the site's own perspective as the site's own, and the Tags and list headers the site publishes with intent come from the same identity the public already knows.

*Adopted by:* brainstorm.world, whose clients resolve the house observer by fetching `/.well-known/nostr.json?name=_` and reading the `_` entry, which the server fills from its configured default observer.

**Reasonable alternatives**, none of which breaks the model, since a house perspective is computed and published like any other Observer's:

- **The Owner's pubkey.** Simplest for a single-operator site; conflates the person who administers the site with the perspective it presents.
- **The developer's personal npub.** Common for research and staging deployments, where the developer's own web of trust is the one being exercised.
- **A community leader's npub**, who is neither the developer nor the Owner. Appropriate for a hub whose perspective *should* be a particular person's.

*Adopted by:* tapestry.brainstorm.world, whose house POV pubkey is distinct from its owner pubkey (both are publicly readable there).

**Rules that hold under every choice:**

- The House is a **runtime setting**, writable by the Owner or an Admin and **publicly readable**, so that visitors and the personal/house switcher can resolve it without signing in. It is not a deploy-time constant. *(tapestry: `GET`/`PUT /api/grapevine/preferences`, the write behind an owner-or-admin check.)*
- **The House is not assumed to be under the operators' control.** Its nsec may be held by the Owner, by the developer, or by someone else entirely. Nothing in a site may sign as the House pubkey; anything the House pubkey must sign is an act of intent, requested of whoever holds the key.
- **Admission is the only thing a site may privilege to the House.** Everything a signed-in user sees is computed from their own perspective once they have one; the House is the fallback, not the truth.
- **Changing the House changes who is admitted** wherever admission depends on it. A site should apply the change through its ordinary re-evaluation path and record the change (who, when, from which pubkey to which).

## 2. House defaults and the personal cascade

**Default:** a site keeps a small set of **house defaults** (the House POV pubkey, the scoring preset, site-wide filters and sort, and whatever admission thresholds it has), **publicly readable, writable by Owner or Admin only**, over which each signed-in user's **personal preferences cascade**: absent a personal value, the house value applies; a personal value overrides it for that user alone.

*Adopted by:* tapestry (house-wide search preferences with per-user overrides, resolved per request); brainstorm.world (house versus personal point of view, with the personal perspective used once the user has activated scoring).

**Alternatives:** a site with no signed-in users at all may have house defaults only; a site may expose fewer knobs to users than it keeps as defaults. What a site should not do is let a user's personal value change the house value, or let the house value silently override a personal one.

## 3. Owner and Admins

**Default:** exactly one **Owner** pubkey, fixed in deployment configuration; zero or more **Admin** pubkeys, **named by the Owner and editable by no one else**. Owner or Admin may write house defaults; only the Owner may change the Admin list. *(tapestry: `BRAINSTORM_OWNER_PUBKEY`; an owner-or-admin check on settings writes and an owner-only check on admin management.)*

**Alternatives:** a site may expose only an Admin role, with the operator identity living outside the application. *(brainstorm.world's client knows an admin flag from the session token and no distinct Owner role.)* A site may also have no Admins at all; the default allows zero.

## 4. Site Assistants

**Why an Assistant exists.** So that a pubkey's publications can be created and republished while the person is at work, asleep, or logged off. A Provider recomputes scores on a schedule; a list of computed verdicts changes whenever its inputs do; none of that can wait for a human to sign. The Assistant is a **server-side key, held by the deployment, one per pubkey**, that signs that pubkey's automated publications. It is what [trusted-assertions.md](./specs/trusted-assertions.md) calls the provider's dedicated per-Observer key.

**What it signs, and what it never signs.** See § 5. In one line: automation, never intent.

**Issuance.** *Default:* an Assistant is created for a pubkey the first time the site has something to publish for it, and for the Owner, the House, and each Admin at setup. *Adopted by:* brainstorm.world (the observer key is created at first sign-in, and again by the periodic scoring job for any observer that lacks one); tapestry (the owner's Tapestry Assistant at first container start, a key per customer at customer sign-up). *Alternative:* issue only on admission, so that a signed-in non-member has no Assistant until accepted. *(The Brainstorm Cafe's choice.)*

**One per pubkey.** A pubkey holding several roles has one Assistant. **Never deleted:** if the pubkey loses whatever role gave it something to publish, the Assistant lies dormant and is used again only if the role returns. Rotation (below) is the only way an Assistant is retired.

**Discovery.** A pubkey designates its Assistant in its own kind-10040 event, one entry per delegated responsibility, each keyed by the delegated kind per NIP-85 and the estate's conventions: `["30382:rank", <assistant>, <relay>]` for rank assertions, the bare-kind and `<kind>:<name>` entries of the Trusted Lists and assistant-designation drafts for lists and headers. **A pubkey's 10040 names that pubkey's own Assistant.** Naming someone else's Assistant is a deliberate adoption of their perspective for that responsibility, allowed, and the exception. A site never fills in another pubkey's Assistant on a user's behalf.

**If an Assistant's nsec is compromised.** Living on a server, it can be. The response, in order:

1. **Secure the site**: close the hole before anything else, or the next key goes the same way.
2. **Rotate**: create a new Assistant for the affected pubkey. The old one is retired, the only case in which an Assistant is.
3. **Revoke by re-designation**: the compromised pubkey must be **scrubbed from every kind-10040 that names it**. Each 10040 is signed by its owner, so this is an act of intent per affected user, not something the site can do for them; the site prompts each of them (§ 6). Consumers that resolve designations stop following the old key as each 10040 is republished.
4. **Flag the key**: publish a Tagging that marks the compromised pubkey as such, so that consumers who filter by tags can drop its events, including the ones it signed before the compromise, which no revocation can retract.

The cost of a compromise therefore scales with the number of 10040s naming the key. A House Assistant, named by many, is the one to guard most.

## 5. Who signs what: intent versus automation

**The rule.** An act of **intent** is signed by the pubkey itself. An **automated** act is signed by that pubkey's Assistant. The Assistant exists for the second kind and for nothing else.

| Act | Signed by | Kind |
|---|---|---|
| Defining a Tag | the pubkey (for a site's own Tags, its branded npub) | intent |
| Applying a Tagging (Alice tags Bob) | Alice | intent |
| Publishing a list header that carries a stipulation or a definition | the pubkey (for a site's lists, its branded npub) | intent |
| Publishing a kind-10040 designation | the pubkey; NIP-85 requires it | intent |
| Publishing or refreshing computed list items (verdicts, rosters, rankings) | the Assistant | automation |
| Publishing Trusted Assertions and Trusted Lists | the Assistant, as Provider | automation |

*Adopted by:* brainstorm.world (users sign their own 10040 in the browser; the per-user key signs their assertions); tapestry (users sign their own headers and taggings when they can; the Tapestry Assistant signs scheduled and server-side publications); the LFO hub (every vouch is signed by the vouching member).

**The recognized exception: Assistant-authored headers for bootstrapping.** A header a user would sign with intent is sometimes needed before the user can sign anything, at install time or in a server-side seeding step. tapestry's [assistant-designation draft](https://github.com/nous-clawds4/tapestry/blob/main/protocols/drafts/assistant-designation.md) covers exactly this: the Assistant may author a header on the user's behalf, the user's 10040 designates it for that purpose, and **a personally signed header always wins** over the Assistant's when both exist. That precedence is what keeps the exception from swallowing the rule.

**Corollary for lists with two authors.** Because a header is intent and items are automation, a site's list may well have its header signed by the branded npub and its items signed by an Assistant. The header should then name the pubkey whose designated Assistant publishes the items, so that a reader can find the item author without knowing the site.

## 6. Prompting a user to sign an act of intent

**Default:** a persistent banner at the top of every page while the signed-in user has acts of intent outstanding, with the count, leading to a single **setup page** that lists them as done and pending rows; each pending row opens its own action page, and every action returns to the setup page so progress is visible in one place. The first such act on most sites is publishing the kind-10040 that names the user's Assistant; re-signing it after a rotation (§ 4) is another.

*Adopted by:* brainstorm.world (`/setup`, with a "finish setup" banner and a dedicated page for the 10040).

**Alternatives:** a one-time wizard at sign-up (brainstorm.world's earlier flow, replaced because a linear wizard hides what remains undone); per-item nudges with a snooze, appropriate for optional acts such as a key backup.

## What this document is not

Not a wire-format spec (those are in [`specs/`](./specs/) and the drafts they point at); not a description of any one codebase (each repo's own docs cover how *it* implements these); and not a rulebook: every section above is a default, and a site that has a reason to depart from one should do so and write the reason down where its future maintainers will find it.
