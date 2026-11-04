> **Repo metadata — not part of the spec text.**
> **Status:** 📝 pre-NIP
> **Canonical:** not yet published
> **Last updated:** 2026-11-02
> **Version:** `0.1`. Its versioning rule is § 9; what counts as a breaking change is § 9.2.
> **Schema:** [interpretation.schema.json](./interpretation.schema.json) — the normative machine-readable form of §§ 1–2.
> **Sources:** `NosFabrica/Brainstorm-UI` (`docs/search/syntax.md` — the search box's language and the agent's filter mapping, both tested against the live relay on 2026-10-30; `docs/adr/0008-first-search-journeys.md` — the two query classes the worked examples in § 6 are drawn from; `client/src/lib/searchQuery.ts` — the box's own compiler); `nousclawds4/tapestry` (`protocols/drafts/content-categories.md` — the four content-category types and the category slot; `protocols/drafts/treasure-maps.md` — the category slot grammar; `protocols/drafts/filters-on-dlists.md` — the `dlists` filter field). Upstream: **NIP-01** (filters), **NIP-50** (`search`), **NIP-52** (calendar events), **NIP-73** (external identifiers).
> **Adopted by:** nothing yet. This is v0.1, still written before its first producer — and that line is load-bearing, not
> a status note: under § 9.4 a version is amendable in place until something outside this estate ships against it, and
> naming an adopter here is what freezes it.
> **Decided by:** `NosFabrica/Brainstorm-UI` `docs/adr/0011-versioning-the-interpretation-schema.md` (Loom D4.4), which
> settled § 9 and the amendments that made this `0.1` rather than `0`.

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
- **Observer** — the pubkey whose web of trust ranks the results. An interpretation always names one, because `pov` is required, so no interpretation asks an unranked question. The estate itself can answer one: a relay may serve the whole corpus unranked when asked to (NIP-50 `include:spam`), and that is not an interpretation's doing.

## 1. The interpretation set

```json
{
  "version": "0.1",
  "query": "best brunch in chicago",
  "interpretations": [ /* one or more, best first */ ]
}
```

- `version` — the schema version this set is written against, as `MAJOR.MINOR`. For this document, the string `"0.1"`. It is a string and not a number because `0.10` and `0.1` are the same JSON number and different versions. **What a consumer does with a version it does not fully know is § 9.3**, and it is no longer a single hard rejection: an unknown *major* is rejected, while a known major with a higher *minor* is served on the fields the consumer knows, and reported.
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
- v0.1 carries equality only. Ranges, negation and set membership are deliberately absent; a producer that needs one today drops it and lowers `confidence` (see § 2.6 on polarity), rather than smuggling it into `residual_words`.
- **`filters` applies to every target, including a union of different types, and a consumer MUST NOT decide for itself that a property does not apply.** This spec does not enumerate properties — the DList header or the NIP defining the kind does (above) — so a consumer has no grounds to judge. It therefore applies every filter to every target; a target that cannot carry the property returns nothing; and **it MUST report every target that returned nothing while another target of the same union returned results**, so a front end can say the union narrowed rather than showing a quietly smaller answer.

  Of the three available behaviours this is the only correct one. Refusing the interpretation answers nothing when the other targets are answerable, and dropping the filter for the target that cannot carry it *widens* the answer — returning calendar events that are not brunch — which breaks the one invariant every rendered chip rests on: **every result satisfies every filter**. The narrowing is the honest cost, and the report is what makes it visible.

  A producer can avoid the situation entirely by keeping mixed-type unions unfiltered, as § 6.2 does, and v0 relied on that convention alone. It is now a consumer obligation instead, because a convention binds nobody. Carrying the filter on the target, which removes the need for either, is a v1 item (§ 8.4).

### 2.3 `place`

```json
{ "name": "Chicago", "geohash": "dp3wjzt", "radius_km": 25 }
```

- `geohash` is the **centre** of the radius, not the area, and it is **required**. A compiler derives the covering cells at whatever precision its index wants; a producer MUST NOT try to pick them.
- `near_observer` is **display only**: `true` when the asker said "near me" and the `geohash` beside it is the asker's own location, so a front end can say "near you". It is not the constraint and never stands in for the centre. A producer that means "near me" resolves the centre itself and sends a `geohash`.

  v0 let `near_observer` appear *instead* of a `geohash`, and that was a mistake rather than a convenience: the asker's own location is nowhere in this object, and nothing in any wire format downstream will supply it, so no consumer could serve such a place. It could only drop it — and a search that silently stops constraining looks exactly like a working search, which is why this spec refuses it, as it refuses an `npub` observer in § 2.5. The relay happens to reject an `npub` outright rather than fall back quietly (§ 2.5), so the two differ in what goes wrong downstream; the spec does not rely on either behaviour. A `place` that constrains nothing MUST NOT be emitted, whether it carries only a `name` or only a flag.
- **An absent `radius_km` means the cell the `geohash` names, at its own precision** — not a radius the compiler picks. A producer that means a radius sends one. (Said here because a compiler had to decide it and did: `compile-to-vespa.md` § 4.)
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

- `observer` MUST be 64 lowercase hex characters. **An `npub` is not an observer**: it is treated as naming no observer at all. Measured on `wss://search.brainstorm.world` on 2026-11-04, an unsigned socket sending `observer:<npub>` is refused with `auth-required` and the same message as a read naming no observer — "this relay answers through a web of trust and has no house observer to lend you" — while `include:spam` on the same socket is served. So the failure is a refusal, not a quiet fallback. On a socket already signed in under NIP-42 the identity could supply the lens and the token be ignored, which would be a quiet wrong answer; that case was not tested. Producers convert; consumers reject anything that does not match, under either behaviour.
- `scope` says whose curation counts inside that observer's web of trust:

| `mode` | Means | `group` |
|---|---|---|
| `default` | whatever the deployment takes "my people" to mean | **absent** |
| `named-group` | a group the asker named | required |
| `inferred-group` | a group the producer inferred from context, not from the asker's words | required |

- `group` is a canonical `naddr` or `nevent` for a DList, or 64 lowercase hex for a single pubkey. It MUST be absent for `default` and present otherwise.
- **What `default` means is not settled, and this spec does not settle it.** It is carried as a mode precisely so that the answer can land in one place later without changing this schema. A consumer MUST NOT assume `default` means the observer's follows.
- `inferred-group` is distinguished from `named-group` so a front end can show an inferred scope differently from one the asker asked for. An asker should be able to see, and drop, a narrowing they did not request.

### 2.6 `residual_words`

Words that no field claimed. They belong **inside** the set the other fields select, never as a query of their own. In "best brunch in chicago", `brunch` becomes a filter and `chicago` becomes a place; `best` is residual, because nothing in the data is called best.

Residual words are not failure. A reading that typed every word is not better than one that typed the words that carry structure.

**A consumer matches them only if it can match them optionally** — scoring the set it already selected, not requiring a word of it, which is what an embedding or a scoring-only term does. **A consumer that cannot MUST NOT put them on the wire as terms**, and MUST carry them back as unmatched so the asker can see they did not constrain the answer.

v0 said simply that a compiler matches them "as text, or by embedding", and that promised more than a conforming consumer can deliver. Measured on this estate's own index, where the only text match is conjunctive and mandatory, a required residual word fails in **two** directions: against a narrowly selected set it *empties* the answer — the spec's own § 6.1, compiled literally, returns nothing — and against a wide one it *substitutes* a worse answer, because the match is typo- and prefix-tolerant, so `best` reaches a book called *The beast of Chicago*. Both are worse than not matching at all, and neither is visible to the asker. Ranking through the observer's web of trust is what "best" actually asks for, and that is the engine's job rather than a filter's.

**Residual words carry no polarity.** The search box accepts `-word`, and this schema has nowhere to put an exclusion (§ 8.3). A producer that read a negation therefore **MUST NOT** represent it as a residual word: `-chain` MUST NOT arrive as `chain`. It drops the term and lowers `confidence` instead. The reason is that no consumer can tell a dropped exclusion from an ordinary unclaimed word, so carrying it does not merely lose the sense, it **inverts** it — the consumer widens where the asker narrowed. Dropping it visibly is the lesser harm; carrying polarity properly is a v1 item (§ 8.3).

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
- **What `default` scope means.** See § 2.5. Settling it later is deliberately *not* a version change — § 9.2 says why.

No longer in this list: **how versions change.** It was owed, and it is now § 9.

## 5. Interpretation requirements

A conforming consumer:

1. MUST reject a set whose `version` is malformed or whose **major** it does not know, and MUST serve a known major with a higher **minor** on the fields it knows (§ 9.3).
2. MUST reject an `observer` that is not 64 lowercase hex, rather than falling back to no observer.
3. MUST treat an absent field as unconstrained, and MUST reject an explicit `null`.
4. MUST NOT reorder `interpretations`.
5. MUST NOT derive constraints from `query`, `place.name`, `time.label` or `place.near_observer`.
6. MUST treat several `targets` as a union and several `filters` as a conjunction, applying every filter to every target (§ 2.2).
7. SHOULD serve the first interpretation and MAY offer the rest.
8. MUST NOT put `residual_words` on the wire as required terms, and MUST report them unmatched when it cannot match them optionally (§ 2.6).
9. MUST report what it could not honour, rather than answering as though it had: a target dropped or narrowed by § 2.2, residual words left unmatched by § 2.6, and fields ignored under § 9.3. **An answer narrowed or widened in silence is indistinguishable from a correct one**, which is the fault this spec guards against throughout.

## 6. Worked examples

One per first-journey query class (see *Sources*). Both validate against [interpretation.schema.json](./interpretation.schema.json).

The identifiers below are **illustrative but well formed**: every `naddr` decodes, and the pubkeys are valid 64-hex. They name no real list and no real person. The two list coordinates are `39998:3f7c4e1d…5e12:food-and-drink-places` and `39998:3f7c4e1d…5e12:event-index`, each encoded as a canonical `naddr` — the `d` tag, author and kind TLVs only, no relay hints, so the same list always encodes to the same string.

### 6.1 Recommendation over places

> **"best brunch in chicago"**, asked by a signed-in person, with no scope named.

The place constrains a geography, the item property constrains the kind of place, and the recommendation word is residual. Two readings, because the underlying list carries this distinction in two different properties: a curated `cuisine` value, and a free `t` tag.

```json
{
  "version": "0.1",
  "query": "best brunch in chicago",
  "interpretations": [
    {
      "targets": [
        { "type": "dlist", "id": "naddr1qq2kvmm0vskkzmny94j8y6twdvkhqmrpvdjhxq3q8a7yu8v69dvxvrc7f47r4xews52vd58h8wz6jg0y6lq0vw5ttcfqxpqqqzwruxt3dn9" }
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

- **This example used to carry a second target**, the external `web` category, on the reasoning that a place's own page answers the same question when the curated list is thin. § 2.2 now forbids it from working: `cuisine` is replicated into every target, an `external` target cannot carry it, so that target returns nothing and the widening never happens. Widening a thin list this way needs per-target filters, which § 8's open question 4 holds as a v1 item — this is its motivating case, and the target is dropped until then.
- `best` stays residual. Nothing in the data is called best; ranking by the observer's web of trust is what "best" asks for, and that is the engine's job, not a filter's.
- 25 km matches how the places data was counted when the journey was chosen (see *Sources*).

### 6.2 Recommendation over events

> **"what's on this weekend in chicago"**, asked on Friday 2026-11-06 in `America/Chicago`.

Place joins time. Two targets of different types in one reading, because upcoming events in this estate live both as native calendar events and as items of an imported list.

```json
{
  "version": "0.1",
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

Questions 2, 3 and 5 are **v1 items**: each needs a field this schema does not have, so each is a major change under
§ 9.2 and none can land in a `0.x` minor.

1. **Calibrating confidence.** § 2.7 says confidences are not comparable across producers. Measuring one producer against another therefore needs scored outcomes on a fixed question set. Whether this spec should also require a stated calibration method is open. A warning from the first compiler, which bears on whether the measurement is possible at all: two readings that differ only in `filters[].property` compile identically on an index with no property-scoped match, and an index that cannot tell two readings apart cannot score two interpreters apart either.
2. **Filter operators.** *v1 item.* v0.1 is equality only (§ 2.2). Ranges are the first likely addition — a price ceiling, a rating floor — and are the first real test of § 9.2. Negation (question 3) should be designed with them rather than piecemeal.
3. **Negation.** *v1 item.* The search box accepts `-word` and this schema has nowhere to put it. As of v0.1 such a word MUST NOT be smuggled into `residual_words`, because carrying it there inverts its sense rather than merely losing it (§ 2.6); a producer drops it and lowers `confidence`. The fix is structure — either polarity on `residual_words` or negation in `filters`.
4. **Whether `targets` can mix a union with a per-target filter.** **Resolved in principle, and a v1 item to carry out.** Writing the first compiler answered it: a union of targets compiles to one filter object per target *regardless*, because the types constrain different fields and cannot share one, so **per-target filters cost the wire format nothing**. v0's convention — producers keep mixed-type unions unfiltered — was therefore a workaround for a limitation the compile target does not have. What remains is the schema change, and it waits on purpose: moving the filter onto the target is a major change under § 9.2, and the second compiler (onto portable NIP-01 and NIP-50, deliberately weaker) has not been written yet. Designing the field against one index is how a schema acquires a field that suits one consumer. Until then § 2.2's consumer obligation holds.
5. **Several places, several times.** *v1 item.* "Chicago or Milwaukee" and "Saturday or next Saturday" have no form here, and become separate interpretations. Whether that is the right answer or a missing array is open.
6. **What a producer sends when the asker has no key.** `pov.observer` is required and MUST be 64 lowercase hex (§ 2.5), and that strictness is deliberate. But anonymous search is a first-class path in this estate, and a relay need not have a house observer to lend: measured on `wss://search.brainstorm.world` on 2026-11-04, an unsigned read naming no observer is refused `auth-required` with exactly that explanation, as is one naming an `npub`. So an interpretation for an asker with no key — or with a key whose scores have not been computed — has no observer to write down, and this spec does not say what to do. The candidates are a deployment-chosen stand-in key, refusing to produce an interpretation at all, and a scope or `pov` form meaning "no lens yet". Whether the answer needs a field it does not have is what decides whether this is a v1 item.

## 9. Versioning and breaking changes

This section is the rule § 4 used to say was owed. It is placed last rather than beside § 1 so that the section
numbers other documents already cite stay put.

### 9.1 The shape of the version

`version` is `MAJOR.MINOR` — two non-negative integers with no leading zeros, matching
`^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$` — carried as a **string**. The string matters: as a JSON number `0.10` and `0.1`
are the same value, so a tenth minor revision would collide with the first.

This document is `"0.1"`. The bare `"0"` of the first draft is **retired, not deprecated**: no producer ever emitted
it, so there is nothing to migrate and nobody to migrate for. A consumer rejects it like any other unknown version.

### 9.2 What counts as breaking

The line is drawn from the **consumer's** side, because the consumer is the one who has to decide whether to reject a
document it does not fully recognise, and it must be able to decide from the version alone.

> **MAJOR** bumps when a consumer that correctly implements the previous version could return a **wrong answer** from
> a document of the new version. **MINOR** bumps when such a consumer still returns a **correct answer**, possibly a
> less precise one.

In one line: **a minor change may cost precision; it may never cost correctness.** That is the principle § 7 already
applies to the two compilers, turned on the schema itself.

Breaking, concretely:

| Change                                                     | Why it is breaking                                      |
| ---------------------------------------------------------- | ------------------------------------------------------- |
| Removing or renaming a field a consumer reads              | the constraint silently disappears                      |
| Narrowing a type, pattern or value set                     | documents that were valid stop being valid              |
| Changing what an existing field **means**                  | the worst kind: both sides keep working and disagree    |
| Changing an absence rule (§ 2's "absent means unconstrained") | an omission starts meaning something else            |
| **Adding a field a consumer MUST honour to be correct**    | an old consumer ignores it and constrains less than the asker asked |

**That last row is the one to remember: an addition is not automatically minor.** Whether it is depends entirely on
what an old consumer does by ignoring it. Per-target filters (§ 8.4) are the worked example — ignore the field and you
apply *no* filter where the asker asked for one, and a widened answer is wrong, not imprecise.

Not breaking: adding an optional field an old consumer can safely ignore, such as another display-only field under
`place.name`'s rule; adding a value to a set whose unknown-value fallback is already safe; loosening a constraint so
that previously invalid documents become valid in a way an old consumer ignores safely; and writing down consumer
behaviour that was previously unspecified, which constrains nobody who was already correct.

**Deprecate before removing.** A field removed in a major MUST first be marked deprecated in a minor of the preceding
major, so there is at least one published version in which both the old and the new consumer are correct.

**A meaning this spec explicitly declines to define is not pinned by this rule.** `pov.scope.mode: "default"` is
carried without a definition on purpose (§ 2.5), and a consumer is forbidden to assume it means the observer's
follows. Writing that definition down later is therefore **not** a version change, because no conforming consumer
could have relied on a different one. The carve-out is narrow: it applies only where this spec says in its own text
that a meaning is unsettled. Pinning a meaning the spec *did* define is the third row of the table above.

### 9.3 What a consumer does with a version it does not fully know

| The document says               | The consumer MUST                                                               |
| ------------------------------- | ------------------------------------------------------------------------------- |
| an unknown **major**            | **reject** the set                                                              |
| a known major, **higher** minor | **proceed** on the fields it knows, ignore the rest, and **report that it did**  |
| a known major, lower minor      | proceed — it knows strictly more than the document uses                         |
| a malformed `version`           | reject. A version that does not match § 9.1's grammar is not a version.         |

The second row is why this rule exists, and it is safe **only** because of the obligation attached to it. Ignoring a
field changes the answer, so a consumer that proceeds on an unknown minor reports it the same way § 5.9 requires for a
dropped target or an unmatched residual word. An unread field is one more way an answer can be broader or narrower
than the question, and the asker is owed the same disclosure.

**On validating:** the schema beside this document is strict (`additionalProperties: false`), and deliberately so —
that strictness is what catches an `npub` in the observer field. But it defines **one** version, so a `"0.2"` document
validated against the `"0.1"` schema fails on the unknown field, which is exactly the case the second row says to
accept. **A consumer validates against the schema of the version the document declares**, not against whichever schema
it happens to hold; one holding only an older schema proceeds by *reading the fields it knows* rather than by
validating. Said explicitly because the two rules are otherwise silently inconsistent, and an implementer would meet
it as a bug.

For the same reason each version's schema keeps an **immutable** URL. The schema's `$id` names its version, so a
consumer that resolves it gets the version it asked for rather than whatever the default branch holds today.

### 9.4 A version is amendable until it is adopted

> **A version is amendable in place — breaking changes included — until a producer or consumer outside this estate's
> own repositories ships against it. At that point it freezes, and every further change takes a new version under
> § 9.2.**

The trigger is observable rather than a judgement: the **"Adopted by"** line in this document's preamble. Naming an
adopter there freezes that version, so the freeze is a documented fact in the file the rule governs.

This is what made `0.1` possible. Two of its changes from `0` are breaking by § 9.2 — `place` now requires a
`geohash`, and the retired `"0"` itself — and in a frozen version each would have had to wait for a major bump. The
window is still open and it is **not** open indefinitely: the first outside producer closes it.

### 9.5 Who decides a bump

- **Editorial** (prose, examples, typos; no conformance change): a pull request and one reviewer.
- **Minor**: the spec's owner plus one reviewer, and a note saying what an old consumer loses in precision.
- **Major**: the decider, plus a stated position from each of the four producer surfaces — the query parser, the house
  agent, a personal agent and a partner — or an explicit note naming which surface was unrepresented and why.

Four producers and three consumers share this object, which is the whole reason it is typed. "It changes slowly" is
implemented by that cost, not by a waiting period.
