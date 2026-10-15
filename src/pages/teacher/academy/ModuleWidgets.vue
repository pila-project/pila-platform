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
      <template v-else-if="widget.type === 'image' && (imageUrl(widget) || text(widget.header) || text(widget.caption))">
        <p v-if="text(widget.header)" class="academy-widget-label">{{ text(widget.header) }}</p>
        <figure v-if="imageUrl(widget)" class="academy-figure" :class="figureClass(widget)" :style="imageSize(widget)">
          <img :src="imageUrl(widget)" :alt="text(widget.alt) || ''" />
          <figcaption v-if="text(widget.caption)">{{ text(widget.caption) }}</figcaption>
        </figure>
      </template>
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
      <div v-else-if="widget.type === 'mascot'" class="academy-mascot-row">
        <img :src="mascotSrc(widget)" alt="" />
        <div v-if="text(widget.message)" class="academy-mascot academy-markdown" v-html="html(widget.message)" />
      </div>
      <div v-else-if="widget.type === 'columns'" class="academy-widget-columns">
        <div
          v-for="column in widget.columns"
          :key="column.id"
          class="academy-widget-column"
          :style="columnStyle(column)"
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
      <div v-else-if="widget.type === 'accordion'" class="academy-accordion">
        <p v-if="text(widget.header)" class="academy-widget-label">{{ text(widget.header) }}</p>
        <p v-if="text(widget.caption)" class="academy-widget-label">{{ text(widget.caption) }}</p>
        <details v-for="item in widget.items" :key="item.id" @toggle.stop="markViewed(widget, item.id, $event)">
          <summary>{{ text(item.title) }}</summary>
          <figure v-if="itemImage(item)" class="academy-figure">
            <img :src="itemImage(item)" alt="" />
          </figure>
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
      <div v-else-if="widget.type === 'flipCard'" class="academy-carousel">
        <p v-if="text(widget.header)" class="academy-widget-label">{{ text(widget.header) }}</p>
        <p v-if="text(widget.caption)" class="academy-widget-label">{{ text(widget.caption) }}</p>
        <article v-if="flipItem(widget)" class="academy-carousel-card">
          <figure v-if="itemImage(flipItem(widget))" class="academy-figure">
            <img :src="itemImage(flipItem(widget))" alt="" />
          </figure>
          <h3 v-if="text(flipItem(widget).title)">{{ text(flipItem(widget).title) }}</h3>
          <ModuleWidgets
            :widgets="flipItem(widget).widgets"
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
        <button v-if="(widget.items || []).length" type="button" class="academy-step-btn" @click="flip(widget)">{{ chrome('flip') }}</button>
      </div>
      <div v-else-if="widget.type === 'carousel'" class="academy-carousel">
        <p v-if="text(widget.header)" class="academy-widget-label">{{ text(widget.header) }}</p>
        <p v-if="text(widget.caption)" class="academy-widget-label">{{ text(widget.caption) }}</p>
        <p v-if="(widget.items || []).length" class="academy-widget-label">{{ chrome('step', { current: carouselIndex(widget) + 1, total: widget.items.length }) }}</p>
        <article v-if="carouselItem(widget)" class="academy-carousel-card">
          <figure v-if="itemImage(carouselItem(widget))" class="academy-figure">
            <img :src="itemImage(carouselItem(widget))" alt="" />
          </figure>
          <h3 v-if="text(carouselItem(widget).title)">{{ text(carouselItem(widget).title) }}</h3>
          <ModuleWidgets
            :widgets="carouselItem(widget).widgets"
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
        <div v-if="(widget.items || []).length > 1" class="academy-step-row">
          <button type="button" class="academy-step-btn" @click="goCarousel(widget, carouselIndex(widget) - 1)">{{ chrome('previous') }}</button>
          <button type="button" class="academy-step-btn" @click="goCarousel(widget, carouselIndex(widget) + 1)">{{ chrome('next') }}</button>
        </div>
      </div>
      <div v-else-if="widget.type === 'feedbackLoop' || widget.type === 'causalChain'" class="academy-carousel">
        <p v-if="text(widget.header)" class="academy-widget-label">{{ text(widget.header) }}</p>
        <p v-if="text(widget.prompt)" class="academy-widget-label">{{ text(widget.prompt) }}</p>
        <p v-if="text(widget.caption)" class="academy-widget-label">{{ text(widget.caption) }}</p>
        <div class="academy-chain-row">
          <template v-for="(item, index) in widget.items" :key="item.id">
            <span v-if="widget.type === 'causalChain' && index > 0" class="academy-chain-arrow" aria-hidden="true">→</span>
            <button
              type="button"
              class="academy-step-btn"
              :aria-expanded="openIndex(widget) === index"
              @click="toggleNode(widget, index)"
            >
              {{ text(item.title) || chrome('item', { n: index + 1 }) }}
            </button>
          </template>
        </div>
        <article v-if="openItem(widget)" class="academy-carousel-card">
          <figure v-if="itemImage(openItem(widget))" class="academy-figure">
            <img :src="itemImage(openItem(widget))" alt="" />
          </figure>
          <ModuleWidgets
            :widgets="openItem(widget).widgets"
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
      <div v-else-if="widget.type === 'checklist'" class="academy-write">
        <p v-if="text(widget.header)" class="academy-widget-label">{{ text(widget.header) }}</p>
        <p v-if="text(widget.prompt)" class="academy-widget-label">{{ text(widget.prompt) }}</p>
        <p v-if="text(widget.subtitle)" class="academy-widget-label">{{ text(widget.subtitle) }}</p>
        <p v-if="text(widget.caption)" class="academy-widget-label">{{ text(widget.caption) }}</p>
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
        <p v-if="text(widget.header)" class="academy-widget-label">{{ text(widget.header) }}</p>
        <p v-if="text(widget.prompt)" class="academy-widget-label">{{ text(widget.prompt) }}</p>
        <p v-if="text(widget.caption)" class="academy-widget-label">{{ text(widget.caption) }}</p>
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
        <p v-if="text(widget.header)" class="academy-widget-label">{{ text(widget.header) }}</p>
        <p v-if="text(widget.prompt)" class="academy-widget-label">{{ text(widget.prompt) }}</p>
        <p v-if="text(widget.caption)" class="academy-widget-label">{{ text(widget.caption) }}</p>
        <label v-for="(item, slot) in widget.items" :key="item.id" class="academy-write">
          <span>{{ chrome('target', { n: slot + 1 }) }}</span>
          <select :value="slotValue(widget, slot)" @change="setSlot(widget, slot, $event.target.value)">
            <option value="">—</option>
            <option v-for="(card, cardIndex) in widget.items" :key="card.id" :value="String(cardIndex)">{{ text(card.title) || chrome('card', { n: cardIndex + 1 }) }}</option>
          </select>
        </label>
        <article v-if="dropCard(widget)" class="academy-carousel-card">
          <figure v-if="itemImage(dropCard(widget))" class="academy-figure">
            <img :src="itemImage(dropCard(widget))" alt="" />
          </figure>
          <h3 v-if="text(dropCard(widget).title)">{{ text(dropCard(widget).title) }}</h3>
          <ModuleWidgets
            :widgets="dropCard(widget).widgets"
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
        <p v-for="note in dropNotes(widget)" :key="note.id" class="academy-widget-label">{{ note.note }}</p>
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
import { iframeAttributes, iframeSrc, mascotAssetPath, prefixAccingoImage, resolveLocalizedAssetId } from '@/utils/accingo-module.js'
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
const localUi = reactive({})

