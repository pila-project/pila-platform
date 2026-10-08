<template>
  <div class="academy-reading">
    <h2 v-if="title">{{ title }}</h2>
    <template v-for="widget in widgets" :key="widget.id || widget.type">
      <template v-if="widget.type === 'markdown'">
        <p v-if="text(widget.header)" class="academy-widget-label">{{ text(widget.header) }}</p>
        <div class="academy-markdown" v-html="html(widget.markdown)" />
        <p v-if="text(widget.caption)" class="academy-widget-label">{{ text(widget.caption) }}</p>
      </template>
      <aside v-else-if="widget.type === 'alert'" class="academy-callout" :class="widget.kind">
        <div class="academy-callout-head">
          <LucideIcon :name="widget.kind === 'tip' ? 'lightbulb' : 'badge-alert'" :size="20" />
          <strong>{{ text(widget.title) || (widget.kind === 'tip' ? tipLabel : insightLabel) }}</strong>
        </div>
        <p>{{ text(widget.description) }}</p>
      </aside>
      <figure v-else-if="widget.type === 'image' && imageUrl(widget)" class="academy-figure">
        <img :src="imageUrl(widget)" :alt="text(widget.alt) || title" />
        <figcaption v-if="text(widget.alt)">{{ text(widget.alt) }}</figcaption>
      </figure>
      <template v-else-if="widget.type === 'iframe' && frameSrc(widget)">
        <iframe
          class="academy-frame"
          :src="frameSrc(widget)"
          :title="text(widget.title) || text(widget.caption) || title"
          loading="lazy"
          v-bind="frameAttrs(widget)"
        />
        <p v-if="text(widget.caption)" class="academy-widget-label">{{ text(widget.caption) }}</p>
      </template>
      <p v-else-if="widget.type === 'mascot'" class="academy-mascot">{{ text(widget.message) }}</p>
      <div v-else-if="widget.type === 'columns'" class="academy-widget-columns">
        <div
          v-for="column in widget.columns"
          :key="column.id"
          class="academy-widget-column"
          :style="{ flexGrow: column.width || 1 }"
        >
          <ModuleWidgets
            :widgets="column.widgets"
            :lang="lang"
            :answers="answers"
            :show-result="showResult"
            :insight-label="insightLabel"
            :tip-label="tipLabel"
            :check-label="checkLabel"
            :continue-label="continueLabel"
            @answer="$emit('answer', $event)"
          />
        </div>
      </div>
      <div v-else-if="widget.type === 'accordion' || widget.type === 'flipCard'" class="academy-accordion">
        <details v-for="item in widget.items" :key="item.id" @toggle.stop="markViewed(widget, item.id, $event)">
          <summary>{{ text(item.title) }}</summary>
          <ModuleWidgets
            :widgets="item.widgets"
            :lang="lang"
            :answers="answers"
            :show-result="showResult"
            :insight-label="insightLabel"
            :tip-label="tipLabel"
            :check-label="checkLabel"
            :continue-label="continueLabel"
            @answer="$emit('answer', $event)"
          />
        </details>
      </div>
      <div v-else-if="widget.type === 'carousel' || widget.type === 'feedbackLoop'" class="academy-carousel">
        <p v-if="text(widget.header)" class="academy-widget-label">{{ text(widget.header) }}</p>
        <article
          v-for="item in widget.items"
          :key="item.id"
          class="academy-carousel-card"
          :role="widget.requireInteraction ? 'button' : undefined"
          :tabindex="widget.requireInteraction ? 0 : undefined"
          @click="markViewed(widget, item.id)"
          @keydown.enter.prevent="markViewed(widget, item.id)"
        >
          <h3 v-if="text(item.title)">{{ text(item.title) }}</h3>
          <ModuleWidgets
            :widgets="item.widgets"
            :lang="lang"
            :answers="answers"
            :show-result="showResult"
            :insight-label="insightLabel"
            :tip-label="tipLabel"
            :check-label="checkLabel"
            :continue-label="continueLabel"
            @answer="$emit('answer', $event)"
          />
        </article>
      </div>
      <ul v-else-if="widget.type === 'causalChain'" class="academy-chain">
        <li v-if="text(widget.prompt)" class="academy-widget-label">{{ text(widget.prompt) }}</li>
        <li
          v-for="(item, index) in widget.items"
          :key="item.id"
          :role="widget.requireInteraction ? 'button' : undefined"
          :tabindex="widget.requireInteraction ? 0 : undefined"
          @click="markViewed(widget, item.id)"
          @keydown.enter.prevent="markViewed(widget, item.id)"
        >
          <span>{{ index + 1 }}</span>
          {{ text(item.title) }}
        </li>
      </ul>
      <div v-else-if="widget.type === 'checklist'" class="academy-write">
        <p v-if="text(widget.prompt)" class="academy-widget-label">{{ text(widget.prompt) }}</p>
        <label v-for="item in widget.items" :key="item.id">
          <input
            type="checkbox"
            :checked="listAnswer(widget).includes(item.id)"
            @change="toggleItem(widget, item.id)"
          />
          {{ text(item.text) }}
        </label>
      </div>
      <div v-else-if="widget.type === 'pairUp'">
        <p v-if="text(widget.prompt)" class="academy-widget-label">{{ text(widget.prompt) }}</p>
        <ul class="academy-pills">
          <li v-for="item in widget.leftItems" :key="item.id">{{ text(item.title) }}</li>
        </ul>
        <ul class="academy-pills">
          <li v-for="item in widget.rightItems" :key="item.id">{{ text(item.title) }}</li>
        </ul>
        <label v-for="item in widget.leftItems" :key="`${item.id}-pair`" class="academy-write">
          <span>{{ text(item.title) }}</span>
          <select :value="pairValue(widget, item.id)" @change="setPair(widget, item.id, $event.target.value)">
            <option value="">—</option>
            <option v-for="right in widget.rightItems" :key="right.id" :value="right.id">{{ text(right.title) }}</option>
          </select>
        </label>
      </div>
      <div v-else-if="widget.type === 'dropIntoPlace'">
        <p v-if="text(widget.prompt)" class="academy-widget-label">{{ text(widget.prompt) }}</p>
        <label v-for="(item, slot) in widget.items" :key="item.id" class="academy-write">
          <span>{{ text(item.title) || slot + 1 }}</span>
          <select :value="slotValue(widget, slot)" @change="setSlot(widget, slot, $event.target.value)">
            <option value="">—</option>
            <option v-for="(card, cardIndex) in widget.items" :key="card.id" :value="String(cardIndex)">{{ text(card.title) }}</option>
          </select>
        </label>
      </div>
      <label v-else-if="widget.type === 'shortAnswer'" class="academy-write">
        <span>{{ text(widget.prompt) }}</span>
        <textarea rows="3" :placeholder="text(widget.caption)" :value="textAnswer(widget)" @change="emitValue(widget, $event.target.value)" />
      </label>
      <p v-else-if="widget.type === 'fillInTheBlank'" class="academy-write">
        <template v-for="(part, partIndex) in blankParts(widget)" :key="partIndex">
          <span v-if="part.kind === 'text'">{{ part.text }}</span>
          <select
            v-else-if="blankMeta(widget, part.id)?.inputType === 'dropdown'"
            :value="blankValue(widget, part.id)"
            @change="setBlank(widget, part.id, $event.target.value)"
          >
            <option value="">—</option>
            <option
              v-for="option in blankMeta(widget, part.id).options"
              :key="option.id"
              :value="option.id"
            >{{ text(option.text) }}</option>
          </select>
          <input
            v-else
            type="text"
            :value="blankValue(widget, part.id)"
            @change="setBlank(widget, part.id, $event.target.value)"
          />
        </template>
      </p>
      <fieldset v-else-if="widget.type === 'likertScale'" class="academy-likert">
        <legend>{{ text(widget.prompt) }}</legend>
        <label v-for="n in scale(widget)" :key="n">
          <input type="radio" :name="widget.fqn || widget.id" :value="n" :checked="scaleAnswer(widget) === n" @change="emitValue(widget, n)" />
          {{ n }}
        </label>
      </fieldset>
      <KnowledgeCheck
        v-else-if="widget.type === 'multipleChoice' || widget.type === 'trueFalse'"
        :q-label="text(widget.badge) || ''"
        :heading="text(widget.title)"
        :show-heading="Boolean(text(widget.badge) || text(widget.title))"
        :lead="text(widget.subtitle)"
        :prompt="text(widget.prompt)"
        :feedback="feedbackFor(widget)"
        :options="(widget.options || []).map((option) => text(option.text))"
        :selected="shown(widget)"
        :correct-index="correctIndex(widget)"
        :correct-indexes="correctIndexes(widget)"
        :multiple="widget.multi === true"
        :allow-change="true"
        :revealed="choiceLocked(widget)"
        :graded="showResult && answered(widget) && pending[answerKey(widget)] == null"
        :show-result="showResult"
        :check-label="checkLabel"
        :continue-label="''"
        @select="pending[answerKey(widget)] = $event"
        @check="save(widget)"
      />
      <p v-else-if="text(widget.prompt)" class="academy-widget-label">{{ text(widget.prompt) }}</p>
    </template>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { iframeAttributes, iframeSrc } from '@/utils/accingo-module.js'
