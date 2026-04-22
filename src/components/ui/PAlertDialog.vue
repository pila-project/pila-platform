<template>
  <Teleport to="body">
    <div class="alert-overlay" @keydown.esc="$emit('cancel')">
      <div class="alert-backdrop" @click="$emit('cancel')" />
      <div class="alert-dialog" role="alertdialog" aria-modal="true">
        <div class="alert-icon" :class="`alert-icon-${variant}`">
          <i :class="variantIcon" />
        </div>
        <div class="alert-content">
          <h3 class="alert-title">{{ title }}</h3>
          <p v-if="description" class="alert-description">{{ description }}</p>
        </div>
        <slot />
        <div class="alert-actions">
          <button
            class="alert-btn alert-btn-confirm"
            :class="`alert-btn-${variant}`"
            @click="$emit('confirm')"
          >
            {{ confirmText }}
          </button>
          <button
            v-if="cancelText"
            class="alert-btn alert-btn-cancel"
            :class="`alert-btn-cancel-${variant}`"
            @click="$emit('cancel')"
          >
            {{ cancelText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'notification',
    validator: v => ['error', 'success', 'notification'].includes(v),
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  confirmText: {
    type: String,
    default: 'Confirm',
  },
  cancelText: {
    type: String,
    default: 'Cancel',
  },
})

defineEmits(['confirm', 'cancel'])

const variantIcons = {
  error: 'fa-regular fa-circle-xmark',
  success: 'fa-regular fa-circle-check',
  notification: 'fa-solid fa-bell',
}

const variantIcon = computed(() => variantIcons[props.variant])

onMounted(() => document.body.style.overflow = 'hidden')
onBeforeUnmount(() => document.body.style.overflow = '')
</script>

<style scoped>
.alert-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.alert-dialog {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  width: 380px;
  max-width: 90vw;
}

/* Icon */
.alert-icon {
  width: 54px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 54px;
}

.alert-icon-error { color: #dc2626; }
.alert-icon-success { color: #16a34a; }
.alert-icon-notification { color: #2563eb; }

/* Content */
.alert-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: center;
  width: 100%;
}

.alert-title {
  font-size: 18px;
  font-weight: 600;
  line-height: 28px;
  color: #334155;
  margin: 0;
}

.alert-description {
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: #64748b;
  margin: 0;
}

/* Actions */
.alert-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.alert-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 40px;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 150ms;
}
.alert-btn:hover { opacity: 0.9; }

/* Confirm variants */
.alert-btn-confirm.alert-btn-error {
  background: #dc2626;
  color: #f8fafc;
}
.alert-btn-confirm.alert-btn-success {
  background: #16a34a;
  color: #f8fafc;
}
.alert-btn-confirm.alert-btn-notification {
  background: #2563eb;
  color: #f8fafc;
}

/* Cancel variants */
.alert-btn-cancel {
  background: white;
}
.alert-btn-cancel-error {
  border-color: #fecaca;
  color: #dc2626;
}
.alert-btn-cancel-success {
  border-color: #bbf7d0;
  color: #16a34a;
}
.alert-btn-cancel-notification {
  border-color: #bfdbfe;
  color: #2563eb;
}

/* Mobile */
@media (max-width: 480px) {
  .alert-dialog {
    width: calc(100vw - 32px);
    padding: 20px;
  }
}
</style>
