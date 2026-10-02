import { computed, ref } from 'vue'

/**
 * This teacher's hidden Explore items (sequences and other My content).
 * The scope name stays explore-sequence-archive so ids archived before
 * activities were included are still hidden. This does not edit assignments.
 */
const ARCHIVE_SCOPE = 'explore-sequence-archive'

export const exploreArchivedIds = ref([])
export const exploreArchivedIdSet = computed(() => new Set(exploreArchivedIds.value))

let refreshGeneration = 0

export async function loadExploreArchivedSequenceIds() {
  const state = await Agent.state(ARCHIVE_SCOPE)
  const ids = new Set()
  if (Array.isArray(state?.archivedIds)) {
    for (const id of state.archivedIds) {
      if (id) ids.add(id)
    }
  }
  return ids
}

export async function refreshExploreArchivedIds() {
  const ticket = ++refreshGeneration
  const ids = await loadExploreArchivedSequenceIds()
  if (ticket !== refreshGeneration) return ids
  exploreArchivedIds.value = [...ids]
  return ids
}

function rememberArchivedId(id, archived) {
  refreshGeneration += 1
  const next = new Set(exploreArchivedIds.value)
  if (archived) next.add(id)
  else next.delete(id)
  exploreArchivedIds.value = [...next]
}

/**
 * @param {string} contentId
 * @param {boolean} archived
 */
export async function setExploreSequenceArchived(contentId, archived) {
  if (!contentId) return

  const state = await Agent.state(ARCHIVE_SCOPE)
  let ids = Array.isArray(state.archivedIds) ? [...state.archivedIds] : []

  if (archived) {
    if (!ids.includes(contentId)) ids.push(contentId)
  } else {
    ids = ids.filter((id) => id !== contentId)
  }

  state.archivedIds = ids
  await Agent.synced()
  rememberArchivedId(contentId, archived)
}

export function isSequenceArchived(id, archivedIds) {
  return !!id && archivedIds?.has(id)
}

/** My content still on the active library. Catalog ids and archived ids are left out. */
export function archivableMyContentIds(selectedIds, myContentIds, archivedIds) {
  const mine = myContentIds instanceof Set ? myContentIds : new Set(myContentIds || [])
  const archived = archivedIds instanceof Set ? archivedIds : new Set(archivedIds || [])
  const out = []
  const seen = new Set()
  for (const id of selectedIds || []) {
    if (!id || seen.has(id) || !mine.has(id) || archived.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

/** Library pickers: drop this teacher's archived items. Reads exploreArchivedIdSet. */
export function withoutExploreArchived(list) {
  const archived = exploreArchivedIdSet.value
  if (!archived.size) return list
  return (list || []).filter((id) => !archived.has(id))
}