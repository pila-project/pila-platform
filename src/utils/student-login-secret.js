/**
 * Prefer users[id].secret (new students). If missing, decrypt
 * Agent.state(id).providerEncryptedKey (trunk / pre-window students).
 * Display-only for QR/glyphs/download — does not persist and does not
 * fall back to /join/{id}.
 */

export function namedStudentLoginSecret(namedSecret) {
  if (typeof namedSecret !== 'string') return ''
  return namedSecret.trim()
}

export async function resolveStudentLoginSecret(namedSecret, userId, decryptProviderEncryptedKey) {
  const named = namedStudentLoginSecret(namedSecret)
  if (named) return named
  if (!userId || typeof decryptProviderEncryptedKey !== 'function') return ''
  try {
    const recovered = await decryptProviderEncryptedKey(userId)
    return typeof recovered === 'string' ? recovered : ''
  } catch {
    return ''
  }
}
