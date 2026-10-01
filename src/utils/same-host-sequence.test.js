import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { shouldPlaySameHostSequence } from './same-host-sequence.js'

const HOST = 'thailand.pilaproject.org'
const SEQUENCE = 'application/json;type=sequence'

describe('shouldPlaySameHostSequence', () => {
  it('plays a sequence stored on this host', () => {
    assert.equal(shouldPlaySameHostSequence({
      host: HOST,
      domain: HOST,
      activeType: SEQUENCE,
      itemCount: 2,
    }), true)
  })

  it('plays a same-host document that has items even when the type is missing', () => {
    assert.equal(shouldPlaySameHostSequence({
      host: HOST,
      domain: 'Thailand.pilaproject.org.',
      itemCount: 2,
    }), true)
  })

  it('leaves an expert sequence on its own player host', () => {
    assert.equal(shouldPlaySameHostSequence({
      host: HOST,
      domain: 'matching.knowlearning.systems',
      player: 'matching.knowlearning.systems',
      activeType: SEQUENCE,
      itemCount: 4,
    }), false)
  })

  it('leaves a same-host sequence alone when it names another player host', () => {
    assert.equal(shouldPlaySameHostSequence({
      host: HOST,
      domain: HOST,
      player: 'matching.knowlearning.systems',
      activeType: SEQUENCE,
      itemCount: 2,
    }), false)
  })

  it('still plays locally when the named player is this same host', () => {
    assert.equal(shouldPlaySameHostSequence({
      host: HOST,
      domain: HOST,
      player: HOST,
      activeType: SEQUENCE,
      itemCount: 2,
    }), true)
  })

  it('embeds a direct activity on another host', () => {
    assert.equal(shouldPlaySameHostSequence({
      host: HOST,
      domain: 'datawise.accingo.co',
      activeType: 'application/json',
      itemCount: 0,
    }), false)
  })

  it('embeds a same-host document that is not a sequence', () => {
    assert.equal(shouldPlaySameHostSequence({
      host: HOST,
      domain: HOST,
      activeType: 'application/json',
      itemCount: 0,
    }), false)
  })

  it('shows an empty same-host sequence instead of the assignment error', () => {
    assert.equal(shouldPlaySameHostSequence({
      host: HOST,
      domain: HOST,
      activeType: SEQUENCE,
      itemCount: 0,
    }), true)
  })
})
