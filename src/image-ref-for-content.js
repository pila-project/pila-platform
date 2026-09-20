import { validate as isUUID } from 'uuid'

const DATAWISE_DOMAIN = 'datawise.accingo.co'
const CANDLI_DOMAINS = new Set([
  'customize-candli.pilaproject.org',
  'embed.knowlearning.systems',
  'pila.cand.li',
])

function imageForDomain(domain) {
  if (!domain) return null
  const host = String(domain).toLowerCase()
  if (host === DATAWISE_DOMAIN) return '/datawise-logo.png'
  if (CANDLI_DOMAINS.has(host)) return '/candli-logo.svg'
  return null
}

export default async function getImageFromContent(content) {
  try {
    if (typeof content === 'string' && content.includes('bettysbrain')) {
      return '/betty.png'
    }
    else if (typeof content === 'string' && content.includes('karel')) {
      return '/karel_new.png'
    }
    else if (typeof content === 'string' && isUUID(content)) {
      let image
      let picture
      let innerContentId
      try {
        const state = await Agent.state(content)
        image = state?.image
        picture = state?.picture
        innerContentId = state?.id
      } catch {
        // continue to type / domain / generic logo
      }

      const imageRef = image || picture
      if (imageRef) {
        try {
          const url = isUUID(imageRef) ? (await Agent.download(imageRef).url()) : imageRef
          if (url) return url
        } catch {
          // download failed — continue to type / domain / generic logo
        }
      } else if (innerContentId?.includes('betty')) { // for some reason betty stuff has "url" as ids nested
        return 'betty.png'
      }

      // attempt get image ref from type, then domain
      let active_type
      let domain
      try {
        const meta = await Agent.metadata(content)
        active_type = meta?.active_type
        domain = meta?.domain
      } catch {
        // continue to generic logo
      }
      if (active_type?.startsWith('application/json;type=sequence')) {
        return '/pila_sequence.png'
      }
      else if (active_type?.startsWith('application/json;type=karel-map')) {
        return '/karel_new.png'
      }
      const domainFallback = imageForDomain(domain)
      if (domainFallback) return domainFallback
    }
    return '/logo-green.svg'
  } catch {
    return '/logo-green.svg'
  }
}
