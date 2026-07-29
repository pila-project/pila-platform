/**
 * Sequence `items` field helpers.
 *
 * Write / mutate (canonical only):
 *   { "0": { id: "uuid" }, "1": { id: "uuid" }, ... }
 *   Empty sequence: `items: {}`
 *
 * Read / preview also tolerates legacy shapes still present in catalog content:
 *   - string[]
 *   - { id }[]
 *   - object maps (including sparse / mixed entry forms)
 *
 * UIUX-113: sequence members must be leaf content only — never nested sequences.
 */

import { getContentMetadata } from './content-cache.js'

/** Empty sequence items (Agent create). */
export const EMPTY_SEQUENCE_ITEMS = Object.freeze({})

/** Agent active_type for sequence documents. */
export const SEQUENCE_ACTIVE_TYPE = 'application/json;type=sequence'

export function isSequenceActiveType(activeType) {
  return activeType === SEQUENCE_ACTIVE_TYPE
}

function toIdSet(knownSequenceIds) {
  if (!knownSequenceIds) return null
  if (knownSequenceIds instanceof Set) return knownSequenceIds
  if (Array.isArray(knownSequenceIds)) return new Set(knownSequenceIds)
  return null
}

/**
 * Split candidate member ids into leaf content vs sequences (UIUX-113).
 * Uses optional knownSequenceIds for fast rejects, then metadata active_type.
 * Unknown/failed metadata is treated as allowed (do not block real items).
 *
 * @param {string[]} itemIds
 * @param {{ knownSequenceIds?: Set<string>|string[] }} [opts]
 * @returns {Promise<{ allowed: string[], rejectedSequences: string[] }>}
 */
export async function partitionSequenceMemberIds(itemIds, opts = {}) {
  const known = toIdSet(opts.knownSequenceIds)
  const allowed = []
  const rejectedSequences = []
  const seen = new Set()

  for (const id of itemIds || []) {
    if (!id || seen.has(id)) continue
    seen.add(id)

    if (known?.has(id)) {
      rejectedSequences.push(id)
      continue
    }

    try {
      const meta = await getContentMetadata(id)
      if (isSequenceActiveType(meta?.active_type)) {
        rejectedSequences.push(id)
        continue
      }
    } catch {
      // allow when type cannot be determined
    }
    allowed.push(id)
  }

  return { allowed, rejectedSequences }
}

/** Extract a content id from a sequence entry (string or { id }). */
function entryContentId(entry) {
  if (typeof entry === 'string' && entry) return entry
  if (entry && typeof entry === 'object') {
    const id = entry.id
    if (typeof id === 'string' && id) return id
  }
  return null
}

/** True when `items` is a plain object map (not an array) with valid entry ids. */
export function isValidMapSequenceItems(items) {
  if (items == null) return false
  if (Array.isArray(items)) return false
  if (typeof items !== 'object') return false
  for (const entry of Object.values(items)) {
    if (!entryContentId(entry)) return false
  }
  return true
}

/** True when Agent sequence state is safe to mutate (map format only). */
export function isValidSequenceAgentState(state) {
  if (!state || typeof state !== 'object') return false
  return isValidMapSequenceItems(state.items)
}

/**
 * Ordered content ids for display / preview / copy.
 * Tolerates map + legacy array shapes; skips invalid entries.
 * Does not change write format — mutations still require a valid map.
 */
export function normalizeSequenceItems(items) {
  if (items == null) return []

  if (Array.isArray(items)) {
    return items.map(entryContentId).filter(Boolean)
  }

  if (typeof items !== 'object') return []

  const entries = Object.entries(items)
  // Dense numeric keys ("0","1",…) → stable ascending order (matches sequence order).
  // Non-numeric keys keep Object.entries insertion order.
  const allNumeric = entries.length > 0 && entries.every(([k]) => /^\d+$/.test(k))
  if (allNumeric) {
    entries.sort((a, b) => Number(a[0]) - Number(b[0]))
  }

  return entries.map(([, entry]) => entryContentId(entry)).filter(Boolean)
}

