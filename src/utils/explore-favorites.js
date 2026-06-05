const FAVORITES_STATE_ID = 'my-favorites'

/**
 * Teacher Explore favorites — persisted Agent state (content items + sequences).
 * @returns {{ state: object, ids: Set<string> }}
 */
export async function loadExploreFavorites() {
  const state = await Agent.state(FAVORITES_STATE_ID)
  const ids = new Set()
  if (Array.isArray(state?.items)) {
    for (const id of state.items) {
      if (id) ids.add(id)
    }
  }
  return { state, ids }
}

/** @param {Set<string>} ids */
export function favoriteIdsToArray(ids) {
  return [...ids]
}

/**
 * Toggle favorite for any explore content id (item or sequence).
 * @param {string} id
 * @param {Set<string>} ids — reactive Set in the UI layer
 * @param {object|null} state — Agent state object from loadExploreFavorites
 */
export async function toggleExploreFavorite(id, ids, state) {
  if (!id) return state

  let agentState = state
  if (!agentState) {
    agentState = await Agent.state(FAVORITES_STATE_ID)
  }
  if (!Array.isArray(agentState.items)) {
    agentState.items = []
  }

  if (ids.has(id)) {
    ids.delete(id)
  } else {
    ids.add(id)
  }
  agentState.items = favoriteIdsToArray(ids)
  await Agent.synced()
  return agentState
}

export function isExploreFavorite(id, ids) {
  return !!id && ids?.has(id)
}