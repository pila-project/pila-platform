/**
 * Sequence `items` field — read/write helpers.
 *
 * Legacy shapes:
 * - string[] — Explore-created sequences
 * - { id }[] — array of entry objects
 * - { "0": { id }, ... } — dashboard / older sequences
 *
 * Use incremental Agent patches (push/splice/add) when possible; full replace only
 * when reordering a map. Preserve entry object fields on write.
 */

/** Normalize sequence `items` from Agent state (array or legacy object map). */
export function normalizeSequenceItems(items) {
  if (!items) return []
  if (Array.isArray(items)) {
    return items
      .map((entry) => (typeof entry === 'string' ? entry : entry?.id ?? entry))
      .filter(Boolean)
  }
  if (typeof items === 'object') {
    return Object.values(items)
      .map((entry) => (typeof entry === 'string' ? entry : entry?.id ?? entry))
      .filter(Boolean)
  }
  return []
}

/** @returns {'map' | 'stringArray' | 'objectArray'} */
export function sequenceItemsWriteFormat(items) {
  if (items && typeof items === 'object' && !Array.isArray(items)) return 'map'
  if (Array.isArray(items) && items.some((e) => e && typeof e === 'object')) return 'objectArray'
  return 'stringArray'
}

function mapEntryForId(id, existingItems) {
  if (existingItems && typeof existingItems === 'object' && !Array.isArray(existingItems)) {
    for (const entry of Object.values(existingItems)) {
      const eid = typeof entry === 'string' ? entry : entry?.id
      if (eid === id) {
        return typeof entry === 'object' && entry !== null ? { ...entry, id } : { id }
      }
    }
  }
  return { id }
}

function arrayEntryForId(id, existingItems) {
  if (!Array.isArray(existingItems)) return { id }
  const prior = existingItems.find((e) => (typeof e === 'string' ? e : e?.id) === id)
  if (prior && typeof prior === 'object') return { ...prior, id }
  return { id }
}

function nextMapKey(items) {
  if (!items || typeof items !== 'object' || Array.isArray(items)) return '0'
  const nums = Object.keys(items)
    .map((k) => parseInt(k, 10))
    .filter((n) => !Number.isNaN(n))
  return String((nums.length ? Math.max(...nums) : -1) + 1)
}

/** Rebuild legacy map with stable numeric keys; preserve extra fields on each entry. */
export function serializeMapSequenceItems(itemIds, existingItems) {
  const ids = Array.isArray(itemIds)
    ? itemIds.filter(Boolean)
    : normalizeSequenceItems(itemIds)

  const priorById = new Map()
  if (existingItems && typeof existingItems === 'object' && !Array.isArray(existingItems)) {
    for (const entry of Object.values(existingItems)) {
      const eid = typeof entry === 'string' ? entry : entry?.id
      if (eid) priorById.set(eid, entry)
    }
  }

  return Object.fromEntries(
    ids.map((id, i) => {
      const prior = priorById.get(id)
      const value = typeof prior === 'object' && prior !== null
        ? { ...prior, id }
        : (typeof prior === 'string' ? id : { id })
      return [String(i), value]
    }),
  )
}

/** Write ids using the same shape the sequence already has. */
export function serializeSequenceItems(itemIds, existingItems) {
  const ids = Array.isArray(itemIds)
    ? itemIds.filter(Boolean)
    : normalizeSequenceItems(itemIds)

  const format = sequenceItemsWriteFormat(existingItems)
  if (format === 'map') return serializeMapSequenceItems(ids, existingItems)
  if (format === 'objectArray') return ids.map((id) => arrayEntryForId(id, existingItems))
  return ids
}

async function loadSequenceItemsState(sequenceId) {
  const state = await Agent.state(sequenceId)
  return {
    state,
    rawItems: state.items,
    ids: normalizeSequenceItems(state.items),
  }
}

/** Agent.synced() can resolve before the server rejects a patch — verify with a fresh read. */
async function syncSequenceMutation(sequenceId) {
  await Agent.synced()
  try {
    await Agent.state(sequenceId)
  } catch (e) {
    const err = new Error('Sequence update was rejected by the server')
    err.cause = e
    throw err
  }
}

/** Persist a full item-id list; returns normalized ids for UI. */
export async function persistSequenceItems(sequenceId, itemIds) {
  const { state, rawItems } = await loadSequenceItemsState(sequenceId)
  state.items = serializeSequenceItems(itemIds, rawItems)
  await syncSequenceMutation(sequenceId)
  return readSequenceItemIds(sequenceId)
}

