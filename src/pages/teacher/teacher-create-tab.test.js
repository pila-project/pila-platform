import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { runInNewContext } from 'node:vm'
import { validate as isUUID } from 'uuid'
import staticTranslations from '../../store/staticTranslations.js'
import { MY_CONTENT_TAG } from '../../utils/constants.js'

const source = readFileSync(new URL('./teacher-create-tab.vue', import.meta.url), 'utf8')

async function importContent(input) {
  const taggings = []
  const registered = []
  const context = {
    isUUID,
    MY_CONTENT_TAG,
    userIdOrURL: { value: input },
    showInvalidMessage: { value: false },
    showSuccessMessage: { value: false },
    setTagging: async ({ tag, target, value }) => taggings.push({ tag, target, value }),
    registerMyContentItem: id => registered.push(id),
  }
  const handlers = source.slice(
    source.indexOf('function extractContentId('),
    source.indexOf('\nfunction openLink('),
  )
  runInNewContext(handlers, context)
  await context.attemptAddContent(input)
  return { taggings, registered, context }
}

describe('teacher content imports', () => {
  const moduleId = '78fadb08-2a81-4919-93bd-b0fa7c252a29'
  const bettyBase = `https://bettysbrain.knowlearning.systems/bb/${moduleId}`

  it('tags and registers the complete Betty player URL, preserving its route and parameters', async () => {
    for (const url of [
      bettyBase,
      `${bettyBase}?oecd=true&disable-guide=true`,
      `${bettyBase}/causal-map?oecd=true&custom=true&label=My%20Module#map`,
    ]) {
      const { taggings, registered, context } = await importContent(`  ${url}\n`)
      assert.deepEqual(taggings, [{ tag: MY_CONTENT_TAG, target: url, value: true }])
      assert.deepEqual(registered, [url])
      assert.equal(context.userIdOrURL.value, '')
      assert.equal(context.showSuccessMessage.value, true)
      assert.equal(context.showInvalidMessage.value, false)
    }
  })

  it('continues importing UUIDs and other content URLs by UUID', async () => {
    for (const input of [
      `  ${moduleId}\n`,
      `https://example.com/content/${moduleId}?preview=true`,
      `https://example.com/play?id=${moduleId}`,
    ]) {
      const { taggings, registered } = await importContent(input)
      assert.deepEqual(taggings, [{ tag: MY_CONTENT_TAG, target: moduleId, value: true }])
      assert.deepEqual(registered, [moduleId])
    }
  })

  it('rejects invalid Betty module IDs without tagging or registering content', async () => {
    for (const input of [
      '',
      'not-a-content-id',
      'https://bettysbrain.knowlearning.systems/bb/not-a-uuid/causal-map',
      `https://bettysbrain.knowlearning.systems/bb/custom/causal-map?module=${moduleId}`,
    ]) {
      const { taggings, registered, context } = await importContent(input)
      assert.deepEqual(taggings, [])
      assert.deepEqual(registered, [])
      assert.equal(context.userIdOrURL.value, input)
      assert.equal(context.showSuccessMessage.value, false)
      assert.equal(context.showInvalidMessage.value, true)
    }
  })
})

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
