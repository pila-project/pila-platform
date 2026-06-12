import { useStore } from 'vuex'

/**
 * Archive / restore teacher assignments (tag + Agent state).
 * "Archive for me" hides from the teacher list only.
 * "Archive for all" also unassigns every group so students no longer see it.
 */
export function useAssignmentArchive(assignableItemType) {
  const store = useStore()

  function assignmentIdForGroup(itemId, assignmentType, groupId) {
    const assignmentIds = store.getters['assignments/assignments'](itemId, assignmentType)
    return assignmentIds.find(id => store.getters['assignments/get'](id)?.group_id === groupId)
  }

  async function unassignAllGroups(itemId, assignmentType) {
    const groupIds = store.getters['assignments/assignedGroups'](itemId, assignmentType, false)
    for (const groupId of groupIds) {
      const assignmentId = assignmentIdForGroup(itemId, assignmentType, groupId)
      if (assignmentId) await store.dispatch('assignments/unassign', assignmentId)
    }
  }

  async function archiveAssignment(contentId) {
    await store.dispatch('pila_tags/untag', {
      content_id: contentId,
      tag_type: assignableItemType,
    })
    const state = await Agent.state(contentId)
    state.archived = true
    await Agent.synced()
  }

  async function archiveAssignmentForAll(contentId, assignmentType) {
    await unassignAllGroups(contentId, assignmentType)
    await archiveAssignment(contentId)
  }

  async function restoreAssignment(contentId) {
    await store.dispatch('pila_tags/tag', {
      content_id: contentId,
      tag_type: assignableItemType,
    })
    const state = await Agent.state(contentId)
    state.archived = false
    await Agent.synced()
  }

  return { archiveAssignment, archiveAssignmentForAll, restoreAssignment }
}