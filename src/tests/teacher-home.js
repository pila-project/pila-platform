import {
  CURRENT_ASSIGNMENTS_PREVIEW_LIMIT,
  RECENT_ACTIVITY_LIMIT,
  HOME_LAYOUT_KEY,
  DEFAULT_HOME_LAYOUT,
  ASSIGNMENT_UPDATE_GRACE_MS,
  parseHomeLayout,
  greetingFirstName,
  formatWelcomeBack,
  currentAssignmentPreview,
  buildRecentActivity,
  relativeTimeFromNow,
  getAssignmentDueAt,
  nextAssignmentDueAt,
  toEpochMs,
  parseActivitySequenceCache,
  newestByCreated,
  activitySequencesStorageKey,
  HOME_ACTIVITY_SEQUENCES_KEY,
  ACTIVITY_PREFETCH_LIMIT,
  mapPool,
} from '../utils/teacher-home.js'
import { ASSIGNMENT_STATUS } from '../utils/assignment-status.js'

function t(slug) {
  const pack = {
    'n-minutes-ago': '{n} minutes ago',
    'n-hours-ago': '{n} hours ago',
    'n-days-ago': '{n} days ago',
    'created-assignment': 'Created Assignment',
    'updated-assignment': 'Updated Assignment',
    'created-group': 'Created Group',
    'created-sequence': 'Created Sequence',
    'deadline-passed': 'Deadline Passed',
    untitled: 'Untitled',
  }
  return pack[slug] || slug
}