const CHROME = {
  flip: { en: 'Flip card', th: 'พลิกการ์ด' },
  previous: { en: 'Previous step', th: 'ขั้นตอนก่อนหน้า' },
  next: { en: 'Next step', th: 'ขั้นตอนถัดไป' },
  step: { en: 'Step {current} of {total}', th: 'ขั้นตอนที่ {current} จาก {total}' },
  target: { en: 'Target {n}', th: 'เป้าหมาย {n}' },
  card: { en: 'Card {n}', th: 'การ์ด {n}' },
  item: { en: 'Item {n}', th: 'รายการ {n}' },
}

function chrome(key, vars) {
  const short = String(props.lang || 'en').split(/[-_]/)[0].toLowerCase()
  let value = CHROME[key]?.[short] || CHROME[key]?.en || ''
  for (const [name, entry] of Object.entries(vars || {})) value = value.replaceAll(`{${name}}`, String(entry))
  return value
}

function assetId(value) {
  return resolveLocalizedAssetId(value, props.lang).trim()
}

function fileUrl(id, fallback) {
  const resolved = assetId(id)
  if (resolved) return images.value[resolved] || ''
  return prefixAccingoImage(text(fallback))
}

function imageUrl(widget) {
  return fileUrl(widget?.uuid, widget?.url)
}

function itemImage(item) {
  return fileUrl(item?.imageUuid, item?.imageUrl)
}

function figureClass(widget) {
  const width = Number(widget?.maxWidth)
  return {
    'academy-figure-capped': Number.isFinite(width) && width > 0,
    'academy-figure-center': widget?.style?.horizontalAlignment === 'center',
  }
}

function imageSize(widget) {
  const width = Number(widget?.maxWidth)
  if (!Number.isFinite(width) || width <= 0) return undefined
  return { '--academy-img-max': `${width}px` }
}

function columnStyle(column) {
  const span = Number(column?.width)
  const units = Number.isFinite(span) && span > 0 ? Math.min(span, 12) : 12
  return { '--academy-col': String(units) }
}

function mascotSrc(widget) {
  return prefixAccingoImage(mascotAssetPath(widget))
}

function queueDownload(rawId) {
  const id = assetId(rawId)
  if (!id || images.value[id] != null) return
  images.value = { ...images.value, [id]: '' }
  const agent = typeof Agent === 'undefined' ? null : Agent
  const pendingDownload = agent?.download?.(id)?.url?.()
  if (pendingDownload && typeof pendingDownload.then === 'function') {
    pendingDownload.then((url) => {
      if (typeof url === 'string' && url) images.value = { ...images.value, [id]: url }
    }).catch(() => {})
  }
}

