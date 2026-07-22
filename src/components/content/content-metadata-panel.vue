<template>
  <div class="content-metadata" :class="{ 'content-metadata--embedded': embedded }">
    <div v-if="!embedded" class="content-metadata-sidebar-header">
      <button
        type="button"
        class="content-metadata-close"
        :aria-label="t('close')"
        @click="emit('back')"
      >
        <LucideIcon name="x" :size="16" />
      </button>
    </div>

    <section class="metadata-section">
      <h3 class="metadata-section-heading">
        <LucideIcon name="tags" :size="14" class="metadata-section-icon" />
        {{ t('tags') }}
      </h3>
      <div class="metadata-tags-wrap">
        <TagCloud
          :target="props.id"
          :partition="props.partition"
        />
      </div>
    </section>

    <section v-if="contentMetadata" class="metadata-section">
      <h3 class="metadata-section-heading">
        <LucideIcon name="info" :size="14" class="metadata-section-icon" />
        {{ t('details') }}
      </h3>
      <dl class="metadata-grid">
        <div class="metadata-cell">
          <dt class="metadata-label">{{ t('created-by') }}</dt>
          <dd class="metadata-value">
            <DecryptedName
              :user="contentMetadata.owner"
              alias
            />
          </dd>
        </div>
        <div class="metadata-cell">
          <dt class="metadata-label">{{ t('created') }}</dt>
          <dd class="metadata-value">{{ contentCreated }}</dd>
        </div>
        <div class="metadata-cell">
          <dt class="metadata-label">{{ t('updated') }}</dt>
          <dd class="metadata-value">{{ contentUpdated }}</dd>
        </div>
        <div class="metadata-cell">
          <dt class="metadata-label">{{ t('available-languages') }}</dt>
          <dd class="metadata-value metadata-value--muted">{{ languagesDisplay }}</dd>
        </div>
      </dl>
    </section>

    <div v-else-if="metadataLoading" class="metadata-loading">
      <LucideIcon name="loader-2" :size="16" :spin="true" />
      <span>{{ t('loading') }}</span>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import DecryptedName from '@/components/common/decrypted-name.vue'
  import TagCloud from '@/components/tags/tag-cloud.vue'
  import LucideIcon from '@/components/ui/LucideIcon.vue'
  import { useStore } from 'vuex'

  const store = useStore()
  function t(slug) { return store.getters.t(slug) }

  const props = defineProps({
    id: String,
    partition: String,
    /** When true, used inside PModal — no duplicate close control */
    embedded: {
      type: Boolean,
      default: false,
    },
  })
  const emit = defineEmits(['back'])

  const contentMetadata = ref(null)
  const metadataLoading = ref(true)

  async function loadMetadata(id) {
    if (!id) return
    metadataLoading.value = true
    contentMetadata.value = null
    try {
      contentMetadata.value = await Agent.metadata(id)
    } catch {
      contentMetadata.value = null
    } finally {
      metadataLoading.value = false
    }
  }

  watch(() => props.id, (id) => loadMetadata(id), { immediate: true })

  const contentCreated = computed(() => {
    if (!contentMetadata.value?.created) return '—'
    return new Date(contentMetadata.value.created).toLocaleDateString()
  })

  const contentUpdated = computed(() => {
    if (!contentMetadata.value?.updated) return '—'
    return new Date(contentMetadata.value.updated).toLocaleDateString()
  })

  const languagesDisplay = computed(() => '—')
</script>

<style scoped>
.content-metadata {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.content-metadata--embedded {
  padding: 0 24px 8px;
}

.content-metadata-sidebar-header {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px 4px;
}

.content-metadata-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
}

.content-metadata-close:hover {
  color: #475569;
  background: #f1f5f9;
}

.metadata-section {
  padding: 16px 0;
  border-bottom: 1px solid #e2e8f0;
}

.content-metadata--embedded .metadata-section:first-of-type {
  padding-top: 8px;
}

.metadata-section:last-child {
  border-bottom: none;
  padding-bottom: 8px;
}

.metadata-section-heading {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 8px;
}

.metadata-section-icon {
  color: #2563eb;
  flex-shrink: 0;
}

.metadata-tags-wrap {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  min-height: 40px;
}

.metadata-tags-wrap :deep(.flex) {
  gap: 8px;
}

.metadata-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 24px;
  margin: 0;
}

.metadata-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.metadata-label {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  font-weight: 400;
}

.metadata-value {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  word-break: break-word;
}

.metadata-value--muted {
  color: #94a3b8;
  font-weight: 400;
}

.metadata-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  font-size: 13px;
  color: #64748b;
}

@media (max-width: 480px) {
  .metadata-grid {
    grid-template-columns: 1fr;
  }
}
</style>