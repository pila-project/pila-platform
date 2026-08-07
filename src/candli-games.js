const CUSTOM_CANDLI_DOMAIN = 'customize-candli.pilaproject.org'
const EMBED_DOMAIN = 'embed.knowlearning.systems'
const CANDLI_EMBED_PREFIX = 'https://pila.cand.li/pila.html?'
const CANDLI_EMBED_PREFIX_2 = 'https://pila.cand.li/pila-play.html?'

export async function candliGamesForSequenceItems(items, agent = Agent) {
  if (!Array.isArray(items)) return []

  const games = await Promise.all(
    items.map(async item => {
      try {
        return await candliGameForSequenceItem(item, agent)
      } catch {
        return null
      }
    })
  )

  return games.filter(Boolean)
}

async function candliGameForSequenceItem(item, agent) {
  if (!item?.id) return null

  const { domain } = await agent.metadata(item.id)

  if (domain === CUSTOM_CANDLI_DOMAIN) {
    const { game } = await agent.state(item.id)
    return game || null
  }
  if (domain !== EMBED_DOMAIN) return null
  const { id } = await agent.state(item.id)
  if (!id?.startsWith?.(CANDLI_EMBED_PREFIX) && !id?.startsWith?.(CANDLI_EMBED_PREFIX_2) ) return null

  try {
    const game = new URL(id).searchParams.get('game')
    return game || id.slice(id.indexOf('?')+1) || null
  } catch {
    return null
  }
}
