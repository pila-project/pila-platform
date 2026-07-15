export const ADMIN_TEACHER_ASSIGNMENT_TYPE = 'application/json;type=admin_teacher_assignment'

export const ADMIN_TEACHER_GRANT_FIELDS = [
  'teacher_id',
  'content_id',
  'starts_at',
  'ends_at',
  'archived'
]

const MUTABLE_GRANT_FIELDS = [
  'starts_at',
  'ends_at',
  'archived'
]

export function adminTeacherGrantScope(teacherId, contentId) {
  return [
    'admin-teacher-assignment:v1',
    encodeURIComponent(teacherId),
    encodeURIComponent(contentId)
  ].join(':')
}

export function adminTeacherTaskNamespace(teacherId, contentId) {
  return [
    'admin-teacher-task:v1',
    encodeURIComponent(teacherId),
    encodeURIComponent(contentId)
  ].join(':')
}

export function mergeAdminTeacherGrant(winner, teacherId, contentId, changes = {}) {
  const nextGrant = {
    teacher_id: teacherId,
    content_id: contentId,
    starts_at: winner?.starts_at ?? null,
    ends_at: winner?.ends_at ?? null,
    archived: winner ? winner.archived !== false : true
  }

  MUTABLE_GRANT_FIELDS.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(changes, field) && changes[field] !== undefined) {
      nextGrant[field] = changes[field]
    }
  })

  nextGrant.archived = !!nextGrant.archived
  return nextGrant
}

export function applyAdminTeacherGrantState(state, grant) {
  ADMIN_TEACHER_GRANT_FIELDS.forEach(field => {
    const isEmptyScheduleBound = ['starts_at', 'ends_at'].includes(field)
      && grant[field] == null

    if (isEmptyScheduleBound) {
      if (Object.prototype.hasOwnProperty.call(state, field)) delete state[field]
    } else {
      state[field] = grant[field]
    }
  })
}

export async function writeAdminTeacherGrant(agent, grant) {
  const scope = adminTeacherGrantScope(grant.teacher_id, grant.content_id)
  const state = {}
  applyAdminTeacherGrantState(state, grant)

  // Send a full assertion even when its values match this admin's previous
  // assertion. A real interaction must occur for metadata.updated to advance.
  await agent.interact(scope, [
    {
      op: 'add',
      path: ['active_type'],
      value: ADMIN_TEACHER_ASSIGNMENT_TYPE
    },
    {
      op: 'add',
      path: ['active'],
      value: state
    }
  ])
}

export async function adminTeacherGrantsForContent(agent, contentId) {
  const grants = await agent.query('admin-assignments-for-content', [contentId])
  if (!Array.isArray(grants)) {
    throw new Error('The assignment query returned an invalid response.')
  }
  return grants
}

export async function isAdminContentTagged(agent, partition, tagId, contentId) {
  const taggings = await agent.query(
    'tagging-for-target',
    [partition, tagId, contentId],
    'tags.knowlearning.systems'
  )
  if (!Array.isArray(taggings)) {
    throw new Error('The content availability query returned an invalid response.')
  }
  return taggings.length > 0
}

export async function waitForAdminContentTag(
  agent,
  partition,
  tagId,
  contentId,
  expectedTagged,
  { timeout = 10_000, interval = 100 } = {}
) {
  const deadline = Date.now() + timeout

  do {
    const tagged = await isAdminContentTagged(agent, partition, tagId, contentId)
    if (tagged === expectedTagged) return
    await new Promise(resolve => setTimeout(resolve, interval))
  } while (Date.now() < deadline)

  const expectedState = expectedTagged ? 'appear' : 'be removed'
  throw new Error(`Timed out waiting for the admin content tag to ${expectedState}.`)
}
