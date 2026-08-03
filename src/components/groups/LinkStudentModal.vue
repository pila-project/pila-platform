<template>
  <div class="link-student-modal">
    <p class="link-notice">
      {{ t('per-the-pila-personal-data-protection-notice-or') }}
    </p>

    <!-- Confirm gate: toggles share link visibility -->
    <label
      class="link-checkbox-label"
      @click.prevent="toggleAgreed"
    >
      <div :class="['link-checkbox', { 'link-checkbox--checked': agreed }]">
        <LucideIcon v-if="agreed" name="check" :size="14" />
      </div>
      <span class="link-checkbox-text">{{ t('i-confirm-consent-collected') }}</span>
    </label>

    <div v-show="agreed" class="link-share">
      <p class="link-share-label">{{ t('share-this-link-with-your-students') }}</p>
      <div class="link-share-row">
        <input
          id="link-input"
          class="link-input"
          type="text"
          readonly
          :value="link"
          :aria-label="t('share-this-link-with-your-students')"
        >
        <PButton
          variant="primary"
          :text="t('copy-link')"
          @click="copyToClipboard"
        />
      </div>
      <p v-if="clipped" class="link-copied">{{ t('link-copied') }}</p>
    </div>
  </div>
</template>

<script>
import { PButton } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'

export default {
  name: 'link-student-modal',
  components: {
    PButton,
    LucideIcon,
  },
  data() {
    return {
      host: window.location.host,
      agreed: false,
      clipped: false,
    }
  },
  computed: {
    user() {
      return this.$store.state.user
    },
    link() {
      return `https://${this.host}/join/${this.user}`
    },
  },
  methods: {
    t(slug) { return this.$store.getters.t(slug) },
    toggleAgreed() {
      this.agreed = !this.agreed
      if (!this.agreed) this.clipped = false
    },
    async copyToClipboard() {
      try {
        await navigator.clipboard.writeText(this.link)
        this.clipped = true
      } catch (err) {
        alert('Error copying text: ' + this.link)
        console.error('Unable to copy text: ' + err)
      }
    },
  },
}
</script>

<style scoped>
.link-student-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 4px 4px;
}

.link-notice {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
  text-align: center;
}

.link-checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s, background 0.15s;
}

.link-checkbox-label:hover {
  border-color: #cbd5e1;
  background: #f1f5f9;
}

.link-checkbox {
  width: 20px;
  height: 20px;
  min-width: 20px;
  border-radius: 4px;
  border: 2px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
  transition: all 0.15s;
  color: white;
}

.link-checkbox--checked {
  background: #3b82f6;
  border-color: #3b82f6;
}

.link-checkbox-text {
  font-size: 13px;
  line-height: 1.5;
  color: #475569;
}

.link-share {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;
}

.link-share-label {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}

.link-share-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.link-input {
  flex: 1;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #1e293b;
  font-size: 13px;
  box-sizing: border-box;
}

.link-copied {
  margin: 0;
  font-size: 12px;
  color: #64748b;
  font-style: italic;
}
</style>
