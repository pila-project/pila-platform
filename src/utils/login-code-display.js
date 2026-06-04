import codeCharToIcon from './code-char-to-icon.js'

export function formatLoginCodePlain(secret) {
  if (!secret) return '—'
  return secret
}

export function formatLoginCodeIcons(secret) {
  if (!secret) return '—'
  return secret.split('').map(c => codeCharToIcon[c] || c).join('')
}