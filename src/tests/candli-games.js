import { candliGamesForSequenceItems } from '../candli-games.js'

export default function candliGamesTests() {
  describe('Competency dashboard games', function () {
    it('keeps games in sequence item order', async function () {
      const domains = {
        custom: 'customize-candli.pilaproject.org',
        ignored: 'example.com',
        modern: 'embed.knowlearning.systems',
        legacy: 'embed.knowlearning.systems'
      }
      const states = {
        custom: { game: 'game-custom' },
        modern: { id: 'https://pila.cand.li/pila.html?game=game-modern' },
        legacy: { id: 'https://pila.cand.li/pila.html?candli_editor/incredible_machine0' }
      }
      const metadataResolvers = {}
      const agent = {
        metadata: id => new Promise(resolve => {
          metadataResolvers[id] = resolve
        }),
        state: async id => states[id]
      }

      const gamesPromise = candliGamesForSequenceItems(
        [
          { id: 'custom' },
          { id: 'ignored' },
          { id: 'modern' },
          { id: 'legacy' }
        ],
        agent
      )
      metadataResolvers.legacy({ domain: domains.legacy })
      metadataResolvers.modern({ domain: domains.modern })
      metadataResolvers.ignored({ domain: domains.ignored })
      metadataResolvers.custom({ domain: domains.custom })

      expect(await gamesPromise).to.deep.equal([
        'game-custom',
        'game-modern',
        'candli_editor/incredible_machine0'
      ])
    })

    it('keeps valid games ordered when an item lookup fails', async function () {
      const agent = {
        metadata: async id => {
          if (id === 'failed') throw new Error('Lookup failed')
          return { domain: 'customize-candli.pilaproject.org' }
        },
        state: async id => ({ game: `game-${id}` })
      }

      const games = await candliGamesForSequenceItems(
        [{ id: 'first' }, { id: 'failed' }, { id: 'last' }],
        agent
      )

      expect(games).to.deep.equal(['game-first', 'game-last'])
    })
  })
}
