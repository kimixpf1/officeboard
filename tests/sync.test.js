/**
 * Unit tests for js/sync.js (Supabase sync engine)
 *
 * Tests core algorithms: reconciliation, dedup, tombstone, key generation.
 * Uses mocked Supabase client and real IndexedDB (fake-indexeddb).
 * We never modify sync.js — the class is obtained via window.syncManager.constructor.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Source files (utils.js, db.js, sync.js) are loaded by tests/setup.js via new Function().
// Global instances window.db and window.syncManager are already available.

const SyncManager = window.syncManager.constructor
const Database = window.db.constructor
const SafeStorage = window.SafeStorage

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

function makeSyncItem(overrides = {}) {
  return {
    id: 1,
    type: 'todo',
    title: '测试事项',
    date: '2026-05-12',
    createdAt: '2026-05-10T08:00:00.000Z',
    updatedAt: '2026-05-10T08:00:00.000Z',
    hash: 'test-hash-1',
    ...overrides,
  }
}

function makeMeetingItem(overrides = {}) {
  return makeSyncItem({
    id: 2,
    type: 'meeting',
    title: '全市统计工作会议',
    date: '2026-05-12',
    attendees: ['张三'],
    hash: 'meeting-hash-1',
    ...overrides,
  })
}

function makeDocItem(overrides = {}) {
  return makeSyncItem({
    id: 3,
    type: 'document',
    title: '关于印发统计报表制度的通知',
    docStartDate: '2026-05-01',
    docEndDate: '2026-05-31',
    docNumber: '苏统办〔2026〕1号',
    hash: 'doc-hash-1',
    ...overrides,
  })
}

// ---------------------------------------------------------------------------
// getItemKey tests
// ---------------------------------------------------------------------------

describe('SyncManager — getItemKey', () => {
  let sm

  beforeEach(async () => {
    sm = new SyncManager()
    await sm.initPromise
  })

  it('generates a key for todo items using title and deadline', () => {
    const key = sm.getItemKey({ type: 'todo', title: '写报告', deadline: '2026-05-12' })
    expect(key).toContain('todo:')
    expect(key).toContain('写报告')
    expect(key).toContain('2026-05-12')
  })

  it('generates a key for meeting items using keywords and date', () => {
    const key = sm.getItemKey({ type: 'meeting', title: '研究统计工作会议', date: '2026-05-12' })
    // Keywords like 会议/研究/工作 should be stripped
    expect(key).toContain('meeting:')
    expect(key).not.toContain('会议')
    expect(key).toContain('2026-05-12')
  })

  it('generates a key for document items using docNumber when available', () => {
    const key = sm.getItemKey({ type: 'document', title: '通知', docNumber: '苏统办〔2026〕1号' })
    expect(key).toBe('doc:苏统办〔2026〕1号')
  })

  it('falls back to title + dates for documents without docNumber', () => {
    const key = sm.getItemKey({
      type: 'document', title: '关于XXX的通知',
      docStartDate: '2026-05-01', docEndDate: '2026-05-15',
    })
    expect(key).toContain('doc:')
    expect(key).toContain('关于')
    expect(key).toContain('2026-05-01')
    expect(key).toContain('2026-05-15')
  })

  it('uses recurring pattern for todo items with recurringGroupId', () => {
    const key = sm.getItemKey({
      type: 'todo', title: '每周例会',
      recurringGroupId: 'group-1', occurrenceIndex: 3,
    })
    expect(key).toBe('todo:recurring:group-1:3')
  })

  it('uses recurring pattern for document items with recurringGroupId', () => {
    const key = sm.getItemKey({
      type: 'document', title: '周期性办文',
      recurringGroupId: 'group-doc', occurrenceIndex: 0,
    })
    expect(key).toBe('doc:recurring:group-doc:0')
  })

  it('trims and lowercases titles for consistency', () => {
    const key1 = sm.getItemKey({ type: 'todo', title: '  写报告  ', deadline: '2026-05-12' })
    const key2 = sm.getItemKey({ type: 'todo', title: '写报告', deadline: '2026-05-12' })
    expect(key1).toBe(key2)
  })

  it('strips common meeting keywords from the key', () => {
    const key = sm.getItemKey({ type: 'meeting', title: '学习贯彻习近平法治思想专题培训班', date: '2026-05-12' })
    // 学习 and 培训 are in the strip list; 贯彻 is NOT
    expect(key).not.toContain('学习')
    expect(key).toContain('贯彻')
    expect(key).not.toContain('培训')
    expect(key).toContain('专题班')
  })

  it('handles null item by throwing', () => {
    expect(() => sm.getItemKey(null)).toThrow()
  })

  it('handles item with no type', () => {
    const key = sm.getItemKey({ title: '无类型' })
    expect(key).toBe('undefined:无类型')
  })
})

// ---------------------------------------------------------------------------
// getTimeMs / getItemUpdatedTime tests
// ---------------------------------------------------------------------------

describe('SyncManager — getTimeMs / getItemUpdatedTime', () => {
  let sm

  beforeEach(async () => {
    sm = new SyncManager()
    await sm.initPromise
  })

  it('getTimeMs converts ISO string to milliseconds', () => {
    const ms = sm.getTimeMs('2026-05-12T08:00:00.000Z')
    expect(ms).toBeGreaterThan(0)
    expect(typeof ms).toBe('number')
  })

  it('getTimeMs returns 0 for falsy values', () => {
    expect(sm.getTimeMs(null)).toBe(0)
    expect(sm.getTimeMs(undefined)).toBe(0)
    expect(sm.getTimeMs('')).toBe(0)
    expect(sm.getTimeMs(false)).toBe(0)
  })

  it('getTimeMs returns 0 for invalid date strings', () => {
    expect(sm.getTimeMs('not-a-date')).toBe(0)
    expect(sm.getTimeMs('garbage')).toBe(0)
  })

  it('getItemUpdatedTime prefers updatedAt over createdAt', () => {
    const item = {
      updatedAt: '2026-05-12T10:00:00.000Z',
      createdAt: '2026-05-10T08:00:00.000Z',
    }
    const t = sm.getItemUpdatedTime(item)
    expect(t).toBe(sm.getTimeMs('2026-05-12T10:00:00.000Z'))
  })

  it('getItemUpdatedTime falls back to createdAt', () => {
    const item = { createdAt: '2026-05-10T08:00:00.000Z' }
    const t = sm.getItemUpdatedTime(item)
    expect(t).toBe(sm.getTimeMs('2026-05-10T08:00:00.000Z'))
  })

  it('getItemUpdatedTime returns 0 for null/undefined item', () => {
    expect(sm.getItemUpdatedTime(null)).toBe(0)
    expect(sm.getItemUpdatedTime(undefined)).toBe(0)
    expect(sm.getItemUpdatedTime({})).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// buildReconciledItems tests
// ---------------------------------------------------------------------------

describe('SyncManager — buildReconciledItems', () => {
  let sm

  beforeEach(async () => {
    sm = new SyncManager()
    await sm.initPromise
  })

  it('returns empty array when both inputs are empty', () => {
    const result = sm.buildReconciledItems([], [])
    expect(result).toEqual([])
  })

  it('returns all cloud items when local is empty', () => {
    const cloud = [makeSyncItem({ title: '云端A' }), makeSyncItem({ title: '云端B' })]
    const result = sm.buildReconciledItems([], cloud)
    expect(result.length).toBe(2)
    expect(result.map((r) => r.title)).toContain('云端A')
    expect(result.map((r) => r.title)).toContain('云端B')
  })

  it('returns local items when cloud is empty (within baseline)', () => {
    const local = [makeSyncItem({ title: '本地A' })]
    const result = sm.buildReconciledItems(local, [])
    expect(result.length).toBe(1)
    expect(result[0].title).toBe('本地A')
  })

  it('filters out local items older than baseline when no match in cloud', () => {
    const local = [makeSyncItem({
      title: '旧本地',
      updatedAt: '2026-05-01T00:00:00.000Z',
    })]
    const baselineTime = sm.getTimeMs('2026-05-10T00:00:00.000Z')
    const result = sm.buildReconciledItems(local, [], baselineTime)
    // local item older than baseline, no cloud data → filtered out
    expect(result.length).toBe(0)
  })

  it('prefers the newer item when both local and cloud have the same key', () => {
    const local = [makeSyncItem({ title: '本地新版', updatedAt: '2026-05-12T10:00:00.000Z' })]
    const cloud = [makeSyncItem({ title: '云端旧版', updatedAt: '2026-05-10T08:00:00.000Z' })]
    const result = sm.buildReconciledItems(local, cloud)
    expect(result.length).toBe(1)
    // Local is newer, so it should win
    expect(result[0].title).toBe('本地新版')
  })

  it('prefers cloud item when it is newer', () => {
    const local = [makeSyncItem({ title: '本地旧版', updatedAt: '2026-05-10T08:00:00.000Z' })]
    const cloud = [makeSyncItem({ title: '云端新版', updatedAt: '2026-05-12T10:00:00.000Z' })]
    const result = sm.buildReconciledItems(local, cloud)
    expect(result.length).toBe(1)
    expect(result[0].title).toBe('云端新版')
  })

  it('merges cloud-only items with different keys from local-only items', () => {
    const local = [makeSyncItem({ id: 10, title: '纯本地A', hash: 'local-only', type: 'todo' })]
    const cloud = [makeSyncItem({ id: 20, title: '纯云端B', hash: 'cloud-only', type: 'meeting', date: '2026-05-12' })]
    const result = sm.buildReconciledItems(local, cloud)
    expect(result.length).toBe(2)
    const titles = result.map((r) => r.title)
    expect(titles).toContain('纯本地A')
    expect(titles).toContain('纯云端B')
  })

  it('matches items by id even when key differs', () => {
    const local = [makeSyncItem({ id: 1, title: '本地标题', type: 'todo' })]
    const cloud = [makeSyncItem({ id: 1, title: '云端标题', type: 'todo' })]
    const result = sm.buildReconciledItems(local, cloud)
    // Same id → they should be matched as the same item
    expect(result.length).toBe(1)
  })

  it('excludes items marked as deleted (tombstone)', () => {
    const cloud = [makeSyncItem({ title: '已删除', updatedAt: '2026-05-01T00:00:00.000Z' })]
    // Mark this item as deleted at a time after its update
    sm.markItemDeleted(cloud[0], '2026-05-12T00:00:00.000Z')
    const result = sm.buildReconciledItems([], cloud)
    expect(result.length).toBe(0)
  })

  it('handles null/undefined inputs', () => {
    const result = sm.buildReconciledItems(null, null)
    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// deduplicateItems tests
// ---------------------------------------------------------------------------

describe('SyncManager — deduplicateItems', () => {
  let sm

  beforeEach(async () => {
    sm = new SyncManager()
    await sm.initPromise
  })

  it('removes items with the same key, keeping the one with later updatedAt', () => {
    const items = [
      makeSyncItem({ title: '重复', updatedAt: '2026-05-01T00:00:00.000Z' }),
      makeSyncItem({ title: '重复', updatedAt: '2026-05-12T00:00:00.000Z' }),
    ]
    const result = sm.deduplicateItems(items)
    expect(result.length).toBe(1)
    expect(result[0].updatedAt).toBe('2026-05-12T00:00:00.000Z')
  })

  it('merges attendees for duplicate meetings', () => {
    const items = [
      makeMeetingItem({ title: '工作会议', attendees: ['张三'], updatedAt: '2026-05-01T00:00:00.000Z' }),
      makeMeetingItem({ title: '工作会议', attendees: ['李四'], updatedAt: '2026-05-12T00:00:00.000Z' }),
    ]
    const result = sm.deduplicateItems(items)
    expect(result.length).toBe(1)
    expect(result[0].attendees).toContain('张三')
    expect(result[0].attendees).toContain('李四')
  })

  it('throws when given null input', () => {
    expect(() => sm.deduplicateItems(null)).toThrow()
  })

  it('keeps all unique items', () => {
    const items = [
      makeSyncItem({ title: 'A', hash: 'a' }),
      makeSyncItem({ title: 'B', hash: 'b' }),
      makeSyncItem({ title: 'C', hash: 'c' }),
    ]
    const result = sm.deduplicateItems(items)
    expect(result.length).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// findMatchingItem tests
// ---------------------------------------------------------------------------

describe('SyncManager — findMatchingItem', () => {
  let sm

  beforeEach(async () => {
    sm = new SyncManager()
    await sm.initPromise
  })

  it('finds an item by matching key', () => {
    const items = [makeSyncItem({ title: '查找目标' })]
    const found = sm.findMatchingItem(items, makeSyncItem({ title: '查找目标' }))
    expect(found).toBeTruthy()
    expect(found.title).toBe('查找目标')
  })

  it('returns null when no match found', () => {
    const items = [makeSyncItem({ title: '其他' })]
    const found = sm.findMatchingItem(items, makeSyncItem({ title: '不存在的' }))
    expect(found).toBeNull()
  })

  it('handles null/undefined inputs', () => {
    expect(sm.findMatchingItem(null, makeSyncItem())).toBeNull()
    expect(sm.findMatchingItem([], null)).toBeNull()
    expect(sm.findMatchingItem('not-array', {})).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Tombstone (deleted items) tests
// ---------------------------------------------------------------------------

describe('SyncManager — tombstone (markItemDeleted / shouldKeepDeleted / clearDeletedMarker)', () => {
  let sm

  beforeEach(async () => {
    sm = new SyncManager()
    await sm.initPromise
    sm.clearDeletedItemsMap()
  })

  it('markItemDeleted records a deletion timestamp', () => {
    const item = makeSyncItem({ title: '要删除的' })
    sm.markItemDeleted(item, '2026-05-12T10:00:00.000Z')
    const key = sm.getItemDeletionKey(item)
    expect(sm.deletedItemsMap[key]).toBe('2026-05-12T10:00:00.000Z')
  })

  it('shouldKeepDeleted returns true when deletion time >= item update time', () => {
    const item = makeSyncItem({ title: '已删除', updatedAt: '2026-05-01T00:00:00.000Z' })
    sm.markItemDeleted(item, '2026-05-12T00:00:00.000Z')
    expect(sm.shouldKeepDeleted(item)).toBe(true)
  })

  it('shouldKeepDeleted returns false when item was updated after deletion', () => {
    const item = makeSyncItem({ title: '已恢复', updatedAt: '2026-05-15T00:00:00.000Z' })
    sm.markItemDeleted(item, '2026-05-12T00:00:00.000Z')
    // deletion at May 12, update at May 15 → item was updated after deletion
    expect(sm.shouldKeepDeleted(item)).toBe(false)
  })

  it('shouldKeepDeleted returns false for items not in deletedItemsMap', () => {
    const item = makeSyncItem({ title: '未删除' })
    expect(sm.shouldKeepDeleted(item)).toBe(false)
  })

  it('clearDeletedMarker removes the tombstone', () => {
    const item = makeSyncItem({ title: '恢复的' })
    sm.markItemDeleted(item)
    expect(sm.shouldKeepDeleted(item)).toBe(true)
    sm.clearDeletedMarker(item)
    expect(sm.shouldKeepDeleted(item)).toBe(false)
  })

  it('getDeletedAt returns the deletion timestamp', () => {
    const item = makeSyncItem({ title: '时间戳' })
    sm.markItemDeleted(item, '2026-05-12T15:00:00.000Z')
    expect(sm.getDeletedAt(item)).toBe('2026-05-12T15:00:00.000Z')
  })

  it('getDeletedAt returns empty string for non-deleted items', () => {
    const item = makeSyncItem({ title: '活的' })
    expect(sm.getDeletedAt(item)).toBe('')
  })

  it('marks deletion by id as well as key', () => {
    const item = makeSyncItem({ id: 999, title: 'ID删除' })
    sm.markItemDeleted(item, '2026-05-12T00:00:00.000Z')
    expect(sm.deletedItemsMap['id:999']).toBe('2026-05-12T00:00:00.000Z')
  })

  it('shouldKeepDeleted checks id-based tombstone', () => {
    const item = makeSyncItem({ id: 888, title: 'ID墓碑', updatedAt: '2026-05-01T00:00:00.000Z' })
    sm.markItemDeleted(item, '2026-05-12T00:00:00.000Z')
    expect(sm.shouldKeepDeleted(item)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// _shouldProtectAgainstCloudShrink tests
// ---------------------------------------------------------------------------

describe('SyncManager — _shouldProtectAgainstCloudShrink', () => {
  let sm

  beforeEach(async () => {
    sm = new SyncManager()
    await sm.initPromise
  })

  it('returns null when local is empty', () => {
    const result = sm._shouldProtectAgainstCloudShrink([], [])
    expect(result).toBeNull()
  })

  it('returns null when cloud has more or equal items', () => {
    const local = [makeSyncItem()]
    const cloud = [makeSyncItem(), makeSyncItem()]
    const result = sm._shouldProtectAgainstCloudShrink(local, cloud)
    expect(result).toBeNull()
  })

  it('protects when cloud has zero items but local has items', () => {
    const local = [makeSyncItem(), makeSyncItem()]
    const result = sm._shouldProtectAgainstCloudShrink(local, [])
    expect(result).not.toBeNull()
    expect(result.reason).toContain('跳过合并')
  })

  it('protects when cloud items < 30% of local (and local >= 5)', () => {
    const local = Array.from({ length: 10 }, (_, i) => makeSyncItem({ id: i, title: `L${i}` }))
    const cloud = [makeSyncItem({ id: 999, title: 'Cloud1' })] // 1 < 3 (30% of 10)
    const result = sm._shouldProtectAgainstCloudShrink(local, cloud)
    expect(result).not.toBeNull()
    expect(result.reason).toContain('安全阈值')
  })

  it('does NOT protect when cloud items >= 30% threshold', () => {
    const local = Array.from({ length: 10 }, (_, i) => makeSyncItem({ id: i, title: `L${i}` }))
    const cloud = Array.from({ length: 5 }, (_, i) => makeSyncItem({ id: i + 100, title: `C${i}` })) // 5 >= 3
    const result = sm._shouldProtectAgainstCloudShrink(local, cloud)
    expect(result).toBeNull()
  })

  it('protects when cloud has deleted items and fewer items than local', () => {
    const local = [makeSyncItem(), makeSyncItem(), makeSyncItem()]
    const cloud = [makeSyncItem()]
    const cloudData = { data: { deletedItems: { 'key:some': '2026-05-12T00:00:00.000Z' } } }
    const result = sm._shouldProtectAgainstCloudShrink(local, cloud, cloudData)
    // cloudCount (1) < localCount (3) but cloud items < 30% of local = 0.9
    // So this should trigger the shrink protection, not the deletedItems check specifically.
    // Let's adjust: local >= 5 is needed for the 30% threshold.
    // With local=3 and cloud=1, which check matches?
    // - cloudCount === 0: no (cloud has 1)
    // - localCount >= 5 && cloudCount < local * 0.3: no (local is 3)
    // - deleteItems check: cloudData has deletedItems and cloudCount < localCount → yes
    expect(result).not.toBeNull()
    expect(result.reason).toContain('删除标记')
  })
})

// ---------------------------------------------------------------------------
// mergeData tests (with real Database + mocked uploadToCloud)
// ---------------------------------------------------------------------------

describe('SyncManager — mergeData', () => {
  let sm
  let db

  beforeEach(async () => {
    // Fresh Database
    db = new Database()
    await db.init()

    // Replace global db singletons so SyncManager uses our test db
    // sync.js uses bare `db` (resolves via globalThis), so both must be updated
    const origDb = window.db
    const origGlobalDb = globalThis.db
    window.db = db
    globalThis.db = db

    sm = new SyncManager()
    await sm.initPromise

    // Simulate logged-in state (needed for uploadToCloud)
    sm.currentUser = { id: 'test-user', user_metadata: { username: 'test' } }
    sm.supabase = {
      from: vi.fn(() => ({
        select: vi.fn(function () { return this }),
        eq: vi.fn(function () { return this }),
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      upsert: vi.fn(() => ({
        select: vi.fn(function () {
          return {
            single: vi.fn(() =>
              Promise.resolve({
                data: { updated_at: new Date().toISOString() },
                error: null,
              })
            ),
          }
        }),
      })),
    }

    // Mock uploadToCloud to avoid real network calls
    vi.spyOn(sm, 'uploadToCloud').mockResolvedValue({ success: true })

    // Store originals for cleanup
    sm._origDb = origDb
    sm._origGlobalDb = origGlobalDb
  })

  afterEach(async () => {
    if (db && db.db) {
      try { db.db.close() } catch (e) { /* ignore */ }
    }
    // Delete test database for isolation
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase('OfficeDashboardDB')
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      req.onblocked = () => resolve()
    })
    // Restore global db references
    if (sm._origDb) window.db = sm._origDb
    if (sm._origGlobalDb) globalThis.db = sm._origGlobalDb
    vi.restoreAllMocks()
  })

  it('writes cloud items to local when local is empty', async () => {
    const cloudData = {
      data: {
        items: [makeSyncItem({ title: '云端事项1' }), makeSyncItem({ title: '云端事项2' })],
        settings: {},
      },
    }
    await sm.mergeData([], cloudData)
    const items = await db.getAllItems()
    expect(items.length).toBe(2)
    const titles = items.map((i) => i.title)
    expect(titles).toContain('云端事项1')
    expect(titles).toContain('云端事项2')
  })

  it('merges local items with cloud items, preferring newer versions', async () => {
    // Add local item first and read back to get real hash from IndexedDB
    const localInput = makeSyncItem({ title: '本地', updatedAt: '2026-05-12T10:00:00.000Z', hash: undefined })
    const localId = await db.addItem({ ...localInput })
    const localItem = await db.getItem(localId)
    expect(localItem).toBeTruthy()

    const cloudData = {
      data: {
        items: [makeSyncItem({ title: '云端旧版', updatedAt: '2026-05-10T08:00:00.000Z' })],
        settings: {},
      },
    }

    await sm.mergeData([localItem], cloudData)
    const items = await db.getAllItems()
    // At least one item should survive (local wins, cloud merged or not)
    expect(items.length >= 1).toBe(true)
    const titles = items.map((i) => i.title)
    expect(titles).toContain('本地')
  })

  it('does not overwrite local when cloud data is protected (shrink)', async () => {
    const localItems = Array.from({ length: 10 }, (_, i) => makeSyncItem({ id: i, title: `重要${i}` }))
    for (const item of localItems) {
      await db.addItem({ ...item })
    }

    const cloudData = {
      data: {
        items: [], // Empty cloud — should trigger protection
        settings: {},
      },
    }

    const result = await sm.mergeData(localItems, cloudData)
    // Protection should have kicked in
    const items = await db.getAllItems()
    // Local items should be preserved
    expect(items.length).toBe(10)
    expect(result.protected).toBe(true)
  })

  it('filters out deleted items during merge', async () => {
    const cloudItem = makeSyncItem({ title: '已删除云端项', updatedAt: '2026-05-01T00:00:00.000Z' })
    sm.markItemDeleted(cloudItem, '2026-05-12T00:00:00.000Z')

    const cloudData = {
      data: {
        items: [cloudItem],
        settings: {},
      },
    }

    await sm.mergeData([], cloudData)
    const items = await db.getAllItems()
    // The deleted item should have been filtered out
    expect(items.length).toBe(0)
  })

  it('propagates cloud sideData (memo, schedule, etc.) to localStorage', async () => {
    const cloudData = {
      data: {
        items: [],
        settings: {},
        memo: '云端备忘录内容',
        schedule: '云端日程内容',
      },
    }

    await sm.mergeData([], cloudData)
    expect(SafeStorage.get('office_memo_content')).toBe('云端备忘录内容')
    expect(SafeStorage.get('office_schedule_content')).toBe('云端日程内容')
  })
})

