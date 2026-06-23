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

export function availableStudentsForStatus(students, groupId, store, statusFilters) {
  const memberIds = new Set(store.getters['groups/members'](groupId))
  return students
    .filter(s => !memberIds.has(s.id))
    .filter(s => matchesStatusFilter(statusFilters, s.archived))
}