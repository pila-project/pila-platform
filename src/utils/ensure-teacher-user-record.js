/**
 * Ensure teacher `users[id]` exists before archive/grade writes.
 * Missing ids get `{}` (trunk create shape). Never invents `secret` and
 * never replaces an existing record (grade/secret stay put).
 * `archived` / `grade` are written only when those keys are present on
 * `fields`. `undefined` clears by delete: Agent state is a PatchProxy
 * and assigning undefined throws.
 */
export function ensureTeacherUserRecord(usersState, id, fields = {}) {
  if (!usersState[id]) {
    usersState[id] = {}
  }
  const rec = usersState[id]
  if (fields && Object.prototype.hasOwnProperty.call(fields, 'archived')) {
    writeField(rec, 'archived', fields.archived)
  }
  if (fields && Object.prototype.hasOwnProperty.call(fields, 'grade')) {
    writeField(rec, 'grade', fields.grade)
  }
  return rec
}

function writeField(rec, key, value) {
  if (value === undefined) delete rec[key]
  else rec[key] = value
}
