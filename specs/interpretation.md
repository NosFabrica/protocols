> **Repo metadata — not part of the spec text.**
> **Status:** 📝 pre-NIP
> **Canonical:** not yet published
> **Last updated:** 2026-10-31
> **Schema:** [interpretation.schema.json](./interpretation.schema.json) — the normative machine-readable form of §§ 1–2.
> **Sources:** `NosFabrica/Brainstorm-UI` (`docs/search/syntax.md` — the search box's language and the agent's filter mapping, both tested against the live relay on 2026-10-30; `docs/adr/0008-first-search-journeys.md` — the two query classes the worked examples in § 6 are drawn from; `client/src/lib/searchQuery.ts` — the box's own compiler); `nousclawds4/tapestry` (`protocols/drafts/content-categories.md` — the four content-category types and the category slot; `protocols/drafts/treasure-maps.md` — the category slot grammar; `protocols/drafts/filters-on-dlists.md` — the `dlists` filter field). Upstream: **NIP-01** (filters), **NIP-50** (`search`), **NIP-52** (calendar events), **NIP-73** (external identifiers).
> **Adopted by:** nothing yet. This is v0, written before its first producer.

Interpretation — The Typed Search Question
=====

`draft` `optional`

A person types words into a search box. An agent is asked to find something. A partner's service needs results for a query of its own. In each case something must decide *what was asked* before anything can decide *what to return*.

This spec defines the **interpretation**: the typed form of one search question, and the only thing a search engine in this estate needs to accept. It specifies the fields, what each one constrains, and how several candidate readings of one question are ranked. It does not specify how an interpretation is produced, nor how it is compiled into a query — those are separate documents, because the point of this one is that they can differ.

**Why a typed object rather than a rewritten string.** A string has nowhere to put the asker's point of view, no room for a confidence, and no way to carry the fact that a question has two plausible readings. It also has to be parsed again by whoever receives it. Four very different producers — a parser in a relay, a house agent, a person's own agent, a partner's service — can all fill in the same named fields, and a partner's service may never hold a string at all. An engine built against these fields is built once.

## Terminology

- **Interpretation** — one typed reading of one question: what is being asked for, constrained how, from whose point of view.
- **Interpretation set** — the ranked candidates for a single question. A question with one obvious reading has a set of one.
- **Producer** — whatever built the set: a query parser, an agent, a partner's service, or a person filling in fields directly.
- **Consumer** — whatever receives it: a compiler that turns it into a query, or a front end that renders it for the asker.
- **Content category** — a kind of thing a person might look for: profiles, product listings, *Restaurants in Nashville*. Defined normatively in Content Categories (see *Sources*); this spec only references categories, and does not redefine them.
- **Observer** — the pubkey whose web of trust ranks the results. Every result in this estate is relative to exactly one. There is no unranked answer.

## 1. The interpretation set

```json
{
  "version": "0",
  "query": "best brunch in chicago",
  "interpretations": [ /* one or more, best first */ ]
}
```

- `version` — the schema version this set is written against. For this document, the string `"0"`. A consumer that does not know a version MUST reject the set rather than guess at its fields.
- `query` — the words the asker typed, when there were any. **Display and diagnostics only**: a consumer MUST NOT re-derive constraints from it. Absent when the producer built the set without a string, which is the normal case for a partner's service.
- `interpretations` — at least one interpretation, **ordered best first**.

A producer that can read a question at all MUST return at least one interpretation. Returning an empty set to mean "I did not understand" is not permitted; an interpretation with broad targets, no filters and a low confidence says the same thing and still gives the engine something to serve.

## 2. The interpretation

| Field | Required | Constrains |
|---|---|---|
| `targets` | yes | which content categories the answer is drawn from |
| `filters` | yes (may be empty) | properties the items must have |
| `place` | no | where |
| `time` | no | when it starts |
| `pov` | yes | whose point of view ranks it |
| `residual_words` | yes (may be empty) | words no field claimed |
| `confidence` | yes | how much the producer trusts this reading |

**Absent means unconstrained, and `null` MUST NOT appear.** A field that does not constrain the question is left out. `"place": null` is invalid; omit the key. This is stricter than it needs to be on purpose: two ways to say "no constraint" is the kind of ambiguity that costs a partner a day.

### 2.1 `targets`

Each target names one content category, in the same slot encoding the Treasure Map key grammar uses, so that a category means the same thing here as it does in a Treasure Map:

| `type` | `id` | Example |
|---|---|---|
| `profile` | **absent** — the profile category has an empty slot | `{"type": "profile"}` |
| `event-kind` | the kind number, as a string | `{"type": "event-kind", "id": "30402"}` |
| `dlist` | the header's canonical `naddr`, or canonical `nevent` for an immutable header | `{"type": "dlist", "id": "naddr1…"}` |
| `external` | the NIP-73 type | `{"type": "external", "id": "isbn"}` |

- `id` MUST be absent when `type` is `profile`, and MUST be present otherwise.
- **Several targets are a union.** "What's on this weekend" asks about calendar events *and* the imported event list; both are targets of one interpretation, not two interpretations.
- The NIP-73 type is written plainly here, colons and all (`podcast:guid`). The percent-encoding the Treasure Map grammar requires applies only where the value sits in a colon-delimited key, which this is not.

### 2.2 `filters`

```json
{ "property": "cuisine", "value": "brunch" }
```

- `property` is named by the target's DList header schema, or by the NIP that defines the event kind. This spec does not enumerate properties; the header does.
- **Several filters are a conjunction.** There is no OR between filters and no grouping. A producer that wants alternatives emits a second interpretation.
- v0 carries equality only. Ranges, negation and set membership are deliberately absent; a producer that needs one today puts the words in `residual_words` and lets the engine match them.

### 2.3 `place`

```json
{ "name": "Chicago", "geohash": "dp3wjzt", "radius_km": 25 }
```

- `geohash` is the **centre** of the radius, not the area. A compiler derives the covering cells at whatever precision its index wants; a producer MUST NOT try to pick them.
- `near_observer` is `true` when the asker said "near me" and the centre is the asker's own location. At least one of `geohash` or `near_observer` MUST be present — a `place` with only a `name` constrains nothing and MUST NOT be emitted.
- `name` is **display only**, so a front end can show the asker which place was understood. A compiler MUST NOT match it as text; that is what `residual_words` is for.

### 2.4 `time`

```json
{ "label": "this weekend", "start_since": 1794031200, "start_until": 1794203999 }
```

- Both bounds are Unix seconds and both are **inclusive**. They constrain when the thing *starts*, not when it was published — a question about next weekend's concerts is not a question about notes written next weekend.
- At least one bound MUST be present.
- A producer resolving a phrase like "this weekend" MUST resolve it in the **asker's** timezone and emit absolute seconds. Relative windows are not carried on the wire, so an interpretation means the same thing whenever it is replayed.
- `label` is display only, under the same rule as `place.name`.

### 2.5 `pov`

```json
{ "observer": "<64 lowercase hex>", "scope": { "mode": "default" } }
```

- `observer` MUST be 64 lowercase hex characters. **An `npub` is not an observer**: the relay accepts the token and then ranks as though no observer were given, which looks like a working search returning the house's results. Producers convert; consumers reject anything that does not match.
- `scope` says whose curation counts inside that observer's web of trust:

| `mode` | Means | `group` |
|---|---|---|
| `default` | whatever the deployment takes "my people" to mean | **absent** |
| `named-group` | a group the asker named | required |
| `inferred-group` | a group the producer inferred from context, not from the asker's words | required |
| | | |

- `group` is a canonical `naddr` or `nevent` for a DList, or 64 lowercase hex for a single pubkey. It MUST be absent for `default` and present otherwise.
- **What `default` means is not settled, and this spec does not settle it.** It is carried as a mode precisely so that the answer can land in one place later without changing this schema. A consumer MUST NOT assume `default` means the observer's follows.
- `inferred-group` is distinguished from `named-group` so a front end can show an inferred scope differently from one the asker asked for. An asker should be able to see, and drop, a narrowing they did not request.

### 2.6 `residual_words`

Words that no field claimed. A compiler matches them **inside** the set the other fields select — as text, or by embedding — rather than as a query of their own. In "best brunch in chicago", `brunch` becomes a filter and `chicago` becomes a place; `best` is residual, because nothing in the data is called best.

Residual words are not failure. A reading that typed every word is not better than one that typed the words that carry structure.

### 2.7 `confidence`

A number in `[0, 1]`.

**Confidence is comparable within one set and nowhere else.** It orders the candidates one producer offered for one question. It is not calibrated across producers, and two producers' numbers for the same question say nothing about each other. Anything that scores producers against each other must measure outcomes, not read confidences.

## 3. Ranking

`interpretations` is ordered best first, and a consumer MUST NOT reorder it. A producer SHOULD order it by non-increasing `confidence`; where it does not, the order wins, because the order is what the producer meant.

A front end acts on the first interpretation and MAY offer the rest. This is what lets a question with two readings resolve without a second round trip: the engine serves the first, and the asker switches to the second with one tap.

## 4. What this spec does not define

Deliberately out of scope, each because it is written down elsewhere or not yet decided:

- **How an interpretation is produced.** Phrase splitting, vocabulary matching and schema lookup belong to whatever is doing the interpreting, and the whole point of this document is that several things do it differently.
- **How it is compiled.** The mapping onto this estate's own index, and the mapping onto portable NIP-01 filters plus NIP-50 extension tokens, are separate documents. Both read this one; neither is constrained by the other.
- **How it travels back.** An engine returns more than a list of events — the interpretation it acted on, the categories present and their counts — so a front end can render the reading as chips. That payload is its own document and carries the version from § 1.
- **What `default` scope means.** See § 2.5.
- **How versions change.** A rule for breaking changes is owed, and until it exists a consumer's only safe behaviour is the hard rejection in § 1.

## 5. Interpretation requirements

A conforming consumer:

1. MUST reject a set whose `version` it does not know.
2. MUST reject an `observer` that is not 64 lowercase hex, rather than falling back to no observer.
3. MUST treat an absent field as unconstrained, and MUST reject an explicit `null`.
4. MUST NOT reorder `interpretations`.
5. MUST NOT derive constraints from `query`, `place.name` or `time.label`.
6. MUST treat several `targets` as a union and several `filters` as a conjunction.
7. SHOULD serve the first interpretation and MAY offer the rest.

## 6. Worked examples

One per first-journey query class (see *Sources*). Both validate against [interpretation.schema.json](./interpretation.schema.json).

The identifiers below are **illustrative but well formed**: every `naddr` decodes, and the pubkeys are valid 64-hex. They name no real list and no real person. The two list coordinates are `39998:3f7c4e1d…5e12:food-and-drink-places` and `39998:3f7c4e1d…5e12:event-index`, each encoded as a canonical `naddr` — the `d` tag, author and kind TLVs only, no relay hints, so the same list always encodes to the same string.

### 6.1 Recommendation over places

> **"best brunch in chicago"**, asked by a signed-in person, with no scope named.

The place constrains a geography, the item property constrains the kind of place, and the recommendation word is residual. Two readings, because the underlying list carries this distinction in two different properties: a curated `cuisine` value, and a free `t` tag.

```json
{
  "version": "0",
  "query": "best brunch in chicago",
  "interpretations": [
    {
      "targets": [
        { "type": "dlist", "id": "naddr1qq2kvmm0vskkzmny94j8y6twdvkhqmrpvdjhxq3q8a7yu8v69dvxvrc7f47r4xews52vd58h8wz6jg0y6lq0vw5ttcfqxpqqqzwruxt3dn9" },
        { "type": "external", "id": "web" }
      ],
      "filters": [{ "property": "cuisine", "value": "brunch" }],
      "place": { "name": "Chicago", "geohash": "dp3wjzt", "radius_km": 25 },
      "pov": {
        "observer": "7d2a4f6c81b3e59027c4a8d1f6b093e5a27c4d8f1b6e09352a7c4d81f6b0e935",
        "scope": { "mode": "default" }
      },
      "residual_words": ["best"],
      "confidence": 0.78
    },
    {
      "targets": [
        { "type": "dlist", "id": "naddr1qq2kvmm0vskkzmny94j8y6twdvkhqmrpvdjhxq3q8a7yu8v69dvxvrc7f47r4xews52vd58h8wz6jg0y6lq0vw5ttcfqxpqqqzwruxt3dn9" }
      ],
      "filters": [{ "property": "t", "value": "brunch" }],
      "place": { "name": "Chicago", "geohash": "dp3wjzt", "radius_km": 25 },
      "pov": {
        "observer": "7d2a4f6c81b3e59027c4a8d1f6b093e5a27c4d8f1b6e09352a7c4d81f6b0e935",
        "scope": { "mode": "default" }
      },
      "residual_words": ["best"],
      "confidence": 0.41
    }
  ]
}
```

Notes on this example:

- The second target in the first reading is the external `web` category: a place's own page, commented on by trusted people, answers the same question when the curated list is thin. A producer that knows the list is sparse in a city can widen this way, and the confidence says how much it believes the widening.
- `best` stays residual. Nothing in the data is called best; ranking by the observer's web of trust is what "best" asks for, and that is the engine's job, not a filter's.
- 25 km matches how the places data was counted when the journey was chosen (see *Sources*).

### 6.2 Recommendation over events

> **"what's on this weekend in chicago"**, asked on Friday 2026-11-06 in `America/Chicago`.

Place joins time. Two targets of different types in one reading, because upcoming events in this estate live both as native calendar events and as items of an imported list.

```json
{
  "version": "0",
  "query": "what's on this weekend in chicago",
  "interpretations": [
    {
      "targets": [
        { "type": "event-kind", "id": "31922" },
        { "type": "event-kind", "id": "31923" },
        { "type": "dlist", "id": "naddr1qq9k2an9de6z66twv3jhsq3q8a7yu8v69dvxvrc7f47r4xews52vd58h8wz6jg0y6lq0vw5ttcfqxpqqqzwruruta3j" }
      ],
      "filters": [],
      "place": { "name": "Chicago", "geohash": "dp3wjzt", "radius_km": 40 },
      "time": {
        "label": "this weekend",
        "start_since": 1794031200,
        "start_until": 1794203999
      },
      "pov": {
        "observer": "7d2a4f6c81b3e59027c4a8d1f6b093e5a27c4d8f1b6e09352a7c4d81f6b0e935",
        "scope": { "mode": "default" }
      },
      "residual_words": [],
      "confidence": 0.82
    }
  ]
}
```

Notes on this example:

- The bounds are Saturday 2026-11-07 00:00:00 to Sunday 2026-11-08 23:59:59 in `America/Chicago` (UTC−6 on those dates), resolved to absolute seconds by the producer. A consumer never sees "this weekend".
- `filters` is present and empty. "What's on" names no property; the question is entirely place and time.
- 40 km, wider than § 6.1's 25, because events were counted by a city assignment that folds in suburbs (see *Sources*). A producer is free to choose the radius; the schema only carries it.
- `residual_words` is empty: every word that carried structure found a field, and "what's on" is the question's shape rather than its content.

## 7. Implementation variance (informative)

Nothing implements this yet. The first known consumers will be a compiler onto this estate's index and a compiler onto portable NIP-01 and NIP-50 filters; the first known producers, a query parser running inside a relay and an agent emitting the object directly. Where the two compilers cannot express the same interpretation equally well, the portable one is expected to lose precision rather than refuse — a less clever result from any relay is the point of having it.

## 8. Open questions

1. **Calibrating confidence.** § 2.7 says confidences are not comparable across producers. Measuring one producer against another therefore needs scored outcomes on a fixed question set. Whether this spec should also require a stated calibration method is open.
2. **Filter operators.** v0 is equality only (§ 2.2). Ranges are the first likely addition — a price ceiling, a rating floor — and would be the first test of the versioning rule § 4 defers.
3. **Negation.** The search box accepts `-word`; this schema has nowhere to put it, and such words currently fall into `residual_words`, where their sense is lost. Either `residual_words` gains structure or `filters` gains negation.
4. **Whether `targets` can mix a union with a per-target filter.** Today `filters` applies to every target, which is wrong for a union of categories with different schemas: `cuisine` means nothing to a calendar event. v0 avoids this by convention (producers keep mixed-type unions unfiltered, as in § 6.2); a later revision may need per-target filters.
5. **Several places, several times.** "Chicago or Milwaukee" and "Saturday or next Saturday" have no form here, and become separate interpretations. Whether that is the right answer or a missing array is open.
