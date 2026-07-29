<template>
  <PModal
    @close="handleClose"
    persistent
    width="540px"
  >
    <template v-slot:title>
      <h2 class="text-lg font-semibold text-zinc-950">{{ t('add-students-to-your-student-list') }}</h2>
    </template>

    <template v-slot:body>
      <div class="agreement-body">
        <div class="agreement-icon-row">
          <div class="agreement-icon-circle">
            <LucideIcon name="shield-check" :size="24" />
          </div>
        </div>
        <p class="agreement-text">
          {{ t('per-the-pila-personal-data-protection-notice-or') }}
        </p>
        <label class="agreement-checkbox-label" @click.prevent="confirmed = !confirmed">
          <div :class="['agreement-checkbox', { 'agreement-checkbox--checked': confirmed }]">
            <LucideIcon v-if="confirmed" name="check" :size="14" />
          </div>
          <span class="agreement-checkbox-text">{{ t('i-confirm-consent-collected') }}</span>
        </label>
      </div>
    </template>

    <template v-slot:footer>
      <PButton variant="secondary" color="danger" :text="t('cancel')" @click="handleClose" />
      <PButton
        variant="primary"
        :text="t('done')"
        :disabled="!confirmed"
        @click="handleDone"
      />
    </template>
  </PModal>
</template>

<script setup>
  import { ref } from 'vue'
  import { useStore } from 'vuex'
  import { PModal, PButton } from '@/components/ui/index.js'
  import LucideIcon from '@/components/ui/LucideIcon.vue'

  const emit = defineEmits(['agreed', 'close'])

  const store = useStore()
  function t(slug) { return store.getters.t(slug) }

  /**
   * Always require a fresh confirm each open (product: every student create).
   * Still persist studentDataProtectionAgreement on accept for compliance audit.
   */
  const confirmed = ref(false)

  async function persistAgreementFlag() {
    try {
      const state = await Agent.state()
      if (!state.studentDataProtectionAgreement) {
        state.studentDataProtectionAgreement = true
        await Agent.synced()
      }
    } catch (e) {
      console.warn('[TeacherStudentAgreement] persist failed', e)
    }
  }

  async function handleDone() {
    if (!confirmed.value) return
    await persistAgreementFlag()
    emit('agreed')
    emit('close')
  }

  function handleClose() {
    // Cancel / X — do not treat as agreed
    emit('close')
  }
</script>

<style scoped>
.agreement-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.agreement-icon-row {
  display: flex;
  justify-content: center;
}

.agreement-icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #eff6ff;
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.agreement-text {
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
  text-align: center;
  max-width: 440px;
}

.agreement-checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  width: 100%;
  transition: border-color 0.15s, background 0.15s;
}

.agreement-checkbox-label:hover {
  border-color: #cbd5e1;
  background: #f1f5f9;
}

.agreement-checkbox {
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
}

.agreement-checkbox--checked {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.agreement-checkbox-text {
  font-size: 13px;
  line-height: 1.5;
  color: #475569;
}
</style>
