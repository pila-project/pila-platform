/**
 * A custom sequence created on this app is embedded back into the assignment
 * page, because its metadata domain is this host and it has no player host.
 * That page only plays assignment `content`, so the sequence's activities
 * never open. Play those sequences here. Expert sequences keep their own
 * player host and stay on the normal embed.
 */

const SEQUENCE_ACTIVE_TYPE = 'application/json;type=sequence'

function hostKey(value) {
  return String(value || '').trim().replace(/\.$/, '').toLowerCase()
}

/** Same gate the Know Learning embedder uses before opening reference.player. */
function isEmbedPlayerHost(value) {
  if (typeof value !== 'string') return false
  if (
    value.includes('://')
    || value.includes('/')
    || value.includes('?')
    || value.includes('#')
  ) return false

  const hostPort = value.split(':')
  if (hostPort.length > 2) return false
  const [host, port] = hostPort
  if (port !== undefined) {
    if (!/^\d+$/.test(port)) return false
    const portNumber = Number(port)
    if (portNumber < 1 || portNumber > 65535) return false
  }
  if (host === 'localhost') return true
  return /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(host)
}

/**
 * @param {{ host?: string, domain?: string, player?: string, activeType?: string, itemCount?: number }} info
 * @returns {boolean}
 */
export function shouldPlaySameHostSequence(info = {}) {
  const pageHost = hostKey(info.host)
  const contentHost = hostKey(info.domain)
  if (!pageHost || !contentHost || pageHost !== contentHost) return false
  if (isEmbedPlayerHost(info.player) && hostKey(info.player) !== pageHost) return false
  if (info.activeType === SEQUENCE_ACTIVE_TYPE) return true
  return Number(info.itemCount) > 0
}