// ---------------------------------------------------------------------------
// _mergeAlarms tests
// ---------------------------------------------------------------------------

describe('SyncManager — _mergeAlarms', () => {
  let sm

  beforeEach(async () => {
    sm = new SyncManager()
    await sm.initPromise
  })

  it('returns cloud value when local is empty', () => {
    const result = sm._mergeAlarms('[]', JSON.stringify([{ id: 'a', time: '08:00' }]))
    const parsed = JSON.parse(result)
    expect(parsed).toEqual([{ id: 'a', time: '08:00' }])
  })

  it('returns local value when cloud is empty', () => {
    const result = sm._mergeAlarms(JSON.stringify([{ id: 'a', time: '08:00' }]), '[]')
    const parsed = JSON.parse(result)
    expect(parsed).toEqual([{ id: 'a', time: '08:00' }])
  })

  it('merges alarms: cloud alarm with same id overwrites local', () => {
    const local = JSON.stringify([{ id: 'a', time: '08:00', enabled: true }])
    const cloud = JSON.stringify([{ id: 'a', time: '09:00', enabled: false }])
    const result = sm._mergeAlarms(local, cloud)
    const parsed = JSON.parse(result)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].time).toBe('09:00')
    expect(parsed[0].enabled).toBe(false)
  })

  it('adds new cloud alarms to local list', () => {
    const local = JSON.stringify([{ id: 'a', time: '08:00' }])
    const cloud = JSON.stringify([{ id: 'b', time: '09:00' }])
    const result = sm._mergeAlarms(local, cloud)
    const parsed = JSON.parse(result)
    expect(parsed).toHaveLength(2)
    const ids = parsed.map((a) => a.id)
    expect(ids).toContain('a')
    expect(ids).toContain('b')
  })
})

