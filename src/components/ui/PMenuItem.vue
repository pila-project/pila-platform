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
      class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
      :class="{ 'bg-primary-50 text-primary-600': active }"
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
        <LucideIcon v-if="appendIcon.startsWith('lucide:')" :name="appendIcon.slice(7)" :size="14" class="w-5 text-center text-slate-400" />
        <i v-else :class="appendIcon" class="w-5 text-center text-slate-400" />
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
import { ref, useSlots } from 'vue'
import LucideIcon from './LucideIcon.vue'

const props = defineProps({
  title: String,
  prependIcon: String,
  appendIcon: String,
  active: Boolean,
  danger: Boolean,
})

defineEmits(['click'])

const slots = useSlots()
const hasSubmenu = !!slots.submenu
const showSubmenu = ref(false)

const iconStyle = props.danger ? { color: 'var(--color-danger-600)' } : { color: 'var(--color-slate-400)' }
</script>

<style scoped>
.menu-item-wrapper {
  position: relative;
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
