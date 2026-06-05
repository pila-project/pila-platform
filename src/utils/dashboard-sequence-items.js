import { normalizeAssignmentContent } from '@/utils/assignment-content.js'
import { normalizeSequenceItems } from '@/utils/sequence-items.js'

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