<template>
  <PILAModal
    @close="() => {
      if (state.studentDataProtectionAgreement) emit('agreed')
      emit('close')
    }"
    showCloseButton
    :closeButtonText="t('close')"
    width="90vw"
    height="90vh"
  >
    <template v-slot:title>{{ t('add-students-to-your-student-list') }}</template>

    <template v-slot:body>
      <div class="agreement-area">
        <span>
          {{ t('per-the-pila-personal-data-protection-notice-or') }}
        </span>
        <span>
          <input type="checkbox" v-model="state.studentDataProtectionAgreement" :disabled="state.studentDataProtectionAgreement" >
        </span>
      </div>
    </template>
  </PILAModal>
</template>

<script setup>
  import { ref, reactive } from 'vue'
  import { useStore } from 'vuex'
  import PILAModal from '../../components/PILAModal.vue'

  const emit = defineEmits(['agreed', 'close'])

  const store = useStore()
  function t(slug) { return store.getters.t(slug) }

  const open = ref(true)
  const state = reactive(await Agent.state())
</script>

<style scoped>
  .agreement-area {
    display: flex;
    justify-content: space-around;
    margin-bottom: 30px;
  }
  .agreement-area span {
    margin: 30px;
  }
</style>
