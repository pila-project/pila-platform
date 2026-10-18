import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  academyKlPlayerEnabled,
  languagesWithPageFirst,
  shouldUseAcademyKlPlayer,
} from './kl-player.js'

const UUID = 'f62f39f0-645b-4919-8b2f-be0d16b1609a'

describe('academy KL player flag', () => {
  it('is on by default', () => {
    assert.equal(academyKlPlayerEnabled(undefined), true)
    assert.equal(academyKlPlayerEnabled(''), true)
    assert.equal(academyKlPlayerEnabled('1'), true)
    assert.equal(academyKlPlayerEnabled('yes'), true)
  })

  it('lets ?klplayer=0 fall back to the built-in renderer', () => {
    assert.equal(academyKlPlayerEnabled('0'), false)
    assert.equal(academyKlPlayerEnabled(['1', '0']), false)
    assert.equal(academyKlPlayerEnabled(['0', '1']), true)
  })

  it('skips fixtures and non-uuids', () => {
    assert.equal(shouldUseAcademyKlPlayer({ id: UUID, fixture: false }), true)
    assert.equal(shouldUseAcademyKlPlayer({ id: UUID, fixture: true }), false)
    assert.equal(shouldUseAcademyKlPlayer({ id: 'sample-module', fixture: false }), false)
    assert.equal(shouldUseAcademyKlPlayer({ id: UUID, fixture: false, queryValue: '0' }), false)
  })

  it('puts the page language first in LANGUAGES', () => {
    assert.deepEqual(languagesWithPageFirst(['en', 'th'], 'th'), ['th', 'en'])
    assert.deepEqual(languagesWithPageFirst(['th', 'en'], 'th'), ['th', 'en'])
    assert.deepEqual(languagesWithPageFirst(undefined, 'th'), ['th'])
    assert.deepEqual(languagesWithPageFirst(['en'], ''), ['en'])
  })
})
