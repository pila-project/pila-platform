<template>
  <PTooltip
    :text="tooltipText"
    :position="position"
    :block="block || lines > 1"
    only-if-overflow
  >
    <span
      class="p-truncated-text"
      :class="lines > 1 ? 'p-truncated-text--clamp' : 'p-truncated-text--single'"
      :style="lines > 1 ? { '-webkit-line-clamp': String(lines) } : undefined"
    >
      <slot>{{ text }}</slot>
    </span>
  </PTooltip>
</template>

<script setup>
import { computed } from 'vue'
import PTooltip from './PTooltip.vue'

const props = defineProps({
  /** Full string shown in the tooltip (and as default slot content) */
  text: { type: String, default: '' },
  /** Max visible lines before ellipsis (1 = single-line nowrap) */
  lines: {
    type: Number,
    default: 1,
    validator: v => v >= 1 && v <= 6,
  },
  position: {
    type: String,
    default: 'bottom',
    validator: v => ['top', 'bottom', 'left', 'right'].includes(v),
  },
  /** Force block layout on the tooltip anchor (also implied when lines > 1) */
  block: { type: Boolean, default: false },
  /**
   * When false, never show the tooltip (e.g. empty / placeholder copy).
   * Defaults to showing whenever `text` is non-empty.
   */
  showTooltip: { type: Boolean, default: undefined },
})

const tooltipText = computed(() => {
  if (props.showTooltip === false) return ''
  if (props.showTooltip === true) return props.text || ''
  return props.text?.trim() ? props.text : ''
})
</script>

<style scoped>
.p-truncated-text {
  min-width: 0;
  max-width: 100%;
}

.p-truncated-text--single {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.p-truncated-text--clamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
  word-break: break-word;
}
</style>
