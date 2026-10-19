import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

const srcRoot = fileURLToPath(new URL('../../', import.meta.url))

const MODEL_ATTR = /^(?::|v-bind:)?model-value$|^(?::|v-bind:)?modelValue$|^v-model$/
const UNSTABLE = /\|\|\s*\[\s*\]|\?\?\s*\[\s*\]|\|\|\s*\{\s*\}|\?\?\s*\{\s*\}/

function vueFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...vueFiles(path))
    else if (entry.name.endsWith('.vue')) files.push(path)
  }
  return files
}

function tagBindings(source) {
  const bindings = []
  const tagRe = /<PUnifiedFilter\w*(?=[\s/>])/g
  let match
  while ((match = tagRe.exec(source))) {
    let quote = null
    let end = match.index + match[0].length
    for (; end < source.length; end++) {
      const char = source[end]
      if (quote) {
        if (char === quote) quote = null
        continue
      }
      if (char === '"' || char === "'") {
        quote = char
        continue
      }
      if (char === '>') break
    }
    const attrs = source.slice(match.index + match[0].length, end)
    const attrRe = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g
    let attr
    while ((attr = attrRe.exec(attrs))) {
      if (!MODEL_ATTR.test(attr[1])) continue
      const value = attr[2] ?? attr[3] ?? attr[4] ?? ''
      bindings.push({ name: attr[1], value })
    }
  }
  return bindings
}

describe('PUnifiedFilter model bindings stay referentially stable', () => {
  it('rejects a fresh array or object on every PUnifiedFilter model binding', () => {
    const failures = []
    for (const file of vueFiles(srcRoot)) {
      const source = readFileSync(file, 'utf8')
      for (const binding of tagBindings(source)) {
        if (UNSTABLE.test(binding.value)) {
          failures.push(`${file}: ${binding.name}="${binding.value}"`)
        }
      }
    }
    assert.deepEqual(failures, [])
  })
})
