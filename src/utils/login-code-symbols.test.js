import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  normalizeLoginCodeInput,
  isCompleteLoginCode,
  secretFromLoginScan,
  pilaSecretLoginUrl,
} from './login-code-symbols.js'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(srcDir, '..')

function pemFrom(source) {
  const match = source.match(/-----BEGIN PUBLIC KEY-----[\s\S]*?-----END PUBLIC KEY-----\n/)
  assert.ok(match, 'expected a PEM block')
  return match[0]
}

describe('secretFromLoginScan', () => {
  it('passes through a raw 8-char secret', () => {
    assert.equal(secretFromLoginScan('fjwxvcws'), 'fjwxvcws')
  })

  it('takes the fragment from a /login/pila URL (not the host name)', () => {
    assert.equal(
      secretFromLoginScan('https://app.pilaproject.org/login/pila#fjwxvcws'),
      'fjwxvcws'
    )
  })

  it('reads location.hash form', () => {
    assert.equal(secretFromLoginScan('#fjwxvcws'), 'fjwxvcws')
  })

  it('does not treat pilaproject as the secret', () => {
    assert.notEqual(
      secretFromLoginScan('https://app.pilaproject.org/login/pila#fjwxvcws'),
      'pilaproje'
    )
  })

  it('does not extract host letters from a URL with no fragment', () => {
    assert.equal(
      secretFromLoginScan('https://app.pilaproject.org/login/pila'),
      ''
    )
    assert.equal(
      secretFromLoginScan('https://app.pilaproject.org/join/a4ea3c22-cea0-460d-a05f-d8bfa6d09d80'),
      ''
    )
  })

  it('accepts http and mixed-case scheme', () => {
    assert.equal(
      secretFromLoginScan('HTTP://app.pilaproject.org/login/pila#fjwxvcws'),
      'fjwxvcws'
    )
  })

  it('normalizes an uppercase fragment', () => {
    assert.equal(
      secretFromLoginScan('https://app.pilaproject.org/login/pila#FJWXV CWS'),
      'fjwxvcws'
    )
  })
})

describe('pilaSecretLoginUrl', () => {
  it('embeds the secret in the hash', () => {
    assert.equal(
      pilaSecretLoginUrl('fjwxvcws', 'app.pilaproject.org'),
      'https://app.pilaproject.org/login/pila#fjwxvcws'
    )
  })
})

describe('isCompleteLoginCode', () => {
  it('accepts 8 chars from a–y', () => {
    assert.equal(isCompleteLoginCode('fjwxvcws'), true)
    assert.equal(isCompleteLoginCode('fjwxvcw'), false)
    assert.equal(isCompleteLoginCode('fjwxvcwz'), false)
  })
})

describe('normalizeLoginCodeInput', () => {
  it('lowercases and trims a raw secret', () => {
    assert.equal(normalizeLoginCodeInput('  FJWXV CWS '), 'fjwxvcws')
  })
})

describe('student code login wiring', () => {
  it('does not call Agent.login code provider', () => {
    const loginPage = readFileSync(join(srcDir, 'pages/login/index.vue'), 'utf8')
    assert.equal(loginPage.includes("Agent.login('code'"), false)
    assert.equal(loginPage.includes('loginWithPilaSecret'), true)
    assert.equal(loginPage.includes('secretFromLoginScan(window.location.hash)'), true)
  })

  it('keeps /login/pila hash secret on the login URL', () => {
    const main = readFileSync(join(srcDir, 'main.js'), 'utf8')
    assert.match(main, /replaceState\(null, '', `\/login#\$\{secret\}`\)/)
    assert.equal(main.includes("Agent.login('code'"), false)
  })

  it('wraps oauth code as login.pilaproject.org, not code', () => {
    const helper = readFileSync(join(srcDir, 'utils/pila-secret-login.js'), 'utf8')
    assert.match(helper, /PILA_IDP_PROVIDER = 'login\.pilaproject\.org'/)
    assert.match(helper, /provider:\s*PILA_IDP_PROVIDER/)
    assert.doesNotMatch(helper, /provider:\s*['"]code['"]/)
    assert.match(helper, /userPublicKey/)
    assert.match(helper, /userEncryptedInfo/)
    assert.match(helper, /providerEncryptedInfo/)
  })

  it('CORE_AUTH PEM matches @knowlearning/agents browser auth.js', () => {
    const helper = readFileSync(join(srcDir, 'utils/pila-secret-login.js'), 'utf8')
    const sdk = readFileSync(
      join(repoRoot, 'node_modules/@knowlearning/agents/agents/browser/auth.js'),
      'utf8'
    )
    assert.equal(pemFrom(helper), pemFrom(sdk))
  })

  it('student print cards use /login/pila#secret, not /join/{id}', () => {
    const codesView = readFileSync(join(srcDir, 'components/teacher/LoginCodesView.vue'), 'utf8')
    const manage = readFileSync(join(srcDir, 'pages/teacher/manage-classes.vue'), 'utf8')
    assert.equal(codesView.includes('/join/${id}'), false)
    assert.equal(codesView.includes('pilaSecretLoginUrl'), true)
    assert.equal(manage.includes('/join/${loginCodeStudent.id}'), false)
    assert.equal(manage.includes('pilaSecretLoginUrl'), true)
  })
})
