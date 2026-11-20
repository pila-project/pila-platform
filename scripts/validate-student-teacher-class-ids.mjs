// Run from this repository:
// npm install --prefix .tmp-roster-test-tools --no-save --ignore-scripts --no-audit --no-fund @electric-sql/pglite@0.3.14
// node scripts/validate-student-teacher-class-ids.mjs
// PGlite executes PostgreSQL in memory; no platform connection or writes occur.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const requireTools = createRequire(new URL('../.tmp-roster-test-tools/package.json', import.meta.url))
const { PGlite } = await import(pathToFileURL(requireTools.resolve('@electric-sql/pglite')).href)
const source = await readFile(new URL('../sql.yaml', import.meta.url), 'utf8')
const queryBlock = source.slice(source.indexOf('    student-teacher-class-ids:\n'))
const body = queryBlock.match(/^      body: \|\n((?:        .*\n|\n)+)/m)
assert.ok(body, 'The configured roster query must exist')
const query = body[1].replace(/^        /gm, '')
  .replaceAll('$all_teachers', '$1')
  .replaceAll('$treatment_teacher_ids', '$2')
  .replaceAll('$control_teacher_ids', '$3')
  .replaceAll('$DOMAIN', '$4')
const uuid = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`
const domain = 'study.example.org'
const created = '2026-01-01T00:00:00.000Z', updated = '2026-02-01T00:00:00.000Z'
const students = [
  ['teacher-one', 'student-shared', 'class-active', false],
  ['teacher-one', 'student-removed', 'class-active', true],
  ['teacher-one', 'student-shared', 'class-active', false], // Duplicate membership.
  ['teacher-two', 'student-shared', 'class-archived', false],
  ['teacher-three', 'student-without-map', 'class-active', false],
  ['untagged', 'student-excluded', 'class-active', false]
]
const db = new PGlite()
try {
  await db.exec(`
    CREATE TABLE metadata (id UUID, name TEXT, owner TEXT, domain TEXT, created TIMESTAMP, updated TIMESTAMP);
    CREATE TABLE group_members (id UUID, user_id TEXT, group_id TEXT, archived BOOLEAN);
    CREATE TABLE groups (id TEXT, archived BOOLEAN);
    INSERT INTO groups VALUES ('class-active', FALSE), ('class-archived', TRUE);
  `)
  async function metadata(id, owner, name = null, recordDomain = domain, time = created) {
    await db.query('INSERT INTO metadata VALUES ($1, $2, $3, $4, $5, $6)',
      [uuid(id), name, owner, recordDomain, time, updated])
  }
  for (const [index, [teacher, student, group, archived]] of students.entries()) {
    await metadata(index + 1, teacher)
    await db.query('INSERT INTO group_members VALUES ($1, $2, $3, $4)',
      [uuid(index + 1), student, group, archived])
  }
  await metadata(100, 'teacher-one', 'users')
  await metadata(101, 'teacher-one', 'users', domain, updated)
  await metadata(102, 'teacher-one', 'different-name', domain, '2026-03-01')
  await metadata(103, 'teacher-one', 'users', 'other.example.org', '2026-03-01')
  await metadata(104, 'different-owner', 'users', domain, '2026-03-01')
  await metadata(105, 'teacher-two', 'users')
  await metadata(106, 'teacher-empty', 'users')

  const teachers = ['teacher-one', 'teacher-one', 'teacher-two', 'teacher-three', 'teacher-empty', 'teacher-empty-without-map']
  const parameters = [teachers, ['teacher-one'], ['teacher-two'], domain]
  const result = await db.query(query, parameters)
  const originalColumns = ['student_id', 'teacher_id', 'class_id', 'class_archived', 'timestamp', 'member_removed', 'treatment', 'control']
  assert.deepEqual(result.fields.map(field => field.name), [...originalColumns, 'teacher_users_id'])
  assert.equal(result.rows.length, 6, 'Keep distinct memberships and teachers without memberships')

  const expectedDocument = {
    'teacher-one': uuid(101),
    'teacher-two': uuid(105),
    'teacher-three': null,
    'teacher-empty': uuid(106),
    'teacher-empty-without-map': null
  }
  for (const row of result.rows) assert.equal(row.teacher_users_id, expectedDocument[row.teacher_id])
  const key = row => `${row.teacher_id}/${row.student_id}`
  const rows = new Map(result.rows.map(row => [key(row), row]))
  assert.deepEqual([...rows.keys()].sort(), [
    'teacher-empty/', 'teacher-empty-without-map/',
    'teacher-one/student-removed', 'teacher-one/student-shared',
    'teacher-three/student-without-map', 'teacher-two/student-shared'
  ].sort())
  for (const row of result.rows) {
    assert.equal(row.treatment, row.teacher_id === 'teacher-one')
    assert.equal(row.control, row.teacher_id === 'teacher-two')
    const empty = row.student_id === ''
    const removed = row.student_id === 'student-removed'
    assert.equal(row.class_id, empty ? '' : row.teacher_id === 'teacher-two' ? 'class-archived' : 'class-active')
    assert.equal(row.class_archived, row.teacher_id === 'teacher-two')
    assert.equal(row.member_removed, removed)
    assert.equal(row.timestamp?.toISOString() ?? null, empty ? null : removed ? updated : created)
  }

  // Selecting another target domain must not reuse the first domain's users map.
  const otherDomain = await db.query(query, [teachers, [], [], 'other.example.org'])
  for (const row of otherDomain.rows) {
    assert.equal(row.teacher_users_id, row.teacher_id === 'teacher-one' ? uuid(103) : null)
  }
  assert.equal(otherDomain.rows.length, result.rows.length)
  assert.deepEqual((await db.query(query, [[], [], [], domain])).rows, [])
  assert.deepEqual((await db.query(query, [null, null, null, domain])).rows, [])
  console.log('PASS: PostgreSQL roster lookup preserves rows, flags and timestamps; selects the latest users document for the matching teacher/domain; returns null when absent; handles empty cohorts.')
} finally {
  await db.close()
}
