/**
 * Teacher Admin student table rows.
 * Pure so the EDU-PILA path (joined students present at first paint) is testable
 * and does not depend on Vue declaration order.
 */

export function classGroupIdsForStudent(studentId, classGroupIds, belongs) {
  return (classGroupIds || []).filter(gid => belongs(studentId, gid))
}

/**
 * Invert S×G belongs scans: walk each class's members once.
 * @param {string[]} classGroupIds
 * @param {(groupId: string) => string[]} membersForGroup
 * @returns {Map<string, string[]>}
 */
export function groupIdsByStudentFromMembers(classGroupIds, membersForGroup) {
  const byStudent = new Map()
  for (const gid of classGroupIds || []) {
    for (const uid of membersForGroup(gid) || []) {
      if (!uid) continue
      let list = byStudent.get(uid)
      if (!list) {
        list = []
        byStudent.set(uid, list)
      }
      if (!list.includes(gid)) list.push(gid)
    }
  }
  return byStudent
}

/**
 * @param {object} opts
 * @param {string[]} opts.createdUserIds - teacher-created users (Agent `users` keys)
 * @param {string[]} opts.joinedStudentIds - students who added this teacher (myStudents)
 * @param {string[]} opts.classGroupIds - active class group ids
 * @param {(studentId: string, groupId: string) => boolean} [opts.belongs]
 * @param {(groupId: string) => string[]} [opts.membersForGroup]
 * @param {(groupId: string) => string} [opts.getGroupName]
 * @param {Record<string, { archived?: boolean, grade?: string }>} [opts.users]
 * @param {(id: string) => string} [opts.getDisplayName]
 */
export function buildTeacherStudentRows({
  createdUserIds = [],
  joinedStudentIds = [],
  classGroupIds = [],
  belongs,
  membersForGroup,
  getGroupName,
  users = {},
  getDisplayName,
} = {}) {
  if (typeof membersForGroup !== 'function' && typeof belongs !== 'function') {
    throw new Error('buildTeacherStudentRows requires belongs() or membersForGroup()')
  }
  const mine = createdUserIds || []
  const extra = (joinedStudentIds || []).filter(id => !mine.includes(id))
  const ids = [...mine, ...extra]
  const inverted = typeof membersForGroup === 'function'
    ? groupIdsByStudentFromMembers(classGroupIds, membersForGroup)
    : null
  return ids.map(id => {
    const groupIds = inverted
      ? (inverted.get(id) || [])
      : classGroupIdsForStudent(id, classGroupIds, belongs)
    const groupNames = groupIds
      .map(gid => getGroupName?.(gid) || '')
      .filter(Boolean)
      .join(', ')
    const rec = users[id]
    return {
      id,
      displayName: getDisplayName?.(id) || '…',
      archived: !!rec?.archived,
      grade: rec?.grade || '',
      groupNames,
      groupIds,
    }
  })
}