import { localizedText } from '@/utils/teacher-academy.js'
import KnowledgeCheck from './KnowledgeCheck.vue'

const props = defineProps({
  title: { type: String, default: '' },
  widgets: { type: Array, default: () => [] },
  lang: { type: String, default: 'en' },
  answers: { type: Object, default: () => ({}) },
  showResult: { type: Boolean, default: true },
  insightLabel: { type: String, default: 'Key Insights' },
  tipLabel: { type: String, default: 'Practical Tip' },
  checkLabel: { type: String, default: 'Check answer' },
  continueLabel: { type: String, default: 'Continue' },
})

const emit = defineEmits(['answer'])
const pending = reactive({})
const images = ref({})

function imageUrl(widget) {
  if (widget.uuid && images.value[widget.uuid]) return images.value[widget.uuid]
  return text(widget.url) || widget.url || ''
}

function collectImages(list) {
  for (const widget of list || []) {
    if (widget.type === 'image' && widget.uuid && images.value[widget.uuid] == null) {
      images.value = { ...images.value, [widget.uuid]: '' }
      const agent = typeof Agent === 'undefined' ? null : Agent
      const pending = agent?.download?.(widget.uuid)?.url?.()
      if (pending && typeof pending.then === 'function') {
        pending.then((url) => {
          if (typeof url === 'string' && url) images.value = { ...images.value, [widget.uuid]: url }
        }).catch(() => {})
      }
    }
    for (const column of widget.columns || []) collectImages(column.widgets)
    for (const item of widget.items || []) collectImages(item.widgets)
  }
}

