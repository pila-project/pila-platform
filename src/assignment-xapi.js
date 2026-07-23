import { validate as isUUID } from 'uuid'

export function assignmentXapiStatement(user, sequenceId, assignedClassIds) {
  if (!isUUID(sequenceId)) return null

  return {
    actor: user,
    authority: user,
    verb: 'assigned',
    object: sequenceId,
    extensions: {
      assignedClassIds: [...new Set(assignedClassIds)].sort()
    }
  }
}
