/**
 * Student/teacher login codes: 8 chars from a–y, shown as digits/symbols.
 * Matches login-code-document.js + code-char-to-icon.js (Font Awesome for pad).
 */
import codeCharToIcon from './code-char-to-icon.js'

export const LOGIN_CODE_CHARSET = 'abcdefghijklmnopqrstuvwxy'
export const LOGIN_CODE_LENGTH = 8

/** Display glyphs used on printed cards (login-code-document). */
export const CODE_CHAR_TO_GLYPH = {
  a: '0', b: '1', c: '2', d: '3', e: '4',
  f: '5', g: '6', h: '7', i: '8', j: '9',
  k: '★', l: '←', m: '↑', n: '↓', o: '→',
  p: '∞', q: '+', r: '−', s: '÷', t: '=',
  u: '♪', v: '▶', w: '■', x: '♥', y: '☺',
}

/** Pad order: digits row then symbol rows (matches Figma code-entry grid). */
export const LOGIN_CODE_PAD_CHARS = [
  'a', 'b', 'c', 'd', 'e',
  'f', 'g', 'h', 'i', 'j',
  'k', 'l', 'm', 'n', 'o',
  'p', 'q', 'r', 's', 't',
  'u', 'v', 'w', 'x', 'y',
]

export function glyphForCodeChar(ch) {
  return CODE_CHAR_TO_GLYPH[ch] || ch
}

export function faIconForCodeChar(ch) {
  return codeCharToIcon[ch] || null
}

export function normalizeLoginCodeInput(raw) {
  if (!raw) return ''
  const s = String(raw).trim().toLowerCase()
  // QR may wrap URL or JSON — take last 8-char code-looking token
  const match = s.match(/[a-y]{6,12}/)
  if (match) return match[0].slice(0, LOGIN_CODE_LENGTH)
  return s.replace(/[^a-y]/g, '').slice(0, LOGIN_CODE_LENGTH)
}

/**
 * IdP pad/scanner: URL payloads yield the fragment; raw secrets pass through.
 * Do not run the generic [a-y]{6,12} matcher on a full URL first — hosts like
 * pilaproject.org match before the hash secret.
 */
export function secretFromLoginScan(raw) {
  if (!raw) return ''
  const s = String(raw).trim()
  const fromUrl = /^https?:\/\//i.test(s) || s.startsWith('#')
  if (fromUrl) {
    const hashIdx = s.indexOf('#')
    // URL with no fragment is not a secret (old /join/{uuid} cards, host names).
    if (hashIdx < 0) return ''
    return normalizeLoginCodeInput(s.slice(hashIdx + 1))
  }
  return normalizeLoginCodeInput(s)
}

export function pilaSecretLoginUrl(secret, host = typeof location !== 'undefined' ? location.host : '') {
  return `https://${host}/login/pila#${secret}`
}

export function isCompleteLoginCode(code) {
  return typeof code === 'string'
    && code.length === LOGIN_CODE_LENGTH
    && /^[a-y]+$/.test(code)
}