watch(() => props.widgets, collectImages, { immediate: true })

function text(value) {
  return localizedText(value, props.lang)
}

function html(value) {
  const source = text(value)
  if (!source) return ''
  return DOMPurify.sanitize(marked.parse(source, { async: false }))
}

function answerKey(widget) {
  return widget.fqn || widget.id
}

function storedAnswer(widget) {
  const key = answerKey(widget)
  if (props.answers?.[key] != null) return props.answers[key]
  if (widget.id && props.answers?.[widget.id] != null) return props.answers[widget.id]
  return undefined
}

function answered(widget) {
  return storedAnswer(widget) != null
}

function shown(widget) {
  const key = answerKey(widget)
  if (pending[key] != null) return pending[key]
  return storedAnswer(widget) ?? (widget.multi ? [] : null)
}

function choiceLocked(widget) {
  return answered(widget) && pending[answerKey(widget)] == null
}

function correctIndex(widget) {
  return (widget.options || []).findIndex((option) => option.correct)
}

function correctIndexes(widget) {
  return (widget.options || []).map((option, index) => (option.correct ? index : -1)).filter((index) => index >= 0)
}

function frameSrc(widget) {
  return iframeSrc(text(widget.url) || widget.url || '', props.lang)
}

function frameAttrs(widget) {
  return iframeAttributes(widget.attributes)
}

function feedbackFor(widget) {
  const answer = storedAnswer(widget)
  if (answer == null) return ''
  if (!props.showResult || !widget.hasCorrect) return text(widget.feedback)
  const indexes = Array.isArray(answer) ? answer : [answer]
  const ids = indexes.map((index) => widget.options?.[index]?.id).filter(Boolean)
  const expected = (widget.options || []).filter((option) => option.correct).map((option) => option.id)
  const correct = ids.length === expected.length && expected.every((id) => ids.includes(id))
  if (correct) return text(widget.successFeedback) || text(widget.feedback)
  return text(widget.failureFeedback) || text(widget.feedback)
}

