import { matchesStatusFilter } from '@/utils/status-filter.js'

export function isActiveStudent(student) {
  return !student?.archived
}

export function activeStudentsInGroup(groupId, students, store) {
  const memberIds = new Set(store.getters['groups/members'](groupId))
  return students.filter(s => memberIds.has(s.id) && isActiveStudent(s))
}

export function activeStudentCountInGroup(groupId, students, store) {
  return activeStudentsInGroup(groupId, students, store).length
}

/** "{num} student" / "{num} students". unitOnly drops the number for labels next to a count. */
export function formatStudentCount(n, t, { unitOnly = false } = {}) {
  if (!t) throw new Error('formatStudentCount requires t()')
  const count = Number(n)
  const safe = Number.isFinite(count) ? count : 0
  const phrase = t(safe === 1 ? 'n-student' : 'n-students').replace('{num}', String(safe))
  if (!unitOnly) return phrase
  return t(safe === 1 ? 'n-student' : 'n-students').replace('{num}', '').replace(/\s+/g, ' ').trim()
}

export function availableStudentsForStatus(students, groupId, store, statusFilters) {
  const memberIds = new Set(store.getters['groups/members'](groupId))
  return students
    .filter(s => !memberIds.has(s.id))
    .filter(s => matchesStatusFilter(statusFilters, s.archived))
}