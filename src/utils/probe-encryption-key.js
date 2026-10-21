/** Soft probe: newest students first, at most this many real attempts. */
export const PROBE_MAX_ATTEMPTS = 12

/**
 * Roster ids are oldest-first within a session (new keys appended).
 * After a code reset the students the new code can open are at the end,
 * so the probe walks the list backwards. Falsy ids are skipped.
 */
export function probeUserIdsNewestFirst(userIds) {
  if (!Array.isArray(userIds) || !userIds.length) return []
  const ordered = []
  for (let i = userIds.length - 1; i >= 0; i -= 1) {
    const id = userIds[i]
    if (id) ordered.push(id)
  }
  return ordered
}

/**
 * One student in the probe.
 * boxResult is 'ok' | 'fail' | 'absent' (no teacher code, no blobs, or unreadable state).
 * A providerEncryptedInfo user still counts as one attempt when the symmetric
 * open fails and the re-encrypted boxes are tried (or absent).
 */
export function classifyProbeAttempt({ hasProviderInfo, providerOpened, boxResult }) {
  if (providerOpened || boxResult === 'ok') return { stop: 'ok', attempt: true }
  if (hasProviderInfo) return { stop: null, attempt: true }
  if (boxResult === 'fail') return { stop: null, attempt: true }
  return { stop: null, attempt: false }
}
