import { useStore } from 'vuex'

/**
 * Archive / restore teacher assignments (tag + Agent state).
 */
export function useAssignmentArchive(assignableItemType) {
  const store = useStore()

  async function archiveAssignment(contentId) {
    await store.dispatch('pila_tags/untag', {
      content_id: contentId,
      tag_type: assignableItemType,
    })
    const state = await Agent.state(contentId)
    state.archived = true
    await Agent.synced()
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

  return { archiveAssignment, restoreAssignment }
}