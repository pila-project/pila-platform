<template>
  <div class="academy-reading">
    <h2>{{ title }}</h2>
    <template v-for="(block, index) in blocks" :key="index">
      <h3 v-if="block.type === 'heading'">{{ text(block.text) }}</h3>
      <p v-else-if="block.type === 'paragraph'">{{ text(block.text) }}</p>
      <aside v-else-if="block.type === 'callout'" class="academy-callout" :class="block.kind">
        <div class="academy-callout-head">
          <LucideIcon :name="block.kind === 'tip' ? 'lightbulb' : 'badge-alert'" :size="20" />
          <strong>{{ block.kind === 'tip' ? tipLabel : insightLabel }}</strong>
        </div>
        <p>{{ text(block.text) }}</p>
      </aside>
      <figure v-else-if="block.type === 'figure'" class="academy-figure">
        <img :src="block.url" :alt="text(block.caption) || title" />
        <figcaption v-if="text(block.caption)">{{ text(block.caption) }}</figcaption>
      </figure>
      <div v-else-if="block.type === 'video'" class="academy-video">
        <div class="academy-video-stage">
          <video :src="block.url" playsinline preload="metadata" />
          <button type="button" class="academy-video-play" :aria-label="text(block.caption) || title" @click="playVideo">
            <LucideIcon name="play" :size="22" />
          </button>
        </div>
        <p v-if="text(block.caption)">{{ text(block.caption) }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { localizedText } from '@/utils/teacher-academy.js'

const props = defineProps({
  title: { type: String, default: '' },
  blocks: { type: Array, default: () => [] },
  lang: { type: String, default: 'en' },
  insightLabel: { type: String, default: 'Key Insights' },
  tipLabel: { type: String, default: 'Practical Tip' },
})

function text(value) {
  return localizedText(value, props.lang)
}

function playVideo(event) {
  const stage = event.currentTarget.parentElement
  const video = stage?.querySelector('video')
  if (!video) return
  video.controls = true
  video.play()
  event.currentTarget.hidden = true
}
</script>

<style src="./academy.css"></style>
