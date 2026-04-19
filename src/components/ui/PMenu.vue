<template>
  <div class="relative inline-block" ref="menuRef">
    <div aria-haspopup="true" :aria-expanded="isOpen">
      <slot name="activator" :props="{ onClick: toggle }" />
    </div>
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        ref="dropdownRef"
        role="menu"
        class="absolute z-40 min-w-48 rounded-lg bg-white border border-slate-200 shadow-lg py-1"
        :class="[
          alignRight ? 'right-0' : 'left-0',
          openUp ? 'bottom-full mb-2' : 'top-full mt-1'
        ]"
        @keydown.esc="isOpen = false"
        @keydown.arrow-down.prevent="focusNext"
        @keydown.arrow-up.prevent="focusPrev"
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

defineProps({
  alignRight: Boolean,
  openUp: Boolean,
})

const isOpen = ref(false)
const menuRef = ref(null)
const dropdownRef = ref(null)

function toggle() {
  isOpen.value = !isOpen.value
}

function getMenuItems() {
  if (!dropdownRef.value) return []
  return [...dropdownRef.value.querySelectorAll('[role="menuitem"]')]
}

function focusNext() {
  const items = getMenuItems()
  if (!items.length) return
  const idx = items.indexOf(document.activeElement)
  const next = idx < items.length - 1 ? idx + 1 : 0
  items[next].focus()
}

function focusPrev() {
  const items = getMenuItems()
  if (!items.length) return
  const idx = items.indexOf(document.activeElement)
  const prev = idx > 0 ? idx - 1 : items.length - 1
  items[prev].focus()
}

watch(isOpen, async (open) => {
  if (open) {
    await nextTick()
    const items = getMenuItems()
    if (items.length) items[0].focus()
  }
})

function close(e) {
  if (menuRef.value && !menuRef.value.contains(e.target)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', close))
onBeforeUnmount(() => document.removeEventListener('click', close))
</script>
