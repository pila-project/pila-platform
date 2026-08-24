/**
 * Assert Figma login tokens exist on the shipped login stylesheet (src/pages/login/index.vue).
 * Nodes: 1:13049 desktop hub, 1:14583 mobile hub.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const file = resolve(dirname(fileURLToPath(import.meta.url)), '../src/pages/login/index.vue')
const css = readFileSync(file, 'utf8')

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg)
    process.exitCode = 1
  } else {
    console.log('ok', msg)
  }
}

const required = [
  ['--login-title-size: 30px', 'desktop title 30px (1:13049)'],
  ['--login-title-size-mobile: 24px', 'mobile title 24px (1:14583)'],
  ['--login-title-color: #020617', 'title color'],
  ['--login-subtitle-size: 16px', 'subtitle 16px'],
  ['--login-subtitle-color: #334155', 'subtitle color'],
  ['--login-method-height: 52px', 'method button 52px'],
  ['--login-method-radius: 8px', 'method radius 8px'],
  ['1px solid #e2e8f0', 'method border'],
  ['--login-method-icon: 24px', 'method icon 24px'],
  ['--login-tabs-bg: #f4f4f5', 'tab track'],
  ['--login-tab-active-bg: #2563eb', 'active tab'],
  ['--login-back-color: #2563eb', 'back control'],
]

for (const [needle, label] of required) {
  assert(css.includes(needle), label)
}

assert(/@media \(max-width: 900px\)/.test(css), 'mobile breakpoint 900px')
assert(css.includes('.login-hero') && css.includes('display: none'), 'mobile hides hero')

const html = css // full vue sfc
assert(html.includes('/login/icons/google_original.png') || html.includes('SSO_PROVIDER_META'), 'SSO icons via provider meta')
assert(html.includes('/login/icons/iconixto_solid_qr-code.png'), 'scanner QR mark')
assert(html.includes('/login/icons/password.png'), 'code/password mark')

if (process.exitCode) {
  console.error('login figma token checks failed')
  process.exit(1)
}
console.log('login figma token checks passed')
