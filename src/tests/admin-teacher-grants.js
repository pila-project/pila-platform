import {
  ADMIN_TEACHER_ASSIGNMENT_TYPE,
  ADMIN_TEACHER_GRANT_FIELDS,
  adminTeacherGrantsForContent,
  applyAdminTeacherGrantState,
  adminTeacherGrantScope,
  adminTeacherTaskNamespace,
  isAdminContentTagged,
  mergeAdminTeacherGrant,
  waitForAdminContentTag,
  writeAdminTeacherGrant
} from '../admin-teacher-grants.js'
import setTagging from '../set-tagging.js'
import { ADMIN_CONTENT_TAG } from '../constants.js'

export default function adminTeacherGrantTests(store) {
  describe('Admin teacher grants', function () {
    const winner = {
      id: 'query-row-id',
      teacher_id: 'teacher-a',
      content_id: 'content-a',
      starts_at: '2026-07-01T10:00:00.000Z',
      ends_at: '2026-07-31T10:00:00.000Z',
      archived: false,
      assigned_by: 'admin-a',
      updated: '2026-07-01T09:00:00.000Z'
    }

    it('copies persisted winner fields and overlays only requested changes', function () {
      const merged = mergeAdminTeacherGrant(
        winner,
        winner.teacher_id,
        winner.content_id,
        { ends_at: '2026-08-31T10:00:00.000Z' }
      )

      expect(merged).to.deep.equal({
        teacher_id: winner.teacher_id,
        content_id: winner.content_id,
        starts_at: winner.starts_at,
        ends_at: '2026-08-31T10:00:00.000Z',
        archived: false
      })
      expect(Object.keys(merged)).to.have.members(ADMIN_TEACHER_GRANT_FIELDS)
    })

    it('preserves scheduling when another admin cancels a grant', function () {
      const merged = mergeAdminTeacherGrant(
        winner,
        winner.teacher_id,
        winner.content_id,
        { archived: true }
      )

      expect(merged.starts_at).to.equal(winner.starts_at)
      expect(merged.ends_at).to.equal(winner.ends_at)
      expect(merged.archived).to.equal(true)
    })

    it('does not allow changes to move a grant to another pair', function () {
      const merged = mergeAdminTeacherGrant(
        winner,
        winner.teacher_id,
        winner.content_id,
        {
          teacher_id: 'teacher-b',
          content_id: 'content-b',
          archived: true
        }
      )

      expect(merged.teacher_id).to.equal(winner.teacher_id)
      expect(merged.content_id).to.equal(winner.content_id)
    })

    it('treats an incomplete winner as inactive until explicitly assigned', function () {
      const merged = mergeAdminTeacherGrant(
        { teacher_id: 'teacher-a', content_id: 'content-a' },
        'teacher-a',
        'content-a'
      )

      expect(merged.archived).to.equal(true)
    })

    it('removes empty schedule bounds instead of persisting null timestamps', function () {
      const state = {
        teacher_id: 'teacher-a',
        content_id: 'content-a',
        starts_at: '2026-07-01T10:00:00.000Z',
        ends_at: '2026-07-31T10:00:00.000Z',
        archived: false
      }

      applyAdminTeacherGrantState(state, {
        teacher_id: 'teacher-a',
        content_id: 'content-a',
        starts_at: null,
        ends_at: null,
        archived: false
      })

      expect(state).to.deep.equal({
        teacher_id: 'teacher-a',
        content_id: 'content-a',
        archived: false
      })
    })

    it('uses an owner-scoped, delimited state name', function () {
      expect(adminTeacherGrantScope('teacher/a', 'https://example.com/content'))
        .to.equal('admin-teacher-assignment:v1:teacher%2Fa:https%3A%2F%2Fexample.com%2Fcontent')
    })

    it('uses a stable teacher/content namespace for task state', function () {
      expect(adminTeacherTaskNamespace('teacher/a', 'https://example.com/content'))
        .to.equal('admin-teacher-task:v1:teacher%2Fa:https%3A%2F%2Fexample.com%2Fcontent')
    })

    it('writes a grant to its owner-scoped state', async function () {
      const interactions = []
      const agent = {
        interact: async (scope, patch) => interactions.push({ scope, patch })
      }

      await writeAdminTeacherGrant(agent, {
        teacher_id: 'teacher-a',
        content_id: 'content-a',
        starts_at: null,
        ends_at: '2026-07-31T10:00:00.000Z',
        archived: false
      })

      expect(interactions).to.deep.equal([{
        scope: 'admin-teacher-assignment:v1:teacher-a:content-a',
        patch: [
          {
            op: 'add',
            path: ['active_type'],
            value: ADMIN_TEACHER_ASSIGNMENT_TYPE
          },
          {
            op: 'add',
            path: ['active'],
            value: {
              teacher_id: 'teacher-a',
              content_id: 'content-a',
              ends_at: '2026-07-31T10:00:00.000Z',
              archived: false
            }
          }
        ]
      }])
    })

    it('rejects malformed assignment query results', async function () {
      const agent = { query: async () => null }
      let error = null
      try {
        await adminTeacherGrantsForContent(agent, 'content-a')
      } catch (caughtError) {
        error = caughtError
      }
      expect(error?.message).to.equal('The assignment query returned an invalid response.')
    })

    it('waits for authoritative content tag propagation', async function () {
      let queryCount = 0
      const agent = {
        query: async () => (++queryCount === 1 ? [{}] : [])
      }

      await waitForAdminContentTag(
        agent,
        'partition-a',
        'tag-a',
        'content-a',
        false,
        { timeout: 100, interval: 0 }
      )

      expect(queryCount).to.equal(2)
      expect(await isAdminContentTagged(
        { query: async () => [{}] },
        'partition-a',
        'tag-a',
        'content-a'
      )).to.equal(true)
    })
  })

  describe('Admin teacher grant queries', function () {
    this.timeout(30_000)

    let teacherId
    let contentId

    before(async function () {
      const environment = await TeacherAgent.environment()
      teacherId = environment.auth.user
      contentId = Agent.uuid()
      await setTagging(
        { tag: ADMIN_CONTENT_TAG, target: contentId, value: true },
        store.getters.tagPartition
      )
      await waitForAdminContentTag(
        Agent,
        store.getters.tagPartition,
        ADMIN_CONTENT_TAG,
        contentId,
        true
      )
    })

    after(async function () {
      await setTagging(
        { tag: ADMIN_CONTENT_TAG, target: contentId, value: null },
        store.getters.tagPartition
      )
      await waitForAdminContentTag(
        Agent,
        store.getters.tagPartition,
        ADMIN_CONTENT_TAG,
        contentId,
        false
      )
    })

    it('ignores assignment rows that are not owned by an admin', async function () {
      TeacherAgent.create({
        active_type: ADMIN_TEACHER_ASSIGNMENT_TYPE,
        active: {
          teacher_id: teacherId,
          content_id: contentId,
          archived: false
        }
      })
      await TeacherAgent.synced()

      const [teacherRows, adminRows, unauthorizedAdminRows] = await Promise.all([
        TeacherAgent.query('admin-assigned-to-me'),
        Agent.query('admin-assignments-for-content', [contentId]),
        TeacherAgent.query('admin-assignments-for-content', [contentId])
      ])

      expect(rowsForContent(teacherRows, contentId)).to.be.empty
      expect(rowsForContent(adminRows, contentId)).to.be.empty
      expect(rowsForContent(unauthorizedAdminRows, contentId)).to.be.empty
    })

    it('returns an active admin-owned assignment to its teacher', async function () {
      const activeId = Agent.create({
        active_type: ADMIN_TEACHER_ASSIGNMENT_TYPE,
        active: {
          teacher_id: teacherId,
          content_id: contentId,
          archived: false
        }
      })
      await Agent.synced()

      const teacherRows = await waitForRows(
        () => TeacherAgent.query('admin-assigned-to-me'),
        rows => rowsForContent(rows, contentId).some(row => row.id === activeId)
      )

      expect(rowsForContent(teacherRows, contentId)).to.have.length(1)
    })

    it('selects the newest archived row before filtering teacher results', async function () {
      // Keep the metadata timestamps distinct so this exercises updated ordering,
      // rather than the deterministic id tie-breaker.
      await delay(10)
      const archivedId = Agent.create({
        active_type: ADMIN_TEACHER_ASSIGNMENT_TYPE,
        active: {
          teacher_id: teacherId,
          content_id: contentId,
          archived: true
        }
      })
      await Agent.synced()

      const adminRows = await waitForRows(
        () => Agent.query('admin-assignments-for-content', [contentId]),
        rows => rowsForContent(rows, contentId).some(row => row.id === archivedId)
      )
      const teacherRows = await waitForRows(
        () => TeacherAgent.query('admin-assigned-to-me'),
        rows => rowsForContent(rows, contentId).length === 0
      )

      const contentAdminRows = rowsForContent(adminRows, contentId)
      expect(contentAdminRows).to.have.length(1)
      expect(contentAdminRows[0]).to.include({ id: archivedId, archived: true })
      expect(rowsForContent(teacherRows, contentId)).to.be.empty
    })

    it('hides and restores an active winner with its admin content tag', async function () {
      await delay(10)
      const activeId = Agent.create({
        active_type: ADMIN_TEACHER_ASSIGNMENT_TYPE,
        active: {
          teacher_id: teacherId,
          content_id: contentId,
          archived: false
        }
      })
      await Agent.synced()

      const visibleTeacherRows = await waitForRows(
        () => TeacherAgent.query('admin-assigned-to-me'),
        rows => rowsForContent(rows, contentId).some(row => row.id === activeId)
      )
      expect(rowsForContent(visibleTeacherRows, contentId).some(
        row => row.id === activeId
      )).to.equal(true)
      await setTagging(
        { tag: ADMIN_CONTENT_TAG, target: contentId, value: null },
        store.getters.tagPartition
      )
      await waitForAdminContentTag(
        Agent,
        store.getters.tagPartition,
        ADMIN_CONTENT_TAG,
        contentId,
        false
      )

      const [teacherRows, adminRows] = await Promise.all([
        TeacherAgent.query('admin-assigned-to-me'),
        Agent.query('admin-assignments-for-content', [contentId])
      ])
      const contentAdminRows = rowsForContent(adminRows, contentId)

      expect(rowsForContent(teacherRows, contentId)).to.be.empty
      expect(contentAdminRows).to.have.length(1)
      expect(contentAdminRows[0]).to.include({ id: activeId, archived: false })

      await setTagging(
        { tag: ADMIN_CONTENT_TAG, target: contentId, value: true },
        store.getters.tagPartition
      )
      await waitForAdminContentTag(
        Agent,
        store.getters.tagPartition,
        ADMIN_CONTENT_TAG,
        contentId,
        true
      )
      const restoredTeacherRows = await waitForRows(
        () => TeacherAgent.query('admin-assigned-to-me'),
        rows => rowsForContent(rows, contentId).some(row => row.id === activeId)
      )
      expect(rowsForContent(restoredTeacherRows, contentId).some(
        row => row.id === activeId
      )).to.equal(true)
    })
  })
}

function rowsForContent(rows, contentId) {
  return (Array.isArray(rows) ? rows : [])
    .filter(row => row.content_id === contentId)
}

async function waitForRows(query, predicate, timeout = 5_000) {
  const deadline = Date.now() + timeout
  let rows = []

  do {
    rows = await query()
    if (predicate(rows)) return rows
    await delay(100)
  } while (Date.now() < deadline)

  return rows
}

function delay(milliseconds) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds))
}
