<template>
  <PModal
    width="480px"
    @close="$emit('close')"
  >
    <template #title>
      <div>
        <h2 class="text-lg font-semibold text-zinc-950">
          <template v-if="isEdit">{{ t('edit-sequence') }}</template>
          <template v-else>+ {{ t('create-new-sequence') }}</template>
        </h2>
        <p v-if="!isEdit" class="text-sm text-slate-500 mt-0.5">
          {{ t('create-sequence-description') }}
        </p>
      </div>
    </template>
    <template #body>
      <div v-if="!isEdit" class="info-banner">
        <i class="fa-solid fa-circle-info text-primary-500" />
        <span>{{ t('after-creating-sequence-info') }}</span>
      </div>

      <div class="flex flex-col gap-4" :class="{ 'mt-4': !isEdit }">
        <PInput
          v-model="name"
          :label="isEdit ? t('sequence-name') : t('sequence-title') + '*'"
          :placeholder="t('sequence-name-placeholder')"
        />
        <PInput
          v-model="description"
          :label="t('description')"
          :placeholder="t('sequence-description-placeholder')"
          multiline
          :rows="3"
        />
      </div>
    </template>
    <template #footer>
      <PButton variant="ghost" :text="t('cancel')" class="cancel-btn" @click="$emit('close')" />
      <PButton
        variant="primary"
        :text="isEdit ? t('save') : t('create-sequence')"
        :disabled="!name.trim()"
        @click="submit"
      />
    </template>
  </PModal>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useStore } from 'vuex'
import { PModal, PInput, PButton } from '@/components/ui/index.js'

const store = useStore()
function t(slug) { return store.getters.t(slug) }
import setTagging from '@/utils/set-tagging.js'
import { MY_CONTENT_TAG } from '@/utils/constants.js'

const props = defineProps({
  id: String, // if set, we're editing
})

const emit = defineEmits(['close', 'created', 'updated'])

const isEdit = computed(() => !!props.id)
const name = ref('')
const description = ref('')

onMounted(async () => {
  if (props.id) {
    const state = await Agent.state(props.id)
    name.value = state.name || ''
    description.value = state.description || ''
  }
})

async function submit() {
  if (!name.value.trim()) return

  if (isEdit.value) {
    const state = await Agent.state(props.id)
    state.name = name.value.trim()
    state.description = description.value.trim()
    await Agent.synced()
    emit('updated')
  } else {
    const id = await Agent.create({
      active_type: 'application/json;type=sequence',
      active: {
        name: name.value.trim(),
        description: description.value.trim(),
        items: [],
      },
    })
    await setTagging({ tag: MY_CONTENT_TAG, target: id, value: true })
    emit('created', id)
  }
}
</script>

<style scoped>
.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #eff6ff;
  border-radius: 8px;
  font-size: 13px;
  color: #1e40af;
}
.cancel-btn {
  color: #dc2626 !important;
  border-color: #fecaca !important;
}
</style>