function collectImages(list) {
  for (const widget of list || []) {
    if (widget.type === 'image') queueDownload(widget.uuid)
    for (const column of widget.columns || []) collectImages(column.widgets)
    for (const item of widget.items || []) {
      queueDownload(item.imageUuid)
      collectImages(item.widgets)
    }
  }
}

watch(() => [props.widgets, props.lang], () => collectImages(props.widgets), { immediate: true })

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
  if (cardIndex === '') {
    delete next[String(slot)]
    delete next.selectedCardIndex
  } else {
    const chosen = Number(cardIndex)
    for (const key of Object.keys(next)) {
      if (key === 'selectedCardIndex') continue
      if (Number(next[key]) === chosen) delete next[key]
    }
    next[String(slot)] = chosen
    next.selectedCardIndex = chosen
  }
  emitValue(widget, next)
}

function dropCard(widget) {
  const answer = objectAnswer(widget)
  let index = Number.isInteger(answer.selectedCardIndex) ? answer.selectedCardIndex : null
  if (index == null) {
    const slots = widget.items || []
    for (let slot = slots.length - 1; slot >= 0; slot -= 1) {
      const value = answer[String(slot)]
      if (value != null && value !== '') {
        index = Number(value)
        break
      }
    }
  }
  return Number.isInteger(index) ? widget.items?.[index] || null : null
}

function dropNotes(widget) {
  if (!props.showResult || !widget.hasCorrect) return []
  const answer = objectAnswer(widget)
  const pairs = widget.correctAnswer || []
  return (widget.items || []).flatMap((item, cardIndex) => {
    const slot = Object.keys(answer).find((key) => key !== 'selectedCardIndex' && Number(answer[key]) === cardIndex)
    if (slot == null) return []
    const match = pairs.some((pair) => String(pair.leftId) === String(slot) && String(pair.rightId) === String(cardIndex))
    const note = match ? text(item.successFeedback) : text(item.failureFeedback)
    return note ? [{ id: item.id, note }] : []
  })
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

function uiKey(widget) {
  return widget.fqn || widget.id
}

function remembered(widget, field, fallback) {
  const local = localUi[uiKey(widget)]
  if (local && Object.prototype.hasOwnProperty.call(local, field)) return local[field]
  const stored = objectAnswer(widget)
  if (Object.prototype.hasOwnProperty.call(stored, field)) return stored[field]
  return fallback
}

function remember(widget, patch) {
  const key = uiKey(widget)
  localUi[key] = { ...(localUi[key] || {}), ...patch }
}

function markViewed(widget, itemId, event) {
  if (!widget?.requireInteraction || !itemId) return
  if (event && event.target && event.currentTarget && event.target !== event.currentTarget) return
  if (event?.newState === 'closed') return
  const current = objectAnswer(widget)
  const viewedIds = new Set(Array.isArray(current.viewedItemIds) ? current.viewedItemIds : [])
  viewedIds.add(itemId)
  emitValue(widget, { viewedItemIds: [...viewedIds], currentId: itemId })
}

function flipCount(widget) {
  const value = remembered(widget, 'flipped', 0)
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

function flipItem(widget) {
  const items = widget.items || []
  if (!items.length) return null
  return items[flipCount(widget) % items.length]
}

function flip(widget) {
  const next = flipCount(widget) + 1
  remember(widget, { flipped: next })
  if (widget.requireInteraction) emitValue(widget, { flipped: next })
}

function carouselIndex(widget) {
  const count = widget.items?.length || 0
  if (!count) return 0
  const raw = Number(remembered(widget, 'activeIndex', 0)) || 0
  return ((raw % count) + count) % count
}

function carouselItem(widget) {
  return widget.items?.[carouselIndex(widget)] || null
}

function goCarousel(widget, nextIndex) {
  const items = widget.items || []
  if (!items.length) return
  const current = carouselIndex(widget)
  const next = ((nextIndex % items.length) + items.length) % items.length
  remember(widget, { activeIndex: next })
  if (!widget.requireInteraction) return
  const viewed = new Set(objectAnswer(widget).viewedItemIds || [])
  if (items[current]?.id) viewed.add(items[current].id)
  if (items[next]?.id) viewed.add(items[next].id)
  emitValue(widget, { activeIndex: next, viewedItemIds: [...viewed], currentId: items[next]?.id })
}

function openIndex(widget) {
  const value = remembered(widget, 'openItemIndex', null)
  return Number.isInteger(value) ? value : null
}

function openItem(widget) {
  const index = openIndex(widget)
  if (index == null) return null
  return widget.items?.[index] || null
}

function toggleNode(widget, index) {
  const items = widget.items || []
  const open = openIndex(widget) === index ? null : index
  remember(widget, { openItemIndex: open })
  if (!widget.requireInteraction) return
  const viewed = new Set(objectAnswer(widget).viewedItemIds || [])
  if (open != null && items[open]?.id) viewed.add(items[open].id)
  emitValue(widget, {
    openItemIndex: open,
    viewedItemIds: [...viewed],
    currentId: open == null ? null : items[open]?.id,
  })
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
