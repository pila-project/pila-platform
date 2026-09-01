<template>
  <div class="p-menu-anchor" ref="menuRef">
    <div aria-haspopup="true" :aria-expanded="isOpen">
      <slot name="activator" :props="{ onClick: toggle }" />
    </div>
    <Teleport to="body">
      <Transition
        enter-active-class="p-menu-enter-active"
        enter-from-class="p-menu-enter-from"
        enter-to-class="p-menu-enter-to"
        leave-active-class="p-menu-leave-active"
        leave-from-class="p-menu-leave-from"
        leave-to-class="p-menu-leave-to"
      >
        <div
          v-if="isOpen"
          ref="dropdownRef"
          role="menu"
          class="p-menu-dropdown"
          :style="floatingStyle"
          @click="onMenuItemClick"
          @keydown.esc="closeMenu"
          @keydown.arrow-down.prevent="focusNext"
          @keydown.arrow-up.prevent="focusPrev"
        >
          <slot />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script>
/** Shared across all PMenu instances — language submenus are not separate PMenus. */
let activeMenuClose = null
</script>

<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount, computed } from 'vue'

const props = defineProps({
  alignRight: Boolean,
  openUp: Boolean,
})

const isOpen = ref(false)
const menuRef = ref(null)
const dropdownRef = ref(null)
const anchorRect = ref(null)

function setActiveMenu(closeFn) {
  if (activeMenuClose && activeMenuClose !== closeFn) activeMenuClose()
  activeMenuClose = closeFn
}

function clearActiveMenu(closeFn) {
  if (activeMenuClose === closeFn) activeMenuClose = null
}

function closeMenu() {
  isOpen.value = false
}

function toggle() {
  if (isOpen.value) {
    closeMenu()
    return
  }
  updateAnchorRect()
  // Close any other root menu before this one opens so actions stay on this row.
  setActiveMenu(closeMenu)
  isOpen.value = true
}

function updateAnchorRect() {
  if (menuRef.value) {
    anchorRect.value = menuRef.value.getBoundingClientRect()
  }
}

const autoFlip = ref(false)

const floatingStyle = computed(() => {
  if (!anchorRect.value) return {}
  const r = anchorRect.value
  const style = { position: 'fixed', zIndex: 9999 }

  if (props.alignRight) {
    style.right = `${window.innerWidth - r.right}px`
  } else {
    style.left = `${r.left}px`
  }

  if (props.openUp || autoFlip.value) {
    style.bottom = `${window.innerHeight - r.top + 4}px`
  } else {
    style.top = `${r.bottom + 4}px`
  }

  return style
})

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

let positionGen = 0

watch(isOpen, async (open) => {
  const gen = ++positionGen
  if (!open) {
    clearActiveMenu(closeMenu)
    return
  }
  setActiveMenu(closeMenu)
  autoFlip.value = false
  await nextTick()
  if (gen !== positionGen || !isOpen.value) return
  // Auto-flip upward if dropdown extends beyond viewport
  if (!props.openUp && dropdownRef.value) {
    const rect = dropdownRef.value.getBoundingClientRect()
    if (rect.bottom > window.innerHeight) {
      autoFlip.value = true
    }
  }
  const items = getMenuItems()
  if (items.length) items[0].focus()
})

function onMenuItemClick(e) {
  if (!isOpen.value) return
  const menuItem = e.target.closest('[role="menuitem"]')
  if (menuItem && !menuItem.closest('[data-keep-open]')) {
    closeMenu()
  }
}

function close(e) {
  if (!isOpen.value) return
  const inAnchor = menuRef.value && menuRef.value.contains(e.target)
  const inDropdown = dropdownRef.value && dropdownRef.value.contains(e.target)
  if (!inAnchor && !inDropdown) closeMenu()
}

function onScrollOrResize() {
  if (isOpen.value) {
    updateAnchorRect()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', close, true)
  window.addEventListener('scroll', onScrollOrResize, true)
  window.addEventListener('resize', onScrollOrResize)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', close, true)
  window.removeEventListener('scroll', onScrollOrResize, true)
  window.removeEventListener('resize', onScrollOrResize)
  clearActiveMenu(closeMenu)
})
</script>

<style>
.p-menu-anchor {
  position: relative;
  display: inline-block;
}

.p-menu-dropdown {
  min-width: 12rem;
  border-radius: 0.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  padding: 4px 0;
}

.p-menu-enter-active {
  transition: opacity 100ms ease-out, transform 100ms ease-out;
}
.p-menu-leave-active {
  transition: opacity 75ms ease-in, transform 75ms ease-in;
  pointer-events: none;
}
.p-menu-enter-from,
.p-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
.p-menu-enter-to,
.p-menu-leave-from {
  opacity: 1;
  transform: scale(1);
}
</style>