/**
 * Append content ids (incremental patches when possible).
 * @returns {{ added: number, items: string[] }}
 */
export async function appendItemsToSequence(sequenceId, itemIds, { insertIndex = -1 } = {}) {
  if (!sequenceId || !itemIds?.length) return { added: 0, items: [] }

  const { state, rawItems, ids } = await loadSequenceItemsState(sequenceId)
  const format = sequenceItemsWriteFormat(rawItems)
  let added = 0
  let mapNeedsRebuild = false
  let insertAt = insertIndex >= 0 ? insertIndex : ids.length

  if (format === 'stringArray' && !Array.isArray(state.items)) state.items = []
  if (format === 'objectArray' && !Array.isArray(state.items)) state.items = []
  if (format === 'map' && (state.items == null || Array.isArray(state.items))) state.items = {}

  for (const id of itemIds) {
    if (!id || ids.includes(id)) continue

    if (format === 'map') {
      if (insertIndex >= 0 && insertIndex <= ids.length) {
        ids.splice(insertAt, 0, id)
        insertAt++
        mapNeedsRebuild = true
      } else {
        state.items[nextMapKey(state.items)] = mapEntryForId(id, rawItems)
        ids.push(id)
      }
    } else if (format === 'objectArray') {
      const entry = arrayEntryForId(id, rawItems)
      if (insertIndex >= 0 && insertIndex <= ids.length) {
        state.items.splice(insertAt, 0, entry)
        ids.splice(insertAt, 0, id)
        insertAt++
      } else {
        state.items.push(entry)
        ids.push(id)
      }
    } else if (insertIndex >= 0 && insertIndex <= ids.length) {
      state.items.splice(insertAt, 0, id)
      ids.splice(insertAt, 0, id)
      insertAt++
    } else {
      state.items.push(id)
      ids.push(id)
    }
    added++
  }

  if (!added) return { added: 0, items: ids }

  if (mapNeedsRebuild) {
    state.items = serializeMapSequenceItems(ids, rawItems)
  }

  await syncSequenceMutation(sequenceId)
  const items = await readSequenceItemIds(sequenceId)
  return { added, items }
}

/** Remove one item by index (sequence card trash). */
export async function removeItemFromSequence(sequenceId, index) {
  const { state, rawItems, ids } = await loadSequenceItemsState(sequenceId)
  if (index < 0 || index >= ids.length) return { items: ids }

  const format = sequenceItemsWriteFormat(rawItems)
  if (format === 'map') {
    ids.splice(index, 1)
    state.items = serializeMapSequenceItems(ids, rawItems)
  } else if (Array.isArray(state.items)) {
    state.items.splice(index, 1)
  } else {
    ids.splice(index, 1)
    state.items = serializeSequenceItems(ids, rawItems)
  }

  await syncSequenceMutation(sequenceId)
  return { items: await readSequenceItemIds(sequenceId) }
}

/** Reorder within a sequence (sequence card grip drag). */
export async function reorderSequenceItems(sequenceId, fromIndex, toIndex) {
  const { state, rawItems, ids } = await loadSequenceItemsState(sequenceId)
  if (
    fromIndex === null
    || fromIndex === undefined
    || fromIndex === toIndex
    || fromIndex < 0
    || toIndex < 0
    || fromIndex >= ids.length
  ) {
    return { items: ids }
  }

  const format = sequenceItemsWriteFormat(rawItems)
  if (format === 'map') {
    const [moved] = ids.splice(fromIndex, 1)
    ids.splice(toIndex, 0, moved)
    state.items = serializeMapSequenceItems(ids, rawItems)
  } else if (Array.isArray(state.items)) {
    const [moved] = state.items.splice(fromIndex, 1)
    state.items.splice(toIndex, 0, moved)
  } else {
    const [moved] = ids.splice(fromIndex, 1)
    ids.splice(toIndex, 0, moved)
    state.items = serializeSequenceItems(ids, rawItems)
  }

  await syncSequenceMutation(sequenceId)
  return { items: await readSequenceItemIds(sequenceId) }
}

/** Read item ids without mutating. */
export async function readSequenceItemIds(sequenceId) {
  const { ids } = await loadSequenceItemsState(sequenceId)
  return ids
}

export function isExternalExploreDrop(dataTransfer, internalDragIndex) {
  if (!dataTransfer) return false
  if (internalDragIndex !== null && internalDragIndex !== undefined) return false
  const types = [...(dataTransfer.types || [])]
  if (types.includes('text/x-reorder')) return false
  const id = dataTransfer.getData('text/plain') || dataTransfer.getData('text')
  return !!id
}