export default function teacherHomeTests() {
  describe('teacher-home model (shipped src/utils/teacher-home.js)', function () {
    it('parses dashboard layout with all sections on by default', function () {
      expect(parseHomeLayout(null)).to.deep.equal(DEFAULT_HOME_LAYOUT)
      expect(parseHomeLayout({ quickLinks: false, recentActivity: true })).to.deep.equal({
        quickLinks: false,
        recentActivity: true,
        currentAssignments: true,
      })
      expect(HOME_LAYOUT_KEY).to.equal('pila-home-layout')
    })

    it('formats greeting from the first name token', function () {
      expect(greetingFirstName('Ms. Rodriguez', 'Teacher')).to.equal('Ms.')
      expect(greetingFirstName('Jennifer Smith', 'Teacher')).to.equal('Jennifer')
      expect(greetingFirstName('  ', 'Teacher')).to.equal('Teacher')
      expect(formatWelcomeBack('Welcome back, {name}', 'Jennifer')).to.equal('Welcome back, Jennifer')
    })

    it('previews current assignments newest-first with a hard limit', function () {
      const updated = {
        old: 100,
        mid: 200,
        new: 300,
        extra: 400,
      }
      const preview = currentAssignmentPreview(
        ['old', 'extra', 'mid', 'new'],
        id => updated[id],
        CURRENT_ASSIGNMENTS_PREVIEW_LIMIT,
      )
      expect(preview.map(r => r.id)).to.deep.equal(['extra', 'new', 'mid'])
    })

    it('parses assignment due dates at local midnight when time is omitted', function () {
      expect(getAssignmentDueAt({ dueDate: '2026-08-20' })).to.equal(
        new Date('2026-08-20T00:00:00').getTime(),
      )
      expect(getAssignmentDueAt({ dueDate: '2026-08-20', dueTime: '15:30' })).to.equal(
        new Date('2026-08-20T15:30:00').getTime(),
      )
      expect(getAssignmentDueAt({})).to.equal(0)
      expect(toEpochMs('2026-08-20T12:00:00.000Z')).to.equal(Date.parse('2026-08-20T12:00:00.000Z'))
    })

    it('finds the next future published due instant', function () {
      const now = Date.parse('2026-08-23T12:00:00')
      const next = nextAssignmentDueAt(
        [
          { status: ASSIGNMENT_STATUS.PUBLISHED, dueDate: '2026-08-20' },
          { status: ASSIGNMENT_STATUS.PUBLISHED, dueDate: '2026-08-24' },
          { status: ASSIGNMENT_STATUS.DRAFT, dueDate: '2026-08-23' },
          { status: ASSIGNMENT_STATUS.PUBLISHED, dueDate: '2026-08-25' },
        ],
        now,
      )
      expect(next).to.equal(new Date('2026-08-24T00:00:00').getTime())
    })

    it('builds a derived recency feed from groups, assignments, sequences, and deadlines', function () {
      const now = Date.parse('2026-08-23T12:00:00')
      const items = buildRecentActivity({
        assignments: [
          {
            id: 'week3',
            name: 'Week 3 quiz',
            created: now - 48 * 3600000,
            updated: now - 46 * 3600000,
            status: ASSIGNMENT_STATUS.PUBLISHED,
          },
          {
            id: 'week2',
            name: 'Week 2 quiz',
            created: now - 10 * 24 * 3600000,
            updated: now - 9 * 24 * 3600000,
            dueAt: now - 24 * 3600000,
            status: ASSIGNMENT_STATUS.PUBLISHED,
          },
        ],
        groups: [
          { id: 'g1', name: 'Year 8A', created: now - 50 * 3600000 },
        ],
        sequences: [
          { id: 's1', name: 'Fractions pack', created: now - 49 * 3600000 },
        ],
        now,
        t,
      })
      expect(items.map(i => `${i.kind}:${i.meta}`)).to.deep.equal([
        'deadline-passed:Week 2 quiz',
        'updated-assignment:Week 3 quiz',
        'created-sequence:Fractions pack',
        'created-group:Year 8A',
      ])
      expect(items[0].when).to.equal('1 days ago')
      expect(items[0].icon).to.equal('calendar-clock')
      expect(items).to.have.length(RECENT_ACTIVITY_LIMIT)
    })

    it('treats near-create assignment writes as created, not updated', function () {
      const now = Date.parse('2026-08-23T12:00:00Z')
      const created = now - 3600000
      const items = buildRecentActivity({
        assignments: [{
          id: 'a1',
          name: 'Quiz',
          created,
          updated: created + ASSIGNMENT_UPDATE_GRACE_MS,
          status: ASSIGNMENT_STATUS.DRAFT,
        }],
        now,
        t,
      })
      expect(items).to.have.length(1)
      expect(items[0].kind).to.equal('created-assignment')
      expect(items[0].title).to.equal('Created Assignment')
    })

    it('does not emit deadline-passed for drafts', function () {
      const now = Date.parse('2026-08-23T12:00:00')
      const items = buildRecentActivity({
        assignments: [{
          id: 'draft',
          name: 'Draft quiz',
          created: now - 5 * 3600000,
          dueDate: '2026-08-20',
          status: ASSIGNMENT_STATUS.DRAFT,
        }],
        now,
        t,
      })
      expect(items.map(i => i.kind)).to.deep.equal(['created-assignment'])
    })

    it('parses and ranks cached sequence snapshots without network', function () {
      expect(activitySequencesStorageKey('u1')).to.equal(`${HOME_ACTIVITY_SEQUENCES_KEY}:u1`)
      expect(parseActivitySequenceCache(null)).to.deep.equal([])
      expect(parseActivitySequenceCache([{ id: 's1', name: 'Fractions pack', created: 50 }, { skip: true }])).to.deep.equal([
        { id: 's1', name: 'Fractions pack', created: 50 },
      ])
      const newest = newestByCreated(
        [
          { id: 'old', created: 1 },
          { id: 'new', created: 9 },
          { id: 'mid', created: 5 },
        ],
        2,
      )
      expect(newest.map(r => r.id)).to.deep.equal(['new', 'mid'])
      expect(ACTIVITY_PREFETCH_LIMIT).to.equal(8)
    })

    it('maps a bounded worker pool in order', async function () {
      const seen = []
      const out = await mapPool([3, 1, 2], 2, async (n) => {
        seen.push(n)
        return n * 10
      })
      expect(out).to.deep.equal([30, 10, 20])
      expect(seen).to.have.members([3, 1, 2])
    })

    it('lets one published assignment contribute both an update and a passed deadline', function () {
      const now = Date.parse('2026-08-23T12:00:00')
      const items = buildRecentActivity({
        assignments: [{
          id: 'a1',
          name: 'Quiz',
          created: now - 5 * 24 * 3600000,
          updated: now - 2 * 3600000,
          dueDate: '2026-08-22',
          status: ASSIGNMENT_STATUS.PUBLISHED,
        }],
        now,
        t,
      })
      expect(items.map(i => i.kind)).to.deep.equal([
        'updated-assignment',
        'deadline-passed',
      ])
      expect(relativeTimeFromNow(now - 90 * 1000, now, t)).to.equal('2 minutes ago')
    })
  })
}
