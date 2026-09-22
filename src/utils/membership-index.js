/**
 * O(1) class-membership indexes derived from group_member records.
 * Non-archived only (matches groups/belongs and groups/members).
 * Do not persist — rebuild from state.members.
 */

export function createMembershipIndex() {
  return {
    byGroup: new Map(),
    byUser: new Map(),
  }
}

/**
 * @param {Iterable<{ user_id?: string, group_id?: string, archived?: boolean }> | Record<string, { user_id?: string, group_id?: string, archived?: boolean }>} members
 */
export function rebuildMembershipIndex(members) {
  const index = createMembershipIndex()
  if (members == null) return index
  const records = Array.isArray(members) ? members : Object.values(members)
  for (const m of records) {
    if (!m || m.archived) continue
    addMembershipPair(index.byGroup, index.byUser, m.user_id, m.group_id)
  }
  return index
}

export function addMembershipPair(byGroup, byUser, userId, groupId) {
  if (!userId || !groupId) return
  let users = byGroup.get(groupId)
  if (!users) {
    users = new Set()
    byGroup.set(groupId, users)
  }
  users.add(userId)
  let groups = byUser.get(userId)
  if (!groups) {
    groups = new Set()
    byUser.set(userId, groups)
  }
  groups.add(groupId)
}

export function removeMembershipPair(byGroup, byUser, userId, groupId) {
  if (!userId || !groupId) return
  const users = byGroup.get(groupId)
  if (users) {
    users.delete(userId)
    if (!users.size) byGroup.delete(groupId)
  }
  const groups = byUser.get(userId)
  if (groups) {
    groups.delete(groupId)
    if (!groups.size) byUser.delete(userId)
  }
}

export function belongsInIndex(byUser, userId, groupId) {
  return byUser?.get(userId)?.has(groupId) === true
}

export function membersInIndex(byGroup, groupId) {
  const users = byGroup?.get(groupId)
  return users ? [...users] : []
}
