<template>
  <div class="login-code-pad">
    <div class="login-code-display" :aria-label="t('login-code')">
      <span
        v-for="(ch, i) in displaySlots"
        :key="i"
        class="login-code-slot"
        :class="{ filled: !!ch }"
      >
        <i v-if="ch && faIconForCodeChar(ch)" :class="faIconForCodeChar(ch)" />
        <span v-else-if="ch">{{ glyphForCodeChar(ch) }}</span>
      </span>
    </div>

    <div class="login-code-grid" role="group" :aria-label="t('sign-in-with-code')">
      <button
        v-for="ch in LOGIN_CODE_PAD_CHARS"
        :key="ch"
        type="button"
        class="login-code-key"
        :disabled="modelValue.length >= LOGIN_CODE_LENGTH || signingIn"
        @click="append(ch)"
      >
        <i v-if="faIconForCodeChar(ch)" :class="faIconForCodeChar(ch)" />
        <span v-else>{{ glyphForCodeChar(ch) }}</span>
      </button>
    </div>

    <div class="login-code-actions">
      <button
        type="button"
        class="login-code-action"
        :disabled="!modelValue.length || signingIn"
        :aria-label="t('back')"
        @click="backspace"
      >
        <LucideIcon name="delete" :size="16" />
      </button>
      <button
        type="button"
        class="login-code-action login-code-action-primary"
        :disabled="!canSubmit || signingIn"
        @click="$emit('submit')"
      >
        <LucideIcon v-if="signingIn" name="loader-2" :size="16" :spin="true" />
        {{ t('enter') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import {
  LOGIN_CODE_PAD_CHARS,
  LOGIN_CODE_LENGTH,
  glyphForCodeChar,
  faIconForCodeChar,
  isCompleteLoginCode,
} from '@/utils/login-code-symbols.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  signingIn: Boolean,
})

const emit = defineEmits(['update:modelValue', 'submit'])

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const displaySlots = computed(() => {
  const chars = props.modelValue.split('')
  return Array.from({ length: LOGIN_CODE_LENGTH }, (_, i) => chars[i] || '')
})

const canSubmit = computed(() => isCompleteLoginCode(props.modelValue))

function append(ch) {
  if (props.modelValue.length >= LOGIN_CODE_LENGTH) return
  emit('update:modelValue', props.modelValue + ch)
}

function backspace() {
  emit('update:modelValue', props.modelValue.slice(0, -1))
}
</script>

<style scoped>
/*
  Keypad fills remaining panel height (parent is flex column with max-height).
  No aspect-ratio on keys — squares force overflow on short viewports.
  Grid rows share leftover space equally so the whole pad stays on-screen.
*/
.login-code-pad {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  gap: clamp(6px, 1vh, 12px);
  --login-back-color: #2563eb;
  --login-tab-active-bg: #2563eb;
}

.login-code-display {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  gap: clamp(4px, 1.2vw, 8px);
  padding: clamp(6px, 1vh, 12px) 10px;
  background: #f3f4f6;
  border-radius: 12px;
  min-height: clamp(40px, 5.5vh, 56px);
  max-height: 56px;
  align-items: center;
  box-sizing: border-box;
}

.login-code-slot {
  width: clamp(22px, 4vw, 32px);
  height: clamp(24px, 4vh, 34px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 2px solid #cbd5e1;
  font-size: clamp(12px, 1.8vh, 16px);
  color: #020617;
}

.login-code-slot.filled {
  border-bottom-color: #2563eb;
}

.login-code-grid {
  /* Take all leftover height between display and actions */
  flex: 1 1 auto;
  min-height: 0;
  /* Prefer ~min(available, ~280px) without forcing page scroll */
  max-height: min(36vh, 280px);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  grid-template-rows: repeat(5, minmax(0, 1fr));
  gap: clamp(3px, 0.7vh, 6px);
}

.login-code-key {
  min-height: 0;
  min-width: 0;
  height: 100%;
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: clamp(5px, 1vh, 8px);
  background: #fff;
  color: #020617;
  font-size: clamp(11px, 1.7vh, 15px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 150ms, border-color 150ms;
  /* No aspect-ratio: height comes only from the grid row */
  padding: 0;
}

.login-code-key:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.login-code-key:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.login-code-actions {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
}

.login-code-action {
  flex: 1;
  height: clamp(34px, 4.6vh, 42px);
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #2563eb;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.login-code-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.login-code-action-primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #f8fafc;
}

/* Short viewports: shrink grid cap so chrome + pad fit without scroll */
@media (max-height: 740px) {
  .login-code-grid {
    max-height: min(32vh, 240px);
  }
}

@media (max-height: 640px) {
  .login-code-grid {
    max-height: min(30vh, 200px);
  }

  .login-code-display {
    min-height: 36px;
    max-height: 44px;
    padding: 4px 8px;
  }

  .login-code-action {
    height: 34px;
    font-size: 13px;
  }
}

@media (max-height: 540px) {
  .login-code-grid {
    max-height: min(28vh, 170px);
  }
}
</style>
