// Contract tests for dsh-cyberegg.
//
// The browser half is a single script handed to the host's module loader, so it
// cannot be imported from a test. These tests therefore read the source and
// assert the invariants that have actually broken before — the copies of the
// locale strings drifting apart, a translated key going missing, a routed read
// losing its deadline, and the check-in verdict sliding back to a guessed sleep.
//
// Run: node --test test/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const CLIENT = fs.readFileSync(path.join(ROOT, 'client.js'), 'utf8')
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const ZH_JSON = JSON.parse(fs.readFileSync(path.join(ROOT, 'locale', 'zh.json'), 'utf8'))
const EN_JSON = JSON.parse(fs.readFileSync(path.join(ROOT, 'locale', 'en.json'), 'utf8'))

/** The `{...}` literal that follows a marker, matched by brace balance. */
function blockAfter(source, marker) {
  const at = source.indexOf(marker)
  assert.ok(at >= 0, `marker not found: ${marker}`)
  const open = source.indexOf('{', at)
  assert.ok(open >= 0, `no object literal after: ${marker}`)
  let depth = 0
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i]
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) return source.slice(open, i + 1)
    }
  }
  assert.fail(`unbalanced object literal after: ${marker}`)
}

/** Top-level keys of an inline copy table: `      key: '...'`. */
function inlineKeys(block) {
  const keys = new Set()
  for (const line of block.split('\n')) {
    const hit = /^ {6}([A-Za-z_][A-Za-z0-9_]*):/.exec(line)
    if (hit) keys.add(hit[1])
  }
  return keys
}

const ZH_INLINE = inlineKeys(blockAfter(CLIENT, 'const ZH = {'))
const EN_INLINE = inlineKeys(blockAfter(CLIENT, 'const EN = {'))

test('inline ZH copy matches locale/zh.json', () => {
  assert.deepEqual([...ZH_INLINE].sort(), Object.keys(ZH_JSON).sort())
})

test('inline EN copy matches locale/en.json', () => {
  assert.deepEqual([...EN_INLINE].sort(), Object.keys(EN_JSON).sort())
})

test('locale files carry the same keys', () => {
  assert.deepEqual(Object.keys(ZH_JSON).sort(), Object.keys(EN_JSON).sort())
})

test("every t('key') resolves in the inline copy", () => {
  const used = new Set()
  for (const hit of CLIENT.matchAll(/\bt\('([A-Za-z_][A-Za-z0-9_]*)'\)/g)) used.add(hit[1])
  const missing = [...used].filter((key) => !ZH_INLINE.has(key))
  assert.deepEqual(missing, [], `untranslated keys: ${missing.join(', ')}`)
})

test('every routed read carries a deadline', () => {
  // The only bare fetch allowed is the channel-pack RPC, which owns its own
  // AbortController.
  const bare = [...CLIENT.matchAll(/await fetch\(/g)]
  assert.equal(bare.length, 2, 'only packRpc and fetchWithDeadline itself may call fetch directly')
  assert.match(CLIENT, /signal: AbortSignal\.timeout\(HTTP_TIMEOUT_MS\)/)
  assert.match(CLIENT, /const HTTP_TIMEOUT_MS = \d+/)
})

test('check-in verdict polls the balance instead of guessing a sleep', () => {
  assert.doesNotMatch(CLIENT, /setTimeout\(resolve, 1800\)/, 'the fixed 1.8 s sleep must not come back')
  assert.match(CLIENT, /const CLAIM_SETTLE_TOTAL_MS = \d+/)
  assert.match(CLIENT, /const CLAIM_SETTLE_STEP_MS = \d+/)
  // A closed window is reported as a delay, not as a failure.
  assert.match(CLIENT, /'delayed:'/, 'delayed settlement notice is required')
})

test('package.json declares the DSH range the market index reads', () => {
  assert.ok(PKG.engines && typeof PKG.engines.dsh === 'string', 'engines.dsh is required')
  assert.match(PKG.engines.dsh, /^[><=^~*\d]/, 'engines.dsh must look like a semver range')
})

test('every platform dependency is registered with an install line', () => {
  const needs = new Set()
  for (const hit of CLIENT.matchAll(/needs: '([A-Za-z0-9_@/-]+)'/g)) needs.add(hit[1])
  const deps = blockAfter(CLIENT, 'const DEPENDENCIES = {')
  for (const name of needs) {
    assert.ok(deps.includes(`'${name}':`), `dependency table missing ${name}`)
  }
  for (const hit of deps.matchAll(/install: '([^']+)'/g)) {
    assert.match(hit[1], /^dsh plugin --profile /, `install line must be runnable: ${hit[1]}`)
  }
})

test('nobody reintroduces a per-platform dependency banner', () => {
  // One consolidated card per missing package; the comment says why.
  assert.equal((CLIENT.match(/function MissingDeps\(/g) || []).length, 1)
})