// ---------------------------------------------------------------------------
// hasLocalNonItemData tests
// ---------------------------------------------------------------------------

describe('SyncManager — hasLocalNonItemData', () => {
  let sm

  beforeEach(async () => {
    sm = new SyncManager()
    await sm.initPromise
    // Clear all relevant localStorage keys
    const keys = [
      'office_memo_content', 'office_schedule_content', 'office_links',
      'office_contacts', 'office_countdown_events', 'office_countdown_type_colors',
      'office_countdown_sort_order',
    ]
    keys.forEach((k) => SafeStorage.remove(k))
  })

  it('returns false when no side data exists', () => {
    expect(sm.hasLocalNonItemData()).toBe(false)
  })

  it('returns true when memo content exists', () => {
    SafeStorage.set('office_memo_content', 'some memo')
    expect(sm.hasLocalNonItemData()).toBe(true)
  })

  it('returns true when schedule content exists', () => {
    SafeStorage.set('office_schedule_content', 'schedule text')
    expect(sm.hasLocalNonItemData()).toBe(true)
  })

  it('returns true when countdown events exist', () => {
    SafeStorage.set('office_countdown_events', JSON.stringify([{ id: 1 }]))
    expect(sm.hasLocalNonItemData()).toBe(true)
  })

  it('returns false for empty countdown array', () => {
    SafeStorage.set('office_countdown_events', '[]')
    expect(sm.hasLocalNonItemData()).toBe(false)
  })
})
