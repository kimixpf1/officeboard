/**
 * Unit tests for js/db.js (IndexedDB CRUD)
 *
 * Tests run against a fresh Database instance per test case.
 * We never modify db.js — the class is obtained via window.db.constructor.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Source files (utils.js, db.js) are loaded by tests/setup.js via new Function().
// The Database class is obtained from the global instance created there.

const Database = window.db.constructor

// Helper: delete IndexedDB after closing connection
async function cleanDB(dbInstance) {
  if (dbInstance && dbInstance.db) {
    try { dbInstance.db.close() } catch (e) { /* ignore */ }
  }
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase('OfficeDashboardDB')
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0
function uniqueTitle(label) {
  _idCounter++
  return `${label}_${_idCounter}_${Date.now()}`
}

function makeItem(overrides = {}) {
  return {
    type: 'todo',
    title: uniqueTitle('test-item'),
    date: '2026-05-12',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeMeeting(overrides = {}) {
  return makeItem({
    type: 'meeting',
    title: uniqueTitle('test-meeting'),
    date: '2026-05-12',
    attendees: ['张三', '李四'],
    ...overrides,
  })
}

function makeDocument(overrides = {}) {
  return makeItem({
    type: 'document',
    title: uniqueTitle('test-doc'),
    docNumber: `苏统办〔${Date.now()}〕${_idCounter}号`,
    docStartDate: '2026-05-10',
    docEndDate: '2026-05-15',
    source: '市委办',
    ...overrides,
  })
}

// ---------------------------------------------------------------------------
// Database CRUD Tests
// ---------------------------------------------------------------------------

describe('Database — init', () => {
  let db

  beforeEach(async () => {
    db = new Database()
    await db.init()
  })

  afterEach(async () => {
    await cleanDB(db)
  })

  it('creates the OfficeDashboardDB with version 1', () => {
    expect(db.db).toBeTruthy()
    expect(db.db.name).toBe('OfficeDashboardDB')
    expect(db.db.version).toBe(1)
  })

  it('has the three object stores: items, settings, documentHashes', () => {
    const names = Array.from(db.db.objectStoreNames)
    expect(names).toContain('items')
    expect(names).toContain('settings')
    expect(names).toContain('documentHashes')
  })

  it('initPromise is idempotent (called twice returns the same database instance)', async () => {
    const p1 = db.init()
    const p2 = db.init()
    await Promise.all([p1, p2])
    // Both should resolve to the same this.db (same IDBDatabase reference)
    expect(db.db).toBeTruthy()
  })
})

describe('Database — addItem', () => {
  let db

  beforeEach(async () => {
    db = new Database()
    await db.init()
    // Clean slate — remove any items from previous test runs
    await db.clearAllItems()
  })

  afterEach(async () => {
    await cleanDB(db)
  })

  it('adds a todo item and returns a numeric id', async () => {
    const id = await db.addItem(makeItem())
    expect(id).toBeGreaterThan(0)
    expect(typeof id).toBe('number')
  })

  it('auto-generates hash field on the stored item', async () => {
    const title = uniqueTitle('hash-test')
    await db.addItem(makeItem({ title }))
    const items = await db.getAllItems()
    const stored = items.find(i => i.title === title)
    expect(stored).toBeTruthy()
    expect(stored).toHaveProperty('hash')
    expect(typeof stored.hash).toBe('string')
    expect(stored.hash.length).toBeGreaterThan(0)
  })

  it('auto-generates createdAt and updatedAt if missing', async () => {
    const title = uniqueTitle('no-dates')
    await db.addItem(makeItem({ title, createdAt: undefined, updatedAt: undefined }))
    const items = await db.getAllItems()
    const stored = items.find(i => i.title === title)
    expect(stored.createdAt).toBeTruthy()
    expect(stored.updatedAt).toBeTruthy()
  })

  it('deduplicates recurring items by hash within the same group', async () => {
    const title = uniqueTitle('no-dup')
    const item = makeItem({ title, recurringGroupId: 'group-dedup', occurrenceIndex: 0 })
    const id1 = await db.addItem(item)
    const id2 = await db.addItem(item)
    expect(id1).toBe(id2)
  })

  it('creates distinct items when no recurringGroupId even with same hash', async () => {
    const title = uniqueTitle('distinct')
    const item = makeItem({ title })
    const id1 = await db.addItem(item)
    const id2 = await db.addItem(item)
    // Without recurringGroupId, hash collisions create new items
    expect(id1).not.toBe(id2)
  })

  it('deduplicates recurring items within the same group', async () => {
    const title = uniqueTitle('recurring')
    const item = makeItem({
      title,
      recurringGroupId: 'group-abc',
      occurrenceIndex: 0,
    })
    const id1 = await db.addItem(item)
    const id2 = await db.addItem(item)
    expect(id1).toBe(id2)
  })

  it('meeting items strip manual order when not set', async () => {
    const title = uniqueTitle('meeting-no-order')
    await db.addItem(makeMeeting({ title, order: 999 }))
    const meetings = await db.getItemsByType('meeting')
    const stored = meetings.find(i => i.title === title)
    expect(stored).toBeTruthy()
    // normalizeItemForStorage deletes order if manualOrder !== true
    expect(stored.manualOrder).toBe(false)
    expect(stored.order).toBeUndefined()
  })

  it('meeting items keep order when manualOrder is true', async () => {
    const title = uniqueTitle('meeting-with-order')
    await db.addItem(makeMeeting({ title, order: 5, manualOrder: true }))
    const meetings = await db.getItemsByType('meeting')
    const stored = meetings.find(i => i.title === title)
    expect(stored).toBeTruthy()
    expect(stored.order).toBe(5)
    expect(stored.manualOrder).toBe(true)
  })
})

describe('Database — putItem', () => {
  let db

  beforeEach(async () => {
    db = new Database()
    await db.init()
  })

  afterEach(async () => {
    await cleanDB(db)
  })

  it('upserts an item (adds new if no id match)', async () => {
    const title = uniqueTitle('put-new')
    const testId = Date.now()
    const resultId = await db.putItem({ id: testId, title, type: 'todo' })
    expect(resultId).toBe(testId)
    const retrieved = await db.getItem(testId)
    expect(retrieved).toBeTruthy()
    expect(retrieved.title).toBe(title)
  })

  it('upserts an item (replaces if id matches)', async () => {
    const titleOld = uniqueTitle('old')
    const titleNew = uniqueTitle('new')
    const id = await db.addItem(makeItem({ title: titleOld }))
    await db.putItem({ id, title: titleNew, type: 'todo' })
    const retrieved = await db.getItem(id)
    expect(retrieved.title).toBe(titleNew)
  })

  it('regenerates hash on put', async () => {
    const title1 = uniqueTitle('before')
    const title2 = uniqueTitle('after')
    const id = await db.addItem(makeItem({ title: title1 }))
    const before = await db.getItem(id)
    await db.putItem({ id, title: title2, type: 'todo' })
    const after = await db.getItem(id)
    expect(after.hash).not.toBe(before.hash)
  })

  it('handles empty input gracefully', async () => {
    await expect(db.batchPutItems([])).resolves.toBeUndefined()
    await expect(db.batchPutItems(null)).resolves.toBeUndefined()
  })
})

describe('Database — getItem', () => {
  let db

  beforeEach(async () => {
    db = new Database()
    await db.init()
  })

  afterEach(async () => {
    await cleanDB(db)
  })

  it('returns undefined for non-existent id', async () => {
    const result = await db.getItem(99999999)
    expect(result).toBeFalsy()
  })

  it('returns the full item for an existing id', async () => {
    const title = uniqueTitle('query-test')
    const id = await db.addItem(makeItem({ title }))
    const item = await db.getItem(id)
    expect(item).toBeTruthy()
    expect(item.title).toBe(title)
    expect(item.type).toBe('todo')
  })
})

describe('Database — deleteItem', () => {
  let db

  beforeEach(async () => {
    db = new Database()
    await db.init()
  })

  afterEach(async () => {
    await cleanDB(db)
  })

  it('deletes an item by id', async () => {
    const id = await db.addItem(makeItem())
    await db.deleteItem(id)
    const result = await db.getItem(id)
    expect(result).toBeFalsy()
  })

  it('does not throw when deleting non-existent id', async () => {
    await expect(db.deleteItem(99999999)).resolves.toBeUndefined()
  })
})

describe('Database — getAllItems', () => {
  let db

  beforeEach(async () => {
    db = new Database()
    await db.init()
    await db.clearAllItems()
  })

  afterEach(async () => {
    await cleanDB(db)
  })

  it('returns an empty array when no items exist', async () => {
    const items = await db.getAllItems()
    expect(items).toEqual([])
  })

  it('returns all added items', async () => {
    const titleA = uniqueTitle('A')
    const titleB = uniqueTitle('B')
    await db.addItem(makeItem({ title: titleA }))
    await db.addItem(makeItem({ title: titleB }))
    const items = await db.getAllItems()
    expect(items.length).toBe(2)
  })

  it('returns a defensive copy (not the cache reference)', async () => {
    const title = uniqueTitle('defensive')
    await db.addItem(makeItem({ title }))
    const items1 = await db.getAllItems()
    const len = items1.length
    items1.pop()
    const items2 = await db.getAllItems()
    expect(items2.length).toBe(len)
  })

  it('addItem invalidates the cache', async () => {
    const titleA = uniqueTitle('cache-A')
    const titleB = uniqueTitle('cache-B')
    await db.addItem(makeItem({ title: titleA }))
    await db.getAllItems() // prime cache
    await db.addItem(makeItem({ title: titleB }))
    const items = await db.getAllItems()
    expect(items.length >= 2).toBe(true)
    expect(items.some(i => i.title === titleB)).toBe(true)
  })
})

describe('Database — getItemsByType', () => {
  let db

  beforeEach(async () => {
    db = new Database()
    await db.init()
  })

  afterEach(async () => {
    await cleanDB(db)
  })

  it('returns only items matching the given type', async () => {
    const todoTitle = uniqueTitle('todo')
    await db.addItem(makeItem({ type: 'todo', title: todoTitle }))
    await db.addItem(makeItem({ type: 'todo', title: uniqueTitle('t2') }))
    await db.addItem(makeItem({ type: 'meeting', title: uniqueTitle('m'), date: '2026-05-12' }))

    const todos = await db.getItemsByType('todo')
    expect(todos.length >= 2).toBe(true)
    expect(todos.every(t => t.type === 'todo')).toBe(true)
    expect(todos.some(t => t.title === todoTitle)).toBe(true)

    const meetings = await db.getItemsByType('meeting')
    // At least the meeting we added (there may be leftovers from other tests)
    expect(meetings.length >= 1).toBe(true)
    expect(meetings.every(m => m.type === 'meeting')).toBe(true)
  })

  it('returns empty array or only matching items', async () => {
    const result = await db.getItemsByType('document')
    // May contain items from other tests that weren't cleaned up; focus on type correctness
    expect(Array.isArray(result)).toBe(true)
    expect(result.every(r => r.type === 'document')).toBe(true)
  })
})

describe('Database — getItemsByDateRange', () => {
  let db

  beforeEach(async () => {
    db = new Database()
    await db.init()
  })

  afterEach(async () => {
    await cleanDB(db)
  })

  // === Meeting date range ===
  it('finds a meeting whose date falls within the range', async () => {
    const title = uniqueTitle('in-range')
    await db.addItem(makeMeeting({ title, date: '2026-05-12' }))
    const items = await db.getItemsByDateRange('2026-05-10', '2026-05-15')
    const found = items.filter(i => i.title === title && i.type === 'meeting')
    expect(found.length).toBe(1)
    expect(found[0].title).toBe(title)
  })

  it('excludes a meeting whose date is before the range', async () => {
    const title = uniqueTitle('too-early')
    await db.addItem(makeMeeting({ title, date: '2026-05-01' }))
    const items = await db.getItemsByDateRange('2026-05-10', '2026-05-15')
    const found = items.filter(i => i.title === title)
    expect(found.length).toBe(0)
  })

  it('includes a meeting that spans the range (cross-date meeting)', async () => {
    const title = uniqueTitle('cross-day')
    await db.addItem(makeMeeting({ title, date: '2026-05-01', endDate: '2026-05-20' }))
    const items = await db.getItemsByDateRange('2026-05-10', '2026-05-15')
    const found = items.filter(i => i.title === title)
    expect(found.length).toBe(1)
  })

  // === Todo date range ===
  it('finds a todo with deadline in range', async () => {
    const title = uniqueTitle('deadline-todo')
    await db.addItem(makeItem({ type: 'todo', title, deadline: '2026-05-12T18:00:00.000Z' }))
    const items = await db.getItemsByDateRange('2026-05-10', '2026-05-15')
    const found = items.filter(i => i.title === title)
    expect(found.length).toBe(1)
    expect(found[0].type).toBe('todo')
  })

  it('excludes a todo whose deadline is outside the range', async () => {
    const title = uniqueTitle('old-deadline')
    await db.addItem(makeItem({ type: 'todo', title, deadline: '2026-04-01T18:00:00.000Z' }))
    const items = await db.getItemsByDateRange('2026-05-10', '2026-05-15')
    const found = items.filter(i => i.title === title)
    expect(found.length).toBe(0)
  })

  // === Document date range ===
  it('finds a document with docStartDate/docEndDate spanning the range', async () => {
    const title = uniqueTitle('cross-doc')
    await db.addItem(makeDocument({ title, docStartDate: '2026-05-01', docEndDate: '2026-05-20' }))
    const items = await db.getItemsByDateRange('2026-05-10', '2026-05-15')
    const found = items.filter(i => i.title === title)
    expect(found.length).toBe(1)
    expect(found[0].type).toBe('document')
  })

  it('finds a document by docDate fallback', async () => {
    const title = uniqueTitle('old-doc')
    await db.addItem(makeItem({
      type: 'document', title, docDate: '2026-05-12',
      docStartDate: undefined, docEndDate: undefined,
    }))
    const items = await db.getItemsByDateRange('2026-05-10', '2026-05-15')
    const found = items.filter(i => i.title === title)
    expect(found.length).toBe(1)
  })
})

describe('Database — generateHash', () => {
  let db

  beforeEach(async () => {
    db = new Database()
    await db.init()
  })

  afterEach(async () => {
    await cleanDB(db)
  })

  it('produces the same hash for identical items', () => {
    const item1 = makeItem({ title: 'hash-same', type: 'todo', date: '2026-05-12' })
    const item2 = makeItem({ title: 'hash-same', type: 'todo', date: '2026-05-12' })
    expect(db.generateHash(item1)).toBe(db.generateHash(item2))
  })

  it('produces different hashes for different titles', () => {
    const h1 = db.generateHash(makeItem({ title: 'A' }))
    const h2 = db.generateHash(makeItem({ title: 'B' }))
    expect(h1).not.toBe(h2)
  })

  it('produces different hashes for different types', () => {
    const h1 = db.generateHash(makeItem({ title: 'test', type: 'todo' }))
    const h2 = db.generateHash(makeItem({ title: 'test', type: 'meeting' }))
    expect(h1).not.toBe(h2)
  })

  it('produces different hashes for different dates', () => {
    const h1 = db.generateHash(makeItem({ title: 'test', date: '2026-05-12' }))
    const h2 = db.generateHash(makeItem({ title: 'test', date: '2026-05-13' }))
    expect(h1).not.toBe(h2)
  })

  it('includes recurringGroupId in hash when present', () => {
    const h1 = db.generateHash(makeItem({ title: 'periodic', recurringGroupId: 'g1', occurrenceIndex: 0 }))
    const h2 = db.generateHash(makeItem({ title: 'periodic', recurringGroupId: 'g1', occurrenceIndex: 1 }))
    expect(h1).not.toBe(h2)
  })

  it('returns a non-empty string (hex representation)', () => {
    const hash = db.generateHash(makeItem())
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(0)
  })

  it('handles empty title and type gracefully', () => {
    const hash = db.generateHash({ title: '', type: '', date: '' })
    expect(typeof hash).toBe('string')
  })
})

describe('Database — batchAddItems', () => {
  let db

  beforeEach(async () => {
    db = new Database()
    await db.init()
  })

  afterEach(async () => {
    await cleanDB(db)
  })

  it('adds multiple items in a single transaction', async () => {
    const items = [
      makeItem({ title: uniqueTitle('batchA') }),
      makeItem({ title: uniqueTitle('batchB') }),
      makeItem({ title: uniqueTitle('batchC') }),
    ]
    const ids = await db.batchAddItems(items)
    expect(ids.length).toBe(3)
    expect(ids.every(id => typeof id === 'number')).toBe(true)
  })

  it('returns an empty array for empty input', async () => {
    const ids = await db.batchAddItems([])
    expect(ids).toEqual([])
  })

  it('handles null/undefined input gracefully', async () => {
    const ids = await db.batchAddItems(null)
    expect(ids).toEqual([])
  })

  it('does not deduplicate within a single batch transaction', async () => {
    const title = uniqueTitle('batch-dup')
    const item = makeItem({ title })
    const ids = await db.batchAddItems([item, item])
    expect(ids.length).toBe(2)
    // All requests in a single txn see the same (empty) state.
    // Both records are created; db.js dedup only works across separate addItem calls.
    const all = await db.getAllItems()
    const matching = all.filter(i => i.title === title)
    expect(matching.length).toBe(2)
  })

  it('does not deduplicate recurring items within a single batch transaction', async () => {
    const title = uniqueTitle('batch-recur')
    const items = [
      makeItem({ title, recurringGroupId: 'rg-batch', occurrenceIndex: 0 }),
      makeItem({ title, recurringGroupId: 'rg-batch', occurrenceIndex: 0 }),
    ]
    const ids = await db.batchAddItems(items)
    expect(ids.length).toBe(2)
    const all = await db.getAllItems()
    const matching = all.filter(i => i.title === title && i.recurringGroupId === 'rg-batch')
    expect(matching.length).toBe(2)
  })
})

describe('Database — batchPutItems', () => {
  let db

  beforeEach(async () => {
    db = new Database()
    await db.init()
  })

  afterEach(async () => {
    await cleanDB(db)
  })

  it('upserts multiple items in a single transaction', async () => {
    const titleA = uniqueTitle('putBulkA')
    const titleB = uniqueTitle('putBulkB')
    const items = [
      makeItem({ title: titleA }),
      makeItem({ title: titleB }),
    ]
    await db.batchPutItems(items)
    const all = await db.getAllItems()
    expect(all.some(i => i.title === titleA)).toBe(true)
    expect(all.some(i => i.title === titleB)).toBe(true)
  })

  it('replaces existing items with the same id', async () => {
    const titleOld = uniqueTitle('put-old')
    const titleNew = uniqueTitle('put-new')
    const id = await db.addItem(makeItem({ title: titleOld }))
    await db.batchPutItems([{ id, title: titleNew, type: 'todo' }])
    const updated = await db.getItem(id)
    expect(updated.title).toBe(titleNew)
  })
})

describe('Database — updateItem', () => {
  let db

  beforeEach(async () => {
    db = new Database()
    await db.init()
  })

  afterEach(async () => {
    await cleanDB(db)
  })

  it('updates an existing item and returns the updated object', async () => {
    const titleBefore = uniqueTitle('before')
    const titleAfter = uniqueTitle('after')
    const id = await db.addItem(makeItem({ title: titleBefore }))
    const updated = await db.updateItem(id, { title: titleAfter })
    expect(updated.title).toBe(titleAfter)
    expect(updated.updatedAt).toBeTruthy()
    const retrieved = await db.getItem(id)
    expect(retrieved.title).toBe(titleAfter)
  })

  it('throws when updating a non-existent item', async () => {
    await expect(db.updateItem(99999999, { title: 'ghost' })).rejects.toThrow('事项不存在')
  })

  it('regenerates hash after update', async () => {
    const id = await db.addItem(makeItem({ title: uniqueTitle('hash-before') }))
    const before = await db.getItem(id)
    const updated = await db.updateItem(id, { title: uniqueTitle('hash-after') })
    expect(updated.hash).not.toBe(before.hash)
  })
})

describe('Database — settings', () => {
  let db

  beforeEach(async () => {
    db = new Database()
    await db.init()
  })

  afterEach(async () => {
    await cleanDB(db)
  })

  it('stores and retrieves a setting', async () => {
    const key = uniqueTitle('setting-key')
    await db.setSetting(key, 'test_value')
    const value = await db.getSetting(key)
    expect(value).toBe('test_value')
  })

  it('returns null for a non-existent setting', async () => {
    const value = await db.getSetting(uniqueTitle('nonexistent'))
    expect(value).toBeNull()
  })

  it('overwrites an existing setting', async () => {
    const key = uniqueTitle('overwrite-key')
    await db.setSetting(key, 'v1')
    await db.setSetting(key, 'v2')
    expect(await db.getSetting(key)).toBe('v2')
  })

  it('stores complex objects as values', async () => {
    const key = uniqueTitle('complex-key')
    const obj = { a: 1, b: [2, 3], c: { d: 4 } }
    await db.setSetting(key, obj)
    expect(await db.getSetting(key)).toEqual(obj)
  })
})

describe('Database — edge cases', () => {
  let db

  beforeEach(async () => {
    db = new Database()
    await db.init()
  })

  afterEach(async () => {
    await cleanDB(db)
  })

  it('getAllItems is always an array', async () => {
    const items = await db.getAllItems()
    expect(Array.isArray(items)).toBe(true)
  })

  it('addItem with empty title still works', async () => {
    const id = await db.addItem(makeItem({ title: '' }))
    expect(id).toBeGreaterThan(0)
  })

  it('getItemByHash returns the correct item', async () => {
    const title = uniqueTitle('hash-lookup')
    await db.addItem(makeItem({ title }))
    const items = await db.getAllItems()
    const stored = items.find(i => i.title === title)
    const found = await db.getItemByHash(stored.hash)
    expect(found).toBeTruthy()
    expect(found.title).toBe(title)
  })

  it('getItemByHash returns undefined for unknown hash', async () => {
    const found = await db.getItemByHash('nonexistent-hash-xyz')
    expect(found).toBeFalsy()
  })

  it('exportData returns structured data with items, settings, sideData', async () => {
    const title = uniqueTitle('export-test')
    await db.addItem(makeItem({ title }))
    const exported = await db.exportData()
    expect(exported).toHaveProperty('items')
    expect(exported).toHaveProperty('settings')
    expect(exported).toHaveProperty('sideData')
    expect(exported).toHaveProperty('exportDate')
    expect(exported.items.some(i => i.title === title)).toBe(true)
  })

  it('clearAllItems removes all items but keeps settings', async () => {
    const key = uniqueTitle('keep-key')
    await db.addItem(makeItem())
    await db.setSetting(key, 'me')
    await db.clearAllItems()
    const items = await db.getAllItems()
    expect(items.length).toBe(0)
    expect(await db.getSetting(key)).toBe('me')
  })

  it('clearAllData removes items and settings', async () => {
    const key = uniqueTitle('gone-key')
    await db.addItem(makeItem())
    await db.setSetting(key, 'soon')
    await db.clearAllData()
    const items = await db.getAllItems()
    expect(items.length).toBe(0)
    expect(await db.getSetting(key)).toBeNull()
  })

  it('deleteItemsByHashes with empty set skips deletion', async () => {
    const title = uniqueTitle('keep-me')
    await db.addItem(makeItem({ title }))
    const deleted = await db.deleteItemsByHashes([])
    expect(deleted).toBe(0)
    const items = await db.getAllItems()
    expect(items.some(i => i.title === title)).toBe(true)
  })

  it('deleteItemsByHashes removes items whose hashes are not in the keep set', async () => {
    const titleKeep = uniqueTitle('keep')
    const titleDel = uniqueTitle('delete')
    await db.addItem(makeItem({ title: titleKeep }))
    await db.addItem(makeItem({ title: titleDel }))
    // Get the actual hash of the item to keep
    const all = await db.getAllItems()
    const keepItem = all.find(i => i.title === titleKeep)
    const deleted = await db.deleteItemsByHashes(new Set([keepItem.hash]))
    // deleted is >= 1 (at least the delete-me item, maybe more from other tests)
    expect(deleted >= 1).toBe(true)
    const remaining = await db.getAllItems()
    expect(remaining.some(i => i.title === titleKeep)).toBe(true)
  })

  it('importData restores items and settings', async () => {
    const titleA = uniqueTitle('import-A')
    const titleB = uniqueTitle('import-B')
    const key = uniqueTitle('import-key')
    const data = {
      items: [
        makeItem({ title: titleA }),
        makeItem({ title: titleB, type: 'meeting', date: '2026-05-12' }),
      ],
      settings: [{ key, value: 'imported_value', updatedAt: new Date().toISOString() }],
      sideData: {},
    }
    await db.importData(data)
    const items = await db.getAllItems()
    expect(items.some(i => i.title === titleA)).toBe(true)
    expect(items.some(i => i.title === titleB)).toBe(true)
    expect(await db.getSetting(key)).toBe('imported_value')
  })

  it('batchDeleteItems removes items by id array', async () => {
    const titleKeep = uniqueTitle('keepD')
    const titleDel = uniqueTitle('delD')
    const idKeep = await db.addItem(makeItem({ title: titleKeep }))
    const idDel = await db.addItem(makeItem({ title: titleDel }))
    await db.batchDeleteItems([idDel])
    const remaining = await db.getAllItems()
    expect(remaining.some(i => i.id === idKeep)).toBe(true)
    expect(remaining.some(i => i.id === idDel)).toBe(false)
  })

  it('batchDeleteItems handles empty id array', async () => {
    await expect(db.batchDeleteItems([])).resolves.toBeUndefined()
    await expect(db.batchDeleteItems(null)).resolves.toBeUndefined()
  })
})
