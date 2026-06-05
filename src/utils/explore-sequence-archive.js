/** Teacher Explore — archived sequence ids (user Agent scope, same pattern as my-favorites). */
const ARCHIVE_SCOPE = 'explore-sequence-archive'

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

/**
 * @param {string} sequenceId
 * @param {boolean} archived
 */
export async function setExploreSequenceArchived(sequenceId, archived) {
  if (!sequenceId) return

  const state = await Agent.state(ARCHIVE_SCOPE)
  let ids = Array.isArray(state.archivedIds) ? [...state.archivedIds] : []

  if (archived) {
    if (!ids.includes(sequenceId)) ids.push(sequenceId)
  } else {
    ids = ids.filter((id) => id !== sequenceId)
  }

  state.archivedIds = ids
  await Agent.synced()
}

export function isSequenceArchived(id, archivedIds) {
  return !!id && archivedIds?.has(id)
}