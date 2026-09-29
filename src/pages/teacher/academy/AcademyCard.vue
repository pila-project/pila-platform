<template>
  <article class="academy-card">
    <div
      class="academy-cover"
      :style="cover ? { backgroundImage: `url(${cover})` } : undefined"
    />
    <div class="academy-card-body">
      <div class="academy-card-badges">
        <span v-if="isNew" class="academy-status academy-status-new">{{ labels.new }}</span>
        <span v-if="series" class="academy-status academy-status-series">{{ labels.series }}</span>
        <span v-if="required" class="academy-status academy-status-required">{{ labels.required }}</span>
        <span v-if="completed" class="academy-status academy-status-completed">{{ labels.completed }}</span>
      </div>
      <PTooltip :text="title" position="top" block only-if-overflow>
        <h3>{{ title }}</h3>
      </PTooltip>
      <PTooltip :text="description" position="top" block only-if-overflow>
        <p>{{ description }}</p>
      </PTooltip>
      <div class="academy-chips">
        <span v-for="chip in chips" :key="chip" class="academy-chip">{{ chip }}</span>
        <span v-if="durationLabel" class="academy-chip">{{ durationLabel }}</span>
      </div>
      <div
        v-if="showProgress || reserveProgress"
        class="academy-meter"
        :class="{ 'is-reserved': !showProgress }"
        :role="showProgress ? 'group' : undefined"
        :aria-label="showProgress ? labels.progress : undefined"
        :aria-hidden="showProgress ? undefined : 'true'"
      >
        <span class="academy-meter-label">{{ labels.progress }}</span>
        <span class="academy-meter-track">
          <span class="academy-meter-fill" :style="{ width: `${shownPercent}%` }" />
        </span>
        <span class="academy-meter-value">{{ shownPercent }}%</span>
      </div>
      <PButton
        variant="primary"
        :icon="actionIcon"
        :text="actionLabel"
        @click="$emit('open')"
      />
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { PButton, PTooltip } from '@/components/ui/index.js'

const props = defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  cover: { type: String, default: '' },
  chips: { type: Array, default: () => [] },
  durationLabel: { type: String, default: '' },
  isNew: Boolean,
  required: Boolean,
  series: Boolean,
  completed: Boolean,
  showProgress: Boolean,
  reserveProgress: Boolean,
  percent: { type: Number, default: 0 },
  actionLabel: { type: String, default: '' },
  actionIcon: { type: String, default: 'lucide:eye' },
  labels: { type: Object, required: true },
})

defineEmits(['open'])

const shownPercent = computed(() => Math.round(Math.min(100, Math.max(0, props.percent))))
</script>

<style src="./academy.css"></style>
