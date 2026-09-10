/**
 * Teacher Admin student table rows.
 * Pure so the EDU-PILA path (joined students present at first paint) is testable
 * and does not depend on Vue declaration order.
 */

export function classGroupIdsForStudent(studentId, classGroupIds, belongs) {
  return (classGroupIds || []).filter(gid => belongs(studentId, gid))
}

/**
 * @param {object} opts
 * @param {string[]} opts.createdUserIds - teacher-created users (Agent `users` keys)
 * @param {string[]} opts.joinedStudentIds - students who added this teacher (myStudents)
 * @param {string[]} opts.classGroupIds - active class group ids
 * @param {(studentId: string, groupId: string) => boolean} opts.belongs
 * @param {(groupId: string) => string} [opts.getGroupName]
 * @param {Record<string, { archived?: boolean, grade?: string }>} [opts.users]
 * @param {(id: string) => string} [opts.getDisplayName]
 */
export function buildTeacherStudentRows({
  createdUserIds = [],
  joinedStudentIds = [],
  classGroupIds = [],
  belongs,
  getGroupName,
  users = {},
  getDisplayName,
} = {}) {
  if (typeof belongs !== 'function') throw new Error('buildTeacherStudentRows requires belongs()')
  const mine = createdUserIds || []
  const extra = (joinedStudentIds || []).filter(id => !mine.includes(id))
  const ids = [...mine, ...extra]
  return ids.map(id => {
    const groupIds = classGroupIdsForStudent(id, classGroupIds, belongs)
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
