/**
 * Structural + model checks for the teacher homepage (shipped files).
 * Run: node scripts/check-teacher-home.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  LEARN_ABOUT_PILA_URL,
  CURRENT_ASSIGNMENTS_PREVIEW_LIMIT,
  RECENT_ACTIVITY_LIMIT,
  HOME_BANNER_DISMISSED_KEY,
  HOME_LAYOUT_KEY,
  workspaceBannerVisible,
  parseHomeLayout,
  greetingFirstName,
  formatWelcomeBack,
  currentAssignmentPreview,
  buildRecentActivity,
} from '../src/utils/teacher-home.js'
import { ASSIGNMENT_STATUS } from '../src/utils/assignment-status.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const homeVue = readFileSync(resolve(root, 'src/pages/teacher/home.vue'), 'utf8')
const routerJs = readFileSync(resolve(root, 'src/router.js'), 'utf8')
const teacherIndex = readFileSync(resolve(root, 'src/pages/teacher/index.vue'), 'utf8')
const loginVue = readFileSync(resolve(root, 'src/pages/login/index.vue'), 'utf8')

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg)
    process.exitCode = 1
  } else {
    console.log('ok', msg)
  }
}

assert(routerJs.includes("import('@/pages/teacher/home.vue')"), 'router lazy-loads teacher home')
assert(/path:\s*''[\s\S]{0,80}component:\s*TeacherHome/.test(routerJs), 'empty /teacher path is TeacherHome')
assert(teacherIndex.includes("title: t('home')"), 'sidebar has Home item')
assert(teacherIndex.includes("to: '/teacher'"), 'Home nav targets /teacher')

assert(homeVue.includes("from '@/pages/assignments/from-me/create-edit-assignment-modal.vue'"), 'home reuses CreateEditAssignmentModal')
assert(homeVue.includes("from '@/pages/assignments/from-me/view-submissions.vue'"), 'home reuses ViewSubmissions')
assert(homeVue.includes('canViewSubmissions'), 'home gates reporting View like assignments-list')
assert(homeVue.includes("t('reporting-dashboard')"), 'home table has reporting-dashboard column')
assert(!homeVue.includes('ellipsis-vertical'), 'home table has no kebab Actions column')
assert(homeVue.includes("t('edit')"), 'home table has Edit column')
assert(!homeVue.includes('assignmentSort'), 'home has no extra Sort dropdown')
assert(!homeVue.includes("t('newest-at-top')"), 'home does not duplicate table sort chrome')
assert(homeVue.includes('homeAssignmentItems'), 'home assignments use same row shape as assignments page')
assert(homeVue.includes("t('my-assignments')"), 'home assignments card is My assignments')
assert(homeVue.includes('tablePerPageOptions'), 'home table pagination matches assignments page')
assert(homeVue.includes('RECENT_ACTIVITY_LIMIT'), 'activity uses full-list limit not table preview')
assert(homeVue.includes('<PTable'), 'home uses PTable for current assignments')
assert(homeVue.includes('<PButton'), 'home uses PButton')
assert(homeVue.includes('openCreateAssignment'), 'create assignment handler exists')
assert(homeVue.includes("t('customise-dashboard')"), 'header button is Customize Dashboard')
assert(homeVue.includes('showCustomizeModal'), 'customize dashboard modal is wired')
assert(homeVue.includes('home-panel-head-actions'), 'assignments card has header actions')
assert(homeVue.includes("t('create-assignment')"), 'create assignment copy exists')
assert(homeVue.includes("t('view-all')"), 'view all copy exists on assignments card')
assert(homeVue.includes('dismissWorkspaceBanner'), 'workspace banner can be dismissed')
assert(homeVue.includes('workspace-banner-close'), 'workspace banner has close X')
assert(homeVue.includes('HOME_BANNER_DISMISSED_KEY'), 'banner dismiss persisted')
assert(homeVue.includes('HOME_LAYOUT_KEY'), 'dashboard layout persisted')
assert(homeVue.includes("to=\"/teacher/assignments-from-me\""), 'view-all / assign quick link to assignments')
assert(homeVue.includes("to=\"/teacher/content\""), 'explore quick link to content library')
assert(homeVue.includes("to=\"/teacher/classes\""), 'third quick link to classes')
assert(homeVue.includes("t('your-workspace-is-ready')"), 'workspace-ready banner copy')
assert(homeVue.includes("t('no-activity-yet')"), 'empty activity copy')
assert(homeVue.includes("t('no-assignments-yet')"), 'empty assignments copy')
assert(homeVue.includes('from \'@/utils/teacher-home.js\''), 'home uses shared teacher-home model')
assert(homeVue.includes(LEARN_ABOUT_PILA_URL) || homeVue.includes('LEARN_ABOUT_PILA_URL'), 'learn-about-PILA url wired')

assert(loginVue.includes("t('welcome')"), 'login title is Welcome (UIUX-121)')
assert(loginVue.includes('hero-thailand.jpg'), 'Thai login hero asset wired')
assert(loginVue.includes("role: path.startsWith('/teacher') ? 'teacher' : 'student'"), 'student tab default unless /teacher path')

const now = Date.parse('2026-08-23T12:00:00Z')
assert(workspaceBannerVisible({ dismissed: false }) === true, 'banner visible until dismissed')
assert(workspaceBannerVisible({ dismissed: true }) === false, 'banner hidden after X')
assert(HOME_BANNER_DISMISSED_KEY === 'pila-home-banner-dismissed', 'banner persist key')
assert(HOME_LAYOUT_KEY === 'pila-home-layout', 'layout persist key')
assert(parseHomeLayout({ quickLinks: false }).quickLinks === false, 'layout can hide quick links')
assert(parseHomeLayout({}).currentAssignments === true, 'layout defaults assignments on')
assert(greetingFirstName('Jennifer Smith', 'T') === 'Jennifer', 'greeting first name')
assert(formatWelcomeBack('Welcome back, {name}', 'Jen') === 'Welcome back, Jen', 'welcome template')

const preview = currentAssignmentPreview(['a', 'b', 'c', 'd'], id => ({ a: 1, b: 4, c: 2, d: 3 }[id]), 3)
assert(preview.map(r => r.id).join(',') === 'b,d,c', 'preview newest-first limit 3')
assert(CURRENT_ASSIGNMENTS_PREVIEW_LIMIT === 3, 'preview helper still newest-first limited')
assert(RECENT_ACTIVITY_LIMIT === 4, 'activity limit is 4 Figma cards')
const tableIds = currentAssignmentPreview(['a', 'b', 'c', 'd'], id => ({ a: 1, b: 2, c: 3, d: 4 }[id]), CURRENT_ASSIGNMENTS_PREVIEW_LIMIT)
const activityIds = currentAssignmentPreview(['a', 'b', 'c', 'd'], id => ({ a: 1, b: 2, c: 3, d: 4 }[id]), RECENT_ACTIVITY_LIMIT)
assert(tableIds.length === 3 && activityIds.length === 4, 'activity source is full list (4) not table preview (3)')
assert(activityIds.map(r => r.id).join(',') === 'd,c,b,a', 'activity newest-first from all ids')

function t(slug) {
  return {
    'published-assignment': 'Published Assignment',
    'updated-assignment': 'Updated Assignment',
    untitled: 'Untitled',
    'n-hours-ago': '{n} hours ago',
    'n-minutes-ago': '{n} minutes ago',
    'n-days-ago': '{n} days ago',
  }[slug] || slug
}
const activity = buildRecentActivity(
  [{
    id: 'x',
    updated: now - 2 * 3600000,
    data: { name: 'Fractions', status: ASSIGNMENT_STATUS.PUBLISHED },
    groupCount: 1,
  }],
  { t, now },
)
assert(activity[0]?.kind === 'published' && activity[0]?.meta === 'Fractions', 'activity uses published assignment name')

if (process.exitCode) {
  console.error('teacher-home checks failed')
  process.exit(1)
}
console.log('teacher-home checks passed')
