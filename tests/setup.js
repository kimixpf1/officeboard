/**
 * Test environment setup
 * Mocks browser APIs (IndexedDB, localStorage, fetch) for unit testing.
 *
 * IMPORTANT: The project's JS files rely on browser-style global variable sharing
 * (e.g., SafeStorage defined in utils.js, referenced directly in sync.js).
 * Vitest ESM wraps each file in a module, which breaks this pattern.
 * We therefore load source scripts via new Function() in sloppy mode,
 * where bare variable references resolve through the global scope chain.
 */

import 'fake-indexeddb/auto'
import { vi, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const g = globalThis

// ---------------------------------------------------------------------------
// Browser API mocks (must exist before source scripts run)
// ---------------------------------------------------------------------------

// --- localStorage ---
// Always use our own mock — do NOT rely on happy-dom's localStorage.
// happy-dom's Storage can be corrupted when source scripts run in sloppy mode.
const _lsStore = {}
g.localStorage = {
  _store: _lsStore,
  getItem(key) { return _lsStore[key] ?? null },
  setItem(key, val) { _lsStore[key] = String(val) },
  removeItem(key) { delete _lsStore[key] },
  clear() { for (const k of Object.keys(_lsStore)) delete _lsStore[k] },
  get length() { return Object.keys(_lsStore).length },
  key(n) { return Object.keys(_lsStore)[n] || null },
}

// --- navigator ---
if (!g.navigator) g.navigator = {}
Object.defineProperty(g.navigator, 'onLine', {
  value: true, writable: true, configurable: true,
})
if (!g.navigator.userAgent) {
  Object.defineProperty(g.navigator, 'userAgent', {
    value: 'vitest-test-runner', writable: true, configurable: true,
  })
}

// --- fetch ---
g.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
)

// --- document.dispatchEvent ---
if (!g.document) g.document = {}
if (!g.document.dispatchEvent) {
  g.document.dispatchEvent = vi.fn()
}

// --- console noise reduction ---
const _warn = console.warn
const _error = console.error
console.warn = () => {}
console.error = () => {}

// --- XMLHttpRequest stub (not used, but some libs may check) ---
if (!g.XMLHttpRequest) {
  g.XMLHttpRequest = vi.fn()
}

// ---------------------------------------------------------------------------
// Shared globals (must exist BEFORE evaluating source scripts)
// These are referenced as bare names (not window.X) by the source code.
// ---------------------------------------------------------------------------

// SafeStorage and safeJsonParse are defined in utils.js with `const`,
// but new Function() makes const function-local. We pre-define them
// globally so that subsequent scripts (sync.js) can find them.
g.SafeStorage = {
  get(key) {
    try { return g.localStorage.getItem(key) } catch (e) { return null }
  },
  set(key, val) {
    try { g.localStorage.setItem(key, val); return true } catch (e) { return false }
  },
  remove(key) {
    try { g.localStorage.removeItem(key) } catch (e) {}
  },
}

g.safeJsonParse = function (str, defaultValue = null) {
  if (!str || typeof str !== 'string') return defaultValue
  try { return JSON.parse(str) } catch { return defaultValue }
}

// --- window.supabase mock (needed BEFORE loading sync.js) ---
g.window = g
g.window.supabase = {
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(() => Promise.resolve()),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(() => {
      const chain = {
        select: vi.fn(function () { return this }),
        eq: vi.fn(function () { return this }),
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      }
      return chain
    }),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    })),
    upsert: vi.fn(() => ({
      select: vi.fn(function () {
        return { single: vi.fn(() => Promise.resolve({ data: { updated_at: new Date().toISOString() }, error: null })) }
      }),
    })),
    channel: vi.fn(() => {
      const ch = {
        on: vi.fn(() => ch),
        subscribe: vi.fn(async (cb) => { if (typeof cb === 'function') cb('SUBSCRIBED') }),
        unsubscribe: vi.fn(),
      }
      return ch
    }),
  })),
}

// --- app / ocrManager mocks (needed by sync.js) ---
g.window.app = { updateApiKeyStatus: vi.fn() }
g.window.ocrManager = { loadApiKeysFromDB: vi.fn(() => Promise.resolve()) }

// ---------------------------------------------------------------------------
// Load source scripts via new Function() (sloppy mode)
// Sloppy mode resolves bare variable names through the global scope chain,
// so pre-defined globals (SafeStorage, safeJsonParse, indexedDB, etc.) work.
// ---------------------------------------------------------------------------

function loadScript(scriptPath) {
  const code = readFileSync(resolve(root, scriptPath), 'utf-8')
  // new Function() body runs in sloppy mode (unless source starts with 'use strict').
  // Bare variable reads that aren't in local/function scope resolve to globalThis.
  const fn = new Function(code)
  fn()
}

// 1. utils.js — defines SafeStorage, safeJsonParse, fetchWithRetry, etc.
loadScript('js/utils.js')

// 2. db.js — defines Database, creates window.db
loadScript('js/db.js')
// db.js uses `const db = new Database()` — db is function-local in sloppy mode,
// but window.db is set. Expose `db` globally so sync.js can find it.
g.db = g.window.db

// 3. sync.js — defines SyncManager, creates window.syncManager
loadScript('js/sync.js')

// ---------------------------------------------------------------------------
// Post-load repairs: source scripts (sloppy mode) may overwrite globals.
// Restore localStorage, SafeStorage, and safeJsonParse in case they were
// shadowed by bare assignments in source code.
// ---------------------------------------------------------------------------

if (!g.localStorage || typeof g.localStorage.getItem !== 'function') {
  g.localStorage = {
    _store: _lsStore,
    getItem(key) { return _lsStore[key] ?? null },
    setItem(key, val) { _lsStore[key] = String(val) },
    removeItem(key) { delete _lsStore[key] },
  }
}

g.SafeStorage = {
  get(key) {
    try { return g.localStorage.getItem(key) } catch (e) { return null }
  },
  set(key, val) {
    try { g.localStorage.setItem(key, val); return true } catch (e) { return false }
  },
  remove(key) {
    try { g.localStorage.removeItem(key) } catch (e) {}
  },
}

g.safeJsonParse = function (str, defaultValue = null) {
  if (!str || typeof str !== 'string') return defaultValue
  try { return JSON.parse(str) } catch { return defaultValue }
}

// ---------------------------------------------------------------------------
// Global test isolation helpers
// ---------------------------------------------------------------------------

g.__resetIndexedDB = async function () {
  // Close current db instance if open
  if (g.window.db && g.window.db.db) {
    try { g.window.db.db.close() } catch (e) { /* ignore */ }
  }
  // Also close the syncManager's db reference
  if (g.window.syncManager && g.window.syncManager.db && g.window.syncManager.db.db) {
    try { g.window.syncManager.db.db.close() } catch (e) { /* ignore */ }
  }
  // Delete the database to ensure clean state
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase('OfficeDashboardDB')
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
  // Clear localStorage
  g.localStorage.clear()
}

g.__clearLocalStorage = function () {
  g.localStorage.clear()
}

// Restore console for tests that want to spy
console.warn = _warn
console.error = _error
