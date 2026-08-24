import {
  CURRENT_ASSIGNMENTS_PREVIEW_LIMIT,
  RECENT_ACTIVITY_LIMIT,
  HOME_BANNER_DISMISSED_KEY,
  HOME_LAYOUT_KEY,
  DEFAULT_HOME_LAYOUT,
  workspaceBannerVisible,
  parseHomeLayout,
  greetingFirstName,
  formatWelcomeBack,
  currentAssignmentPreview,
  buildRecentActivity,
  relativeTimeFromNow,
} from '../utils/teacher-home.js'
import { ASSIGNMENT_STATUS } from '../utils/assignment-status.js'

function t(slug) {
  const pack = {
    'n-minutes-ago': '{n} minutes ago',
    'n-hours-ago': '{n} hours ago',
    'n-days-ago': '{n} days ago',
    'published-assignment': 'Published Assignment',
    'updated-assignment': 'Updated Assignment',
    untitled: 'Untitled',
  }
  return pack[slug] || slug
}

export default function teacherHomeTests() {
  describe('teacher-home model (shipped src/utils/teacher-home.js)', function () {
    it('shows workspace banner on every visit until it is dismissed', function () {
      expect(workspaceBannerVisible()).to.equal(true)
      expect(workspaceBannerVisible({ dismissed: false })).to.equal(true)
      expect(workspaceBannerVisible({ dismissed: true })).to.equal(false)
      expect(HOME_BANNER_DISMISSED_KEY).to.equal('pila-home-banner-dismissed')
    })

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

    it('activity source can include more rows than the assignments table preview', function () {
      const ids = ['a', 'b', 'c', 'd', 'e']
      const updated = { a: 1, b: 2, c: 3, d: 4, e: 5 }
      const table = currentAssignmentPreview(ids, id => updated[id], CURRENT_ASSIGNMENTS_PREVIEW_LIMIT)
      const activity = currentAssignmentPreview(ids, id => updated[id], RECENT_ACTIVITY_LIMIT)
      expect(table).to.have.length(3)
      expect(activity).to.have.length(4)
      expect(activity.map(r => r.id)).to.deep.equal(['e', 'd', 'c', 'b'])
      expect(activity.map(r => r.id)).to.not.deep.equal(table.map(r => r.id))
    })

    it('builds activity from effective published vs updated assignment status', function () {
      const now = Date.parse('2026-08-23T12:00:00Z')
      const items = buildRecentActivity(
        [
          {
            id: 'pub',
            updated: now - 2 * 3600000,
            data: { name: 'Fractions', status: ASSIGNMENT_STATUS.PUBLISHED },
            groupCount: 1,
          },
          {
            id: 'draft',
            updated: now - 5 * 3600000,
            data: { name: 'Quiz', status: ASSIGNMENT_STATUS.DRAFT },
            groupCount: 0,
          },
        ],
        { t, now },
      )
      expect(items).to.have.length(2)
      expect(items[0].kind).to.equal('published')
      expect(items[0].title).to.equal('Published Assignment:')
      expect(items[0].meta).to.equal('Fractions')
      expect(items[0].when).to.equal('2 hours ago')
      expect(items[1].kind).to.equal('updated')
      expect(items[1].title).to.equal('Updated Assignment:')
      expect(relativeTimeFromNow(now - 90 * 1000, now, t)).to.equal('2 minutes ago')
    })
  })
}
