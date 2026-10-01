import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { skipSavedTeacherShellPath } from './teacher-post-login.js'

describe('skipSavedTeacherShellPath', () => {
  it('sends a teacher back from Explore to Home', () => {
    assert.equal(skipSavedTeacherShellPath('teacher', '/teacher/content'), true)
    assert.equal(skipSavedTeacherShellPath('teacher', '/teacher'), true)
    assert.equal(skipSavedTeacherShellPath('teacher', '/teacher/academy/module/1'), true)
  })

  it('keeps a non-teacher return path', () => {
    assert.equal(skipSavedTeacherShellPath('teacher', '/admin'), false)
    assert.equal(skipSavedTeacherShellPath('teacher', '/'), false)
    assert.equal(skipSavedTeacherShellPath('teacher', null), false)
  })

  it('does not treat a student return as a teacher shell skip', () => {
    assert.equal(skipSavedTeacherShellPath('student', '/teacher/content'), false)
    assert.equal(skipSavedTeacherShellPath(null, '/teacher/content'), false)
  })
})
