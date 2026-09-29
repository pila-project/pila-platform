<template>
  <div class="academy-reading">
    <h2 v-if="title">{{ title }}</h2>
    <template v-for="widget in widgets" :key="widget.id || widget.type">
      <div v-if="widget.type === 'markdown'" class="academy-markdown" v-html="html(widget.markdown)" />
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
      <iframe
        v-else-if="widget.type === 'iframe' && widget.url"
        class="academy-frame"
        :src="widget.url"
        :title="text(widget.title) || title"
        loading="lazy"
      />
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
      <div v-else-if="widget.type === 'accordion'" class="academy-accordion">
        <details v-for="item in widget.items" :key="item.id">
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
        <article v-for="item in widget.items" :key="item.id" class="academy-carousel-card">
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
        <li v-for="(item, index) in widget.items" :key="item.id">
          <span>{{ index + 1 }}</span>
          {{ text(item.title) }}
        </li>
      </ul>
      <div v-else-if="widget.type === 'dropIntoPlace' || widget.type === 'pairUp'">
        <p v-if="text(widget.prompt)" class="academy-widget-label">{{ text(widget.prompt) }}</p>
        <ul class="academy-pills">
          <li v-for="item in widget.items" :key="item.id">{{ text(item.title) }}</li>
        </ul>
      </div>
      <label v-else-if="widget.type === 'shortAnswer'" class="academy-write">
        <span>{{ text(widget.prompt) }}</span>
        <textarea rows="3" :placeholder="text(widget.caption)" />
      </label>
      <label v-else-if="widget.type === 'fillInTheBlank'" class="academy-write">
        <span>{{ text(widget.prompt) }}</span>
        <input type="text" />
      </label>
      <fieldset v-else-if="widget.type === 'likert'" class="academy-likert">
        <legend>{{ text(widget.prompt) }}</legend>
        <label v-for="n in scale(widget)" :key="n">
          <input type="radio" :name="widget.id" :value="n" />
          {{ n }}
        </label>
      </fieldset>
      <KnowledgeCheck
        v-else-if="widget.type === 'multipleChoice' || widget.type === 'trueFalse'"
        :q-label="text(widget.badge) || ''"
        :heading="''"
        :show-heading="Boolean(text(widget.badge))"
        :lead="''"
        :prompt="text(widget.prompt)"
        :options="(widget.options || []).map((option) => text(option.text))"
        :selected="shown(widget)"
        :correct-index="correctIndex(widget)"
        :revealed="answered(widget)"
        :show-result="showResult"
        :check-label="checkLabel"
        :continue-label="''"
        @select="pending[widget.id] = $event"
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
  return widget.url || images.value[widget.uuid] || ''
}

function collectImages(list) {
  for (const widget of list || []) {
    if (widget.type === 'image' && widget.uuid && !widget.url && images.value[widget.uuid] == null) {
      images.value = { ...images.value, [widget.uuid]: '' }
      const agent = typeof Agent === 'undefined' ? null : Agent
      agent?.state?.(widget.uuid).then((state) => {
        const url = state?.url || state?.image || state?.picture || ''
        if (typeof url === 'string' && url) images.value = { ...images.value, [widget.uuid]: url }
      }).catch(() => {})
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

function answered(widget) {
  return props.answers?.[widget.id] != null
}

function shown(widget) {
  return answered(widget) ? props.answers[widget.id] : (pending[widget.id] ?? null)
}

function correctIndex(widget) {
  return (widget.options || []).findIndex((option) => option.correct)
}

function scale(widget) {
  const min = Number.isFinite(widget.min) ? widget.min : 1
  const max = Number.isFinite(widget.max) ? widget.max : 5
  const values = []
  for (let n = min; n <= max; n += 1) values.push(n)
  return values
}

function save(widget) {
  const optionIndex = pending[widget.id]
  if (optionIndex == null || answered(widget)) return
  emit('answer', { id: widget.id, optionIndex })
}
</script>

<style src="./academy.css"></style>
