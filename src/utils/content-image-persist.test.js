import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { canPersistImageBlob } from './content-cache.js'

const THAI = 'https://thailand.pilaproject.org'

describe('canPersistImageBlob', () => {
  it('rejects cross-origin covers that do not send CORS', () => {
    assert.equal(
      canPersistImageBlob('https://chirpy-bird.pilaproject.org/covers/a.png', THAI),
      false,
    )
    assert.equal(
      canPersistImageBlob('https://datawise.accingo.co/media/cover.png', THAI),
      false,
    )
    assert.equal(
      canPersistImageBlob('https://not.knowlearning.systems.evil.com/a.png', THAI),
      false,
    )
  })

  it('allows KL-hosted file URLs', () => {
    assert.equal(
      canPersistImageBlob(
        'https://storage.googleapis.com/bucket/file.png?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Signature=abc',
        THAI,
      ),
      true,
    )
    assert.equal(
      canPersistImageBlob('https://STORAGE.GOOGLEAPIS.COM/bucket/File.PNG', THAI),
      true,
    )
    assert.equal(
      canPersistImageBlob('https://files.knowlearning.systems/x.png', THAI),
      true,
    )
    assert.equal(
      canPersistImageBlob('https://a.b.knowlearning.systems/x.png', THAI),
      true,
    )
  })

  it('allows same-origin absolute URLs', () => {
    assert.equal(
      canPersistImageBlob('https://thailand.pilaproject.org/x.png', THAI),
      true,
    )
    assert.equal(
      canPersistImageBlob('https://thailand.pilaproject.org/covers/a.png?v=1', THAI),
      true,
    )
  })

  it('rejects relative, blob, data, empty, and invalid URLs', () => {
    assert.equal(canPersistImageBlob('/x.png', THAI), false)
    assert.equal(canPersistImageBlob('covers/a.png', THAI), false)
    assert.equal(
      canPersistImageBlob('blob:https://thailand.pilaproject.org/8b3c1c0e-1', THAI),
      false,
    )
    assert.equal(canPersistImageBlob('data:image/png;base64,aaaa', THAI), false)
    assert.equal(canPersistImageBlob('', THAI), false)
    assert.equal(canPersistImageBlob('not a url', THAI), false)
    assert.equal(canPersistImageBlob(null, THAI), false)
    assert.equal(canPersistImageBlob(undefined, THAI), false)
  })

  it('with no origin available, allows only KL hosts', () => {
    assert.equal(
      canPersistImageBlob('https://storage.googleapis.com/bucket/file.png', null),
      true,
    )
    assert.equal(
      canPersistImageBlob('https://cdn.knowlearning.systems/a.png', ''),
      true,
    )
    assert.equal(
      canPersistImageBlob('https://thailand.pilaproject.org/x.png', null),
      false,
    )
    assert.equal(
      canPersistImageBlob('https://chirpy-bird.pilaproject.org/c.png'),
      false,
    )
    assert.equal(
      canPersistImageBlob('https://datawise.accingo.co/a.png', undefined),
      false,
    )
    assert.equal(canPersistImageBlob('/x.png', null), false)
    assert.equal(canPersistImageBlob('not a url', null), false)
  })
})
