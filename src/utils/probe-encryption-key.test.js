import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  PROBE_MAX_ATTEMPTS,
  classifyProbeAttempt,
  probeUserIdsNewestFirst,
} from './probe-encryption-key.js'

describe('probeUserIdsNewestFirst', () => {
  it('walks the roster from the end and skips falsy ids', () => {
    assert.deepEqual(
      probeUserIdsNewestFirst(['old', 'mid', '', null, 'new']),
      ['new', 'mid', 'old'],
    )
    assert.deepEqual(probeUserIdsNewestFirst([]), [])
    assert.deepEqual(probeUserIdsNewestFirst(null), [])
  })
})

describe('classifyProbeAttempt', () => {
  it('counts a provider miss plus its re-encrypted boxes as one attempt', () => {
    assert.deepEqual(
      classifyProbeAttempt({ hasProviderInfo: true, providerOpened: false, boxResult: 'ok' }),
      { stop: 'ok', attempt: true },
    )
    assert.deepEqual(
      classifyProbeAttempt({ hasProviderInfo: true, providerOpened: false, boxResult: 'fail' }),
      { stop: null, attempt: true },
    )
    assert.deepEqual(
      classifyProbeAttempt({ hasProviderInfo: true, providerOpened: false, boxResult: 'absent' }),
      { stop: null, attempt: true },
    )
    assert.deepEqual(
      classifyProbeAttempt({ hasProviderInfo: true, providerOpened: true, boxResult: 'absent' }),
      { stop: 'ok', attempt: true },
    )
  })

  it('does not spend an attempt when there is nothing to open', () => {
    assert.deepEqual(
      classifyProbeAttempt({ hasProviderInfo: false, providerOpened: false, boxResult: 'absent' }),
      { stop: null, attempt: false },
    )
    assert.deepEqual(
      classifyProbeAttempt({ hasProviderInfo: false, providerOpened: false, boxResult: 'fail' }),
      { stop: null, attempt: true },
    )
  })
})

describe('probe cap', () => {
  it('stops after 12 attempts and still returns ok on the first success, newest first', () => {
    assert.equal(PROBE_MAX_ATTEMPTS, 12)
    const ids = probeUserIdsNewestFirst(
      Array.from({ length: 20 }, (_, i) => `s${i}`),
    )
    let attempted = 0
    let result = 'invalid'
    for (const id of ids) {
      if (attempted >= PROBE_MAX_ATTEMPTS) break
      const opened = id === 's19'
      const decision = classifyProbeAttempt({
        hasProviderInfo: true,
        providerOpened: opened,
        boxResult: 'fail',
      })
      if (decision.attempt) attempted += 1
      if (decision.stop === 'ok') {
        result = 'ok'
        break
      }
    }
    assert.equal(result, 'ok')
    assert.equal(attempted, 1)
    assert.equal(ids[0], 's19')
  })
})
