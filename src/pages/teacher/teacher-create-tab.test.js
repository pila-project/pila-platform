import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import staticTranslations from '../../store/staticTranslations.js'

const source = readFileSync(new URL('./teacher-create-tab.vue', import.meta.url), 'utf8')

function buttonBlock(url) {
  const marker = `@click="openLink('${url}')"`
  const start = source.indexOf(marker)
  assert.ok(start >= 0, `missing customizer ${url}`)
  const end = source.indexOf('</button>', start)
  return source.slice(start, end)
}

describe('teacher create tab Math Invaders customizer', () => {
  it('sits between Mixology and Datawise with the pre-removal wiring', () => {
    const mixology = source.indexOf("openLink('https://customize-candli.pilaproject.org/mixology')")
    const invaders = source.indexOf("openLink('https://customize-candli.pilaproject.org/invaders')")
    const datawise = source.indexOf("openLink('https://datawise.accingo.co/pila/explore')")
    assert.ok(mixology >= 0 && invaders > mixology && datawise > invaders)

    const block = buttonBlock('https://customize-candli.pilaproject.org/invaders')
    assert.match(block, /src="\/Invaders\.png"/)
    assert.match(block, /alt="invaders-image"/)
    assert.match(block, /t\('math-invaders'\)/)
    assert.match(block, /<LucideIcon name="square-pen"/)
    assert.equal(block.includes('v-if'), false)
  })

  it('keeps the same customizer domain gate as trunk and a translation for the label', () => {
    assert.match(
      source,
      /const customizersAvailable = !SIMPLIFIED_STUDY_DOMAINS\.includes\(window\.location\.host\)/,
    )
    assert.match(
      source,
      /const IS_THAILAND_DOMAIN = window\.location\.host === 'thailand\.pilaproject\.org'/,
    )
    assert.equal(staticTranslations['math-invaders'].en, 'MATH INVADERS')
    const image = readFileSync(new URL('../../../public/Invaders.png', import.meta.url))
    assert.ok(image.length > 0)
  })
})
