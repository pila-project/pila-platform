import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { modalCloseAllowed } from './modal-dismiss.js'

describe('modalCloseAllowed', () => {
  it('allows every reason by default, and persistent blocks only outside clicks', () => {
    for (const reason of ['outside', 'escape', 'top-x', 'primary-button']) {
      assert.equal(modalCloseAllowed({ reason }), true)
    }
    assert.equal(modalCloseAllowed({ persistent: true, reason: 'outside' }), false)
    assert.equal(modalCloseAllowed({ persistent: true, reason: 'escape' }), true)
    assert.equal(modalCloseAllowed({ persistent: true, reason: 'top-x' }), true)
  })

  it('blocks every close reason when the modal is not dismissible', () => {
    for (const reason of ['outside', 'escape', 'top-x', 'primary-button']) {
      assert.equal(modalCloseAllowed({ dismissible: false, reason }), false)
      assert.equal(
        modalCloseAllowed({ dismissible: false, persistent: true, reason }),
        false,
      )
    }
  })
})
