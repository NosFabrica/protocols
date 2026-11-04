// Checks specs/interpretation.schema.json, and that every worked example in
// specs/interpretation.md validates against it.
//
// The validator below covers only the JSON Schema keywords this schema uses.
// It is not a general implementation: the schema is kept to a small keyword set
// so that this repo needs no dependencies. If the schema grows past these
// keywords, reach for a real validator rather than extending this one.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SPECS = path.join(__dirname, '..', 'specs');
const schema = JSON.parse(fs.readFileSync(path.join(SPECS, 'interpretation.schema.json'), 'utf8'));
const specText = fs.readFileSync(path.join(SPECS, 'interpretation.md'), 'utf8');

const KNOWN = new Set([
  '$schema', '$id', '$ref', '$defs', 'title', 'description',
  'type', 'enum', 'pattern', 'minimum', 'maximum', 'minLength', 'minItems',
  'required', 'properties', 'additionalProperties', 'items',
  'allOf', 'anyOf', 'if', 'then', 'else', 'not',
]);

function resolve(ref, root) {
  assert.ok(ref.startsWith('#/'), `only local refs are supported: ${ref}`);
  return ref.slice(2).split('/').reduce((node, key) => node[key], root);
}

// Returns an array of error strings; empty means valid.
function validate(value, sch, root = sch, where = '') {
  const errs = [];
  if (sch.$ref) return validate(value, resolve(sch.$ref, root), root, where);

  for (const key of Object.keys(sch)) {
    if (!KNOWN.has(key)) errs.push(`${where}: schema uses unsupported keyword "${key}"`);
  }

  const type = sch.type;
  const isInt = Number.isInteger(value);
  const actual = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  if (type) {
    const ok = type === 'integer' ? isInt : type === 'number' ? actual === 'number' : actual === type;
    if (!ok) {
      errs.push(`${where}: expected ${type}, got ${actual}`);
      return errs; // further keywords would be meaningless
    }
  }

  if (sch.enum && !sch.enum.some((e) => e === value)) {
    errs.push(`${where}: ${JSON.stringify(value)} is not one of ${JSON.stringify(sch.enum)}`);
  }
  if (sch.pattern && typeof value === 'string' && !new RegExp(sch.pattern).test(value)) {
    errs.push(`${where}: ${JSON.stringify(value)} does not match ${sch.pattern}`);
  }
  if (sch.minLength !== undefined && typeof value === 'string' && value.length < sch.minLength) {
    errs.push(`${where}: shorter than minLength ${sch.minLength}`);
  }
  if (sch.minimum !== undefined && typeof value === 'number' && value < sch.minimum) {
    errs.push(`${where}: ${value} is below minimum ${sch.minimum}`);
  }
  if (sch.maximum !== undefined && typeof value === 'number' && value > sch.maximum) {
    errs.push(`${where}: ${value} is above maximum ${sch.maximum}`);
  }
  if (sch.minItems !== undefined && Array.isArray(value) && value.length < sch.minItems) {
    errs.push(`${where}: fewer than minItems ${sch.minItems}`);
  }

  const isObject = actual === 'object';
  if (sch.required && isObject) {
    for (const key of sch.required) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) errs.push(`${where}: missing required "${key}"`);
    }
  }
  if (sch.properties && isObject) {
    for (const [key, sub] of Object.entries(sch.properties)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        errs.push(...validate(value[key], sub, root, `${where}.${key}`));
      }
    }
  }
  if (sch.additionalProperties === false && isObject) {
    const allowed = new Set(Object.keys(sch.properties || {}));
    for (const key of Object.keys(value)) {
      if (!allowed.has(key)) errs.push(`${where}: unexpected property "${key}"`);
    }
  }
  if (sch.items && Array.isArray(value)) {
    value.forEach((item, i) => errs.push(...validate(item, sch.items, root, `${where}[${i}]`)));
  }

  for (const sub of sch.allOf || []) errs.push(...validate(value, sub, root, where));
  if (sch.anyOf && !sch.anyOf.some((sub) => validate(value, sub, root, where).length === 0)) {
    errs.push(`${where}: matched none of the anyOf branches`);
  }
  if (sch.not && validate(value, sch.not, root, where).length === 0) {
    errs.push(`${where}: matched a "not" schema it must not match`);
  }
  if (sch.if) {
    const branch = validate(value, sch.if, root, where).length === 0 ? sch.then : sch.else;
    if (branch) errs.push(...validate(value, branch, root, where));
  }
  return errs;
}

