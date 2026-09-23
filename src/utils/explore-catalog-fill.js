import { mapPool } from './teacher-home.js'

/**
 * In-flight cap for Explore name / metadata / tag / image fan-out.
 * Home's activity pool is 4 (`mapPool` in teacher-home.js). 6 matches the
 * existing tagging-icon chunk and stays inside the 4–8 cap.
 */
export const EXPLORE_FILL_CONCURRENCY = 6

const TAG_DOMAIN = 'tags.knowlearning.systems'

/**
 * One in-flight cap shared by name fill, page detail, and My Content metadata.
 * Separate mapPool(6) calls would otherwise stack.
 */
let exploreSlotsActive = 0
const exploreSlotWaiters = []

function pumpExploreSlots() {
  while (exploreSlotsActive < EXPLORE_FILL_CONCURRENCY && exploreSlotWaiters.length) {
    const start = exploreSlotWaiters.shift()
    exploreSlotsActive += 1
    start()
  }
}

export function exploreSlot(fn) {
  return new Promise((resolve, reject) => {
    exploreSlotWaiters.push(() => {
      Promise.resolve()
        .then(fn)
        .then(resolve, reject)
        .finally(() => {
          exploreSlotsActive -= 1
          pumpExploreSlots()
        })
    })
    pumpExploreSlots()
  })
}

/** One inner array per active category. Empty selections are dropped. */
export function selectedFilterGroups(filters) {
  if (!filters || typeof filters !== 'object') return []
  const groups = []
  for (const value of Object.values(filters)) {
    if (!Array.isArray(value) || !value.length) continue
    const leaves = value.filter(Boolean)
    if (leaves.length) groups.push(leaves)
  }
  return groups
}

/** True when every catalog id already has a tagCache entry (counts are honest). */
export function catalogTagIndexComplete(tagCache, ids) {
  if (!ids?.length || !tagCache) return false
  for (const id of ids) {
    if (!tagCache.has(id)) return false
  }
  return true
}

function targetsFromRows(rows) {
  const out = []
  for (const row of rows || []) {
    const id = row && typeof row === 'object' ? row.target : null
    if (id) out.push(id)
  }
  return out
}

async function intersectionTargets(partition, tags, query) {
  const rows = await query(
    'taggings-intersection',
    [partition, tags],
    TAG_DOMAIN,
  )
  return targetsFromRows(rows)
}

function defaultAgentQuery(name, params, domain) {
  return Agent.query(name, params, domain)
}

/**
 * Ids matching the teacher's tag filters, before the tab clip.
 *
 * At most one leaf per category: one `taggings-intersection` of those leaves
 * (trunk AND). Several leaves in one category: one intersection per leaf,
 * union inside the category, then intersect categories — ui-dev is OR within
 * a category and AND across categories, which a single AND query would drop.
 *
 * Returns the full intersection, not a page. Callers clip to the tab's id list.
 */
export async function fetchTagFilterMatch(partition, groups, query = defaultAgentQuery) {
  if (!partition || !groups?.length) return new Set()
  const normalized = groups
    .map(group => [...group].filter(Boolean))
    .filter(group => group.length)
  if (!normalized.length) return new Set()

  if (normalized.every(group => group.length === 1)) {
    const ids = await intersectionTargets(
      partition,
      normalized.map(group => group[0]),
      query,
    )
    return new Set(ids)
  }

  const unions = []
  for (const leaves of normalized) {
    const lists = await mapPool(
      leaves,
      EXPLORE_FILL_CONCURRENCY,
      leaf => exploreSlot(() => intersectionTargets(partition, [leaf], query)),
    )
    unions.push(new Set(lists.flat()))
  }
  let acc = unions[0]
  for (const next of unions.slice(1)) {
    acc = new Set([...acc].filter(id => next.has(id)))
  }
  return acc
}
