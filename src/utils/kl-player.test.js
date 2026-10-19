import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { KL_SEQUENCE_PLAYER_HOST } from './sequence-items.js'
import { klPlayerUrl } from './kl-player.js'

describe('kl player url', () => {
  it('points a document id at Know Learning’s sequence host', () => {
    const id = '11111111-1111-4111-8111-111111111111'
    assert.equal(klPlayerUrl(id), `https://${KL_SEQUENCE_PLAYER_HOST}/${id}`)
  })
})