function jsonBlocks(markdown) {
  const out = [];
  const re = /```json\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(markdown)) !== null) out.push(m[1]);
  return out;
}

const blocks = jsonBlocks(specText);

test('the spec holds JSON examples', () => {
  assert.ok(blocks.length >= 6, `expected several json blocks, found ${blocks.length}`);
});

test('every JSON block either parses or is an explicit elision', () => {
  for (const [i, raw] of blocks.entries()) {
    if (raw.includes('/*')) continue; // a deliberate "…" in prose
    assert.doesNotThrow(() => JSON.parse(raw), `block ${i} is neither valid JSON nor an elision`);
  }
});

const sets = blocks
  .filter((raw) => !raw.includes('/*'))
  .map((raw) => JSON.parse(raw))
  .filter((doc) => doc && typeof doc === 'object' && 'version' in doc);

test('the spec holds one worked example per first-journey query class', () => {
  assert.strictEqual(sets.length, 2, `expected 2 worked interpretation sets, found ${sets.length}`);
});

test('every worked example validates against the schema', () => {
  for (const [i, doc] of sets.entries()) {
    assert.deepStrictEqual(validate(doc, schema), [], `worked example ${i} failed validation`);
  }
});

test('worked examples are ordered by non-increasing confidence', () => {
  for (const doc of sets) {
    const cs = doc.interpretations.map((it) => it.confidence);
    for (let i = 1; i < cs.length; i += 1) {
      assert.ok(cs[i] <= cs[i - 1], `confidence rose from ${cs[i - 1]} to ${cs[i]}`);
    }
  }
});

test('every worked example resolves time to absolute seconds', () => {
  for (const doc of sets) {
    for (const it of doc.interpretations) {
      if (!it.time) continue;
      for (const bound of ['start_since', 'start_until']) {
        if (bound in it.time) assert.ok(Number.isInteger(it.time[bound]), `${bound} must be integer seconds`);
      }
      if ('start_since' in it.time && 'start_until' in it.time) {
        assert.ok(it.time.start_until >= it.time.start_since, 'start_until precedes start_since');
      }
    }
  }
});

// The normative rules of §§ 1-2 that the schema is meant to enforce.
const BASE = Object.freeze({
  version: '0.1',
  interpretations: [
    {
      targets: [{ type: 'profile' }],
      filters: [],
      pov: { observer: 'a'.repeat(64), scope: { mode: 'default' } },
      residual_words: [],
      confidence: 0.5,
    },
  ],
});
const clone = () => JSON.parse(JSON.stringify(BASE));
const withFirst = (patch) => {
  const doc = clone();
  Object.assign(doc.interpretations[0], patch);
  return doc;
};

test('the baseline fixture is valid', () => {
  assert.deepStrictEqual(validate(clone(), schema), []);
});

// Spec section 9.3: a consumer validates against the schema of the version the
// document declares, so each version needs an immutable URL. An $id on a moving
// default branch would serve a later version to a consumer asking for this one.
test('the schema defines exactly one version, and its $id names it', () => {
  assert.deepStrictEqual(schema.properties.version.enum, [BASE.version]);
  assert.ok(
    schema.$id.includes(BASE.version),
    `$id must carry the version it defines; got ${schema.$id}`,
  );
  assert.ok(
    !/\/(main|master|HEAD)\//.test(schema.$id),
    `$id must not resolve through a moving ref; got ${schema.$id}`,
  );
});

test('the version grammar accepts MAJOR.MINOR and nothing else', () => {
  const re = new RegExp(schema.properties.version.pattern);
  for (const good of ['0.1', '0.0', '1.0', '2.13', '10.0']) {
    assert.ok(re.test(good), `${good} should match the version grammar`);
  }
  for (const bad of ['0', '1', '0.1.2', '0.01', 'v0.1', '', '0.', '.1', '-1.0']) {
    assert.ok(!re.test(bad), `${bad} should not match the version grammar`);
  }
});

// The schema defines ONE version; the rule in spec section 9.3 governs the set.
// So the schema rejecting "0.2" is not the same statement as a consumer rejecting
// it: under 9.3 a consumer serves a higher minor of a known major on the fields it
// knows. These cases assert the schema's half only.
const rejected = {
  'the retired unversioned string': (() => { const d = clone(); d.version = '0'; return d; })(),
  'a higher minor than this schema defines': (() => { const d = clone(); d.version = '0.2'; return d; })(),
  'a higher major': (() => { const d = clone(); d.version = '1.0'; return d; })(),
  'a version with three components': (() => { const d = clone(); d.version = '0.1.2'; return d; })(),
  'a version with a leading zero': (() => { const d = clone(); d.version = '0.01'; return d; })(),
  'a v-prefixed version': (() => { const d = clone(); d.version = 'v0.1'; return d; })(),
  'a numeric version': (() => { const d = clone(); d.version = 0.1; return d; })(),
  'an empty interpretation set': (() => { const d = clone(); d.interpretations = []; return d; })(),
  'an npub as observer': withFirst({ pov: { observer: 'npub1xxx', scope: { mode: 'default' } } }),
  'an uppercase hex observer': withFirst({ pov: { observer: 'A'.repeat(64), scope: { mode: 'default' } } }),
  'a short hex observer': withFirst({ pov: { observer: 'a'.repeat(63), scope: { mode: 'default' } } }),
  'an explicit null place': withFirst({ place: null }),
  'an explicit null time': withFirst({ time: null }),
  'a profile target carrying an id': withFirst({ targets: [{ type: 'profile', id: '0' }] }),
  'a dlist target with no id': withFirst({ targets: [{ type: 'dlist' }] }),
  'an unknown target type': withFirst({ targets: [{ type: 'npc', id: '1' }] }),
  'no targets at all': withFirst({ targets: [] }),
  'a default scope carrying a group': withFirst({
    pov: { observer: 'a'.repeat(64), scope: { mode: 'default', group: 'naddr1x' } },
  }),
  'a named group with no group': withFirst({
    pov: { observer: 'a'.repeat(64), scope: { mode: 'named-group' } },
  }),
  'a place with only a name': withFirst({ place: { name: 'Chicago' } }),
  'a place with an invalid geohash': withFirst({ place: { geohash: 'ail' } }),
  // v0 accepted this. It is schema-valid nonsense: the asker's location is not in
  // the object and nothing downstream supplies it, so no consumer can serve it and
  // the only thing it could do is silently stop constraining. Spec section 2.3.
  'near me with no geohash': withFirst({ place: { near_observer: true } }),
  'a place with a name and a flag but no centre': withFirst({ place: { name: 'here', near_observer: true } }),
  'a time with neither bound': withFirst({ time: { label: 'soon' } }),
  'a confidence above one': withFirst({ confidence: 1.5 }),
  'a confidence below zero': withFirst({ confidence: -0.1 }),
  'a filter with no value': withFirst({ filters: [{ property: 'cuisine' }] }),
  'an unexpected property': withFirst({ sort: 'recent' }),
};

for (const [name, doc] of Object.entries(rejected)) {
  test(`the schema rejects ${name}`, () => {
    assert.notDeepStrictEqual(validate(doc, schema), [], `${name} should not validate`);
  });
}

const accepted = {
  // "near me" is now the centre plus a display flag, never the flag alone.
  'near me with a resolved centre': withFirst({ place: { geohash: 'dp3wjzt', near_observer: true } }),
  'an open-ended time': withFirst({ time: { start_since: 1794031200 } }),
  'a named group': withFirst({
    pov: { observer: 'a'.repeat(64), scope: { mode: 'named-group', group: 'b'.repeat(64) } },
  }),
  'an external target whose type holds a colon': withFirst({
    targets: [{ type: 'external', id: 'podcast:guid' }],
  }),
  'a set with no query string': (() => { const d = clone(); delete d.query; return d; })(),
};

for (const [name, doc] of Object.entries(accepted)) {
  test(`the schema accepts ${name}`, () => {
    assert.deepStrictEqual(validate(doc, schema), [], `${name} should validate`);
  });
}