function listAnswer(widget) {
  const value = storedAnswer(widget)
  return Array.isArray(value) ? value : []
}

function objectAnswer(widget) {
  const value = storedAnswer(widget)
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function textAnswer(widget) {
  const value = storedAnswer(widget)
  return typeof value === 'string' ? value : ''
}

function scaleAnswer(widget) {
  const value = storedAnswer(widget)
  return Number.isFinite(value) ? value : null
}

function emitValue(widget, value) {
  emit('answer', { fqn: widget.fqn, id: widget.id, value })
}

function toggleItem(widget, itemId) {
  const current = listAnswer(widget)
  const next = current.includes(itemId) ? current.filter((id) => id !== itemId) : current.concat(itemId)
  emitValue(widget, next)
}

function pairValue(widget, leftId) {
  const pairs = objectAnswer(widget).pairs || []
  return pairs.find((pair) => pair.leftId === leftId)?.rightId || ''
}

function setPair(widget, leftId, rightId) {
  const pairs = (objectAnswer(widget).pairs || []).filter((pair) => pair.leftId !== leftId)
  if (rightId) pairs.push({ leftId, rightId })
  emitValue(widget, { pairs })
}

function slotValue(widget, slot) {
  const value = objectAnswer(widget)[String(slot)]
  return value == null ? '' : String(value)
}

function setSlot(widget, slot, cardIndex) {
  const next = { ...objectAnswer(widget) }
  if (cardIndex === '') delete next[String(slot)]
  else next[String(slot)] = Number(cardIndex)
  emitValue(widget, next)
}

function blankParts(widget) {
  const source = text(widget.prompt)
  const parts = []
  const pattern = /\[([a-zA-Z0-9_]+)\]/g
  let last = 0
  for (const match of source.matchAll(pattern)) {
    if (match.index > last) parts.push({ kind: 'text', text: source.slice(last, match.index) })
    parts.push({ kind: 'blank', id: match[1] })
    last = match.index + match[0].length
  }
  if (last < source.length) parts.push({ kind: 'text', text: source.slice(last) })
  if (!parts.some((part) => part.kind === 'blank') && (widget.blanks || []).length) {
    return [{ kind: 'text', text: source }].concat(widget.blanks.map((blank) => ({ kind: 'blank', id: blank.id })))
  }
  return parts.length ? parts : [{ kind: 'text', text: source }]
}

function blankMeta(widget, blankId) {
  return (widget.blanks || []).find((blank) => blank.id === blankId)
}

function blankValue(widget, blankId) {
  return objectAnswer(widget)[blankId] || ''
}

function setBlank(widget, blankId, value) {
  emitValue(widget, { ...objectAnswer(widget), [blankId]: value })
}

function markViewed(widget, itemId, event) {
  if (!widget?.requireInteraction || !itemId) return
  if (event && event.target && event.currentTarget && event.target !== event.currentTarget) return
  if (event?.newState === 'closed') return
  const current = objectAnswer(widget)
  if (widget.type === 'flipCard') {
    const seen = new Set(Array.isArray(current.openedIds) ? current.openedIds : [])
    if (seen.has(itemId)) return
    seen.add(itemId)
    const flipped = Math.max(seen.size, Number(current.flipped) || 0)
    emitValue(widget, { flipped, openedIds: [...seen] })
    return
  }
  const viewedIds = new Set(Array.isArray(current.viewedItemIds) ? current.viewedItemIds : [])
  viewedIds.add(itemId)
  emitValue(widget, { viewedItemIds: [...viewedIds], currentId: itemId })
}

function scale(widget) {
  const min = Number.isFinite(widget.min) ? widget.min : 1
  const max = Number.isFinite(widget.max) ? widget.max : 5
  const values = []
  for (let n = min; n <= max; n += 1) values.push(n)
  return values
}

function save(widget) {
  const key = answerKey(widget)
  const picked = pending[key]
  if (picked == null) return
  if (widget.multi) emit('answer', { fqn: widget.fqn, id: widget.id, optionIndexes: picked })
  else emit('answer', { fqn: widget.fqn, id: widget.id, optionIndex: picked })
  pending[key] = null
}
</script>

<style src="./academy.css"></style>
