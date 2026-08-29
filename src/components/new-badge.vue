<template>
  <div class="new-badge-wrapper">
    <div v-if="show" class="new-badge">
      {{ t('new') }}
    </div>

    <slot />
  </div>
</template>

<script setup>
  import { useStore } from 'vuex'

  defineProps({
    show: Boolean
  })

  const store = useStore()

  function t(slug) {
    return store.getters.t(slug)
  }
</script>

<style scoped>
.new-badge-wrapper {
  position: relative;
}

.new-badge {
  position: absolute;
  top: -8px;
  left: -8px;
  z-index: 1;
  padding: 4px 10px;
  border-radius: 12px;
  background: #16a34a;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.05em;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}
</style>