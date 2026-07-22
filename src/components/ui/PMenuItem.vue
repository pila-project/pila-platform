<template>
  <div
    class="menu-item-wrapper"
    :class="{ 'menu-item-has-submenu': hasSubmenu }"
    @mouseenter="showSubmenu = true"
    @mouseleave="showSubmenu = false"
  >
    <button
      role="menuitem"
      tabindex="-1"
      class="menu-item-btn w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors"
      :class="buttonClasses"
      :data-keep-open="keepOpen || undefined"
      @click="$emit('click', $event)"
      @keydown.enter.prevent="$emit('click', $event)"
      @keydown.space.prevent="$emit('click', $event)"
    >
      <span v-if="prependIcon !== undefined" class="w-5 text-center inline-flex justify-center" :style="iconStyle">
        <LucideIcon v-if="prependIcon && prependIcon.startsWith('lucide:')" :name="prependIcon.slice(7)" :size="14" />
        <i v-else-if="prependIcon" :class="prependIcon" />
      </span>
      <span class="flex-1">{{ title }}</span>
      <template v-if="appendIcon && !hasSubmenu">
        <LucideIcon
          v-if="appendIcon.startsWith('lucide:')"
          :name="appendIcon.slice(7)"
          :size="14"
          class="w-5 text-center"
          :class="appendIconClass"
        />
        <i v-else :class="[appendIcon, appendIconClass, 'w-5 text-center']" />
      </template>
      <LucideIcon v-if="hasSubmenu" name="chevron-right" :size="12" class="w-5 text-center text-slate-400" />
    </button>
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="hasSubmenu && showSubmenu"
        class="submenu"
      >
        <slot name="submenu" />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, useSlots, computed } from 'vue'
import LucideIcon from './LucideIcon.vue'

const props = defineProps({
  title: String,
  prependIcon: String,
  appendIcon: String,
  active: Boolean,
  danger: Boolean,
  /** Needs-attention state (e.g. missing encryption key) */
  attention: Boolean,
  keepOpen: Boolean,
})

defineEmits(['click'])

const slots = useSlots()
const hasSubmenu = !!slots.submenu
const showSubmenu = ref(false)

const buttonClasses = computed(() => {
  if (props.attention) return 'menu-item-attention'
  if (props.danger) return 'menu-item-danger text-slate-700 hover:bg-slate-50'
  if (props.active) return 'bg-primary-50 text-primary-600'
  return 'text-slate-700 hover:bg-slate-50'
})

const iconStyle = computed(() => {
  if (props.danger || props.attention) return { color: 'var(--color-danger-600)' }
  return { color: 'var(--color-slate-400)' }
})

const appendIconClass = computed(() => {
  if (props.attention || props.danger) return 'menu-item-append-attention'
  return 'text-slate-400'
})
</script>

<style scoped>
.menu-item-wrapper {
  position: relative;
}

.menu-item-btn {
  border: none;
  background: transparent;
  cursor: pointer;
}

.menu-item-attention {
  background: var(--color-danger-50);
  color: var(--color-danger-600);
}

.menu-item-attention:hover {
  background: #fecaca;
}

.menu-item-append-attention {
  color: var(--color-danger-600);
}

.submenu {
  position: absolute;
  left: 100%;
  bottom: 0;
  min-width: 200px;
  white-space: nowrap;
  background: white;
  border: 1px solid var(--color-slate-200);
  border-radius: 10px;
  box-shadow: 4px 0 16px rgba(0,0,0,0.08);
  padding: 4px 0;
  z-index: 50;
}
</style>