/** Rebuild map with dense numeric keys; preserve extra fields on each entry. */
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

/** Create map-shaped items for Agent.create (optional initial ids). */
export function createMapSequenceItems(itemIds = []) {
  return serializeMapSequenceItems(itemIds, null)
}

async function loadSequenceItemsState(sequenceId) {
  const state = await Agent.state(sequenceId)
  if (!isValidSequenceAgentState(state)) {
    const err = new Error('Sequence has invalid or unsupported items format')
    err.sequenceId = sequenceId
    throw err
  }
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
    const state = await Agent.state(sequenceId)
    if (!isValidSequenceAgentState(state)) {
      throw new Error('Sequence items invalid after save')
    }
  } catch (e) {
    const err = new Error('Sequence update was rejected by the server')
    err.cause = e
    throw err
  }
}

/**
 * Persist a full item-id list; returns normalized ids for UI.
 * UIUX-113: nested sequence ids are stripped before write.
 */
export async function persistSequenceItems(sequenceId, itemIds, { knownSequenceIds } = {}) {
  const { allowed } = await partitionSequenceMemberIds(itemIds, { knownSequenceIds })
  const { state, rawItems } = await loadSequenceItemsState(sequenceId)
  state.items = serializeMapSequenceItems(allowed, rawItems)
  await syncSequenceMutation(sequenceId)
  return readSequenceItemIds(sequenceId)
}

/**
 * Append leaf content ids only (UIUX-113: never nest sequences).
 * @param {string} sequenceId
 * @param {string[]} itemIds
 * @param {{ insertIndex?: number, knownSequenceIds?: Set<string>|string[] }} [opts]
 * @returns {Promise<{ added: number, items: string[], rejectedSequences: string[] }>}
 */
export async function appendItemsToSequence(sequenceId, itemIds, {
  insertIndex = -1,
  knownSequenceIds,
} = {}) {
  if (!sequenceId || !itemIds?.length) {
    return { added: 0, items: [], rejectedSequences: [] }
  }

  const { allowed, rejectedSequences } = await partitionSequenceMemberIds(itemIds, {
    knownSequenceIds,
  })

  const { state, rawItems, ids } = await loadSequenceItemsState(sequenceId)

  if (!allowed.length) {
    return { added: 0, items: ids, rejectedSequences }
  }

  const priorLen = ids.length
  let added = 0
  let insertAt = insertIndex >= 0 ? insertIndex : ids.length

  for (const id of allowed) {
    if (!id || ids.includes(id)) continue

    if (insertIndex >= 0 && insertIndex <= ids.length) {
      ids.splice(insertAt, 0, id)
      insertAt++
    } else {
      ids.push(id)
    }
    added++
  }

  if (!added) return { added: 0, items: ids, rejectedSequences }

  // Replace the whole map — Agent does not reliably persist in-place key assignment.
  state.items = serializeMapSequenceItems(ids, rawItems)

  await syncSequenceMutation(sequenceId)
  const items = await readSequenceItemIds(sequenceId)
  if (items.length < priorLen + added) {
    const err = new Error('Sequence items were not persisted')
    err.sequenceId = sequenceId
    throw err
  }
  return { added, items, rejectedSequences }
}

/** Remove one item by index (sequence card trash). */
export async function removeItemFromSequence(sequenceId, index) {
  const { state, rawItems, ids } = await loadSequenceItemsState(sequenceId)
  if (index < 0 || index >= ids.length) return { items: ids }

  ids.splice(index, 1)
  state.items = serializeMapSequenceItems(ids, rawItems)

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

  const [moved] = ids.splice(fromIndex, 1)
  ids.splice(toIndex, 0, moved)
  state.items = serializeMapSequenceItems(ids, rawItems)

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