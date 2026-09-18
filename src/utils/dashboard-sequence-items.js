import { normalizeAssignmentContent } from './assignment-content.js'
import { normalizeSequenceItems } from './sequence-items.js'

/** Primary content id for dashboards (sequence / module) from assignment Agent state. */
export function primaryAssignmentContentId(assignmentState) {
  const ids = normalizeAssignmentContent(assignmentState?.content)
  return ids[0] || null
}

/** Item ids for the live-monitoring table (array or legacy object map). */
export async function loadDashboardSequenceItems(contentId) {
  if (!contentId) return []
  try {
    const state = await Agent.state(contentId)
    return normalizeSequenceItems(state?.items)
  } catch (e) {
    console.warn('[dashboard] failed to load sequence items', contentId, e)
    return []
  }
}

/**
 * Union live-monitoring columns across every assignment content id (UIUX-237).
 * A playable leaf with no `items` becomes a column. Duplicate item ids appear once.
 * `groups` keep per-content item lists (original order) so performance watches
 * can merge by item id, not by concatenated index.
 */
export async function loadAssignmentDashboardSequenceItems(assignmentState) {
  const contentIds = normalizeAssignmentContent(assignmentState?.content)
  const seen = new Set()
  const items = []
  const groups = []

  for (const contentId of contentIds) {
    if (!contentId) continue
    let childIds = await loadDashboardSequenceItems(contentId)
    if (!childIds.length) childIds = [contentId]
    groups.push({ sequenceId: contentId, itemIds: childIds })
    for (const id of childIds) {
      if (!id || seen.has(id)) continue
      seen.add(id)
      items.push(id)
    }
  }

  return { items, groups }
}