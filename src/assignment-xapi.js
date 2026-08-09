import { validate as isUUID } from 'uuid'

export function countAssignedStudents(assignedClassIds, membersForClass) {
  return new Set(
    assignedClassIds.flatMap(classId => membersForClass(classId))
  ).size
}

export function assignmentXapiStatement(
  user,
  sequenceId,
  assignedClassIds,
  numberOfStudentsAssigned
) {
  if (!isUUID(sequenceId)) return null

  return {
    actor: user,
    authority: user,
    verb: 'assigned',
    object: sequenceId,
    extensions: {
      assignedClassIds: [...new Set(assignedClassIds)].sort(),
      numberOfStudentsAssigned
    }
  }
}
