<template>
  <div class="p-6 max-w-4xl">
    <h2 class="text-xl font-semibold text-zinc-950 mb-4">{{ t('content') || 'Content' }}</h2>

    <div class="border border-slate-200 rounded-lg p-4 mb-6 bg-white">
      <h3 class="text-sm font-medium text-zinc-800 mb-2">{{ t('import-content') || 'Import content' }}</h3>
      <PInput
        v-model="contentIdOrURL"
        :placeholder="t('add-content-by-id-or-url')"
        @keydown="() => { showInvalidMessage = false; showSuccessMessage = false; contentAddError = '' }"
        @keydown.enter="attemptAddContent"
      />
      <p v-if="showInvalidMessage" class="mt-2 text-sm text-red-600">{{ t('invalid-id-or-url') }}</p>
      <p v-if="showSuccessMessage" class="mt-2 text-sm text-green-600">{{ t('success') }}</p>
      <p v-if="contentAddError" class="mt-2 text-sm text-red-600">{{ contentAddError }}</p>
      <PButton class="mt-3" variant="primary" :text="t('add')" :loading="addingContent" @click="attemptAddContent" />
    </div>

    <div v-if="loading" class="text-sm text-slate-500">{{ t('loading') || 'Loading…' }}</div>
    <div v-else-if="!adminContent.length" class="text-sm text-slate-500">
      {{ t('no-results-found') || 'No admin content yet.' }}
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <TaggedContentCard
        v-for="id in adminContent"
        :key="id"
        :id="id"
        :removable="true"
        source="mine"
        @preview="previewing = id"
        @remove="removeAdminContent(id)"
      />
    </div>

    <PreviewModal v-if="previewing" :id="previewing" width="90vw" height="90vh" @close="previewing = null" />
  </div>
</template>

<script setup>

  import { PButton, PInput } from '@/components/ui/index.js'

  import { ref } from 'vue'
  import { validate as isUUID } from 'uuid'
  import { useStore } from 'vuex'
  import NoResultsFound from '@/components/common/no-results-found.vue'
  import PreviewModal from '@/components/common/preview-modal.vue'
  import TaggedContentCard from '@/components/tags/tagged-content-card.vue'
  import {
    isAdminContentTagged,
    waitForAdminContentTag
  } from '@/admin-teacher-grants.js'
  import setTagging from '@/utils/set-tagging.js'
  import { ADMIN_CONTENT_TAG } from '@/utils/constants.js'

  const store = useStore()
  const partition = store.getters.tagPartition

  const contentIdOrURL = ref('')
  const adminContent = ref([])
  const previewing = ref(null)
  const loading = ref(true)
  const addingContent = ref(false)
  const contentAddError = ref('')
  const removingContentId = ref(null)
  const contentRemovalError = ref('')
  const showInvalidMessage = ref(false)
  const showSuccessMessage = ref(false)

  fetchAdminContent()

  function t(slug) {
    return store.getters.t(slug)
  }

  async function attemptAddContent() {
    const content = contentIdOrURL.value.trim()
    contentAddError.value = ''

    if (!(await isValidInput(content))) {
      showInvalidMessage.value = true
      return
    }

    addingContent.value = true
    contentAddError.value = ''
    let taggingAttempted = false
    try {
      const alreadyTagged = await isAdminContentTagged(
        Agent,
        partition,
        ADMIN_CONTENT_TAG,
        content
      )
      if (!alreadyTagged) {
        taggingAttempted = true
        await setTagging({ tag: ADMIN_CONTENT_TAG, target: content, value: true }, partition)
        await waitForAdminContentTag(
          Agent,
          partition,
          ADMIN_CONTENT_TAG,
          content,
          true
        )
      }
      addAdminContent(content)
      contentIdOrURL.value = ''
      showSuccessMessage.value = true
    } catch (error) {
      console.warn(`Unable to add admin content ${content}.`, error)
      if (taggingAttempted) {
        try {
          await setTagging({ tag: ADMIN_CONTENT_TAG, target: content, value: null }, partition)
          await waitForAdminContentTag(
            Agent,
            partition,
            ADMIN_CONTENT_TAG,
            content,
            false
          )
        } catch (rollbackError) {
          console.warn(`Unable to clear failed admin content request ${content}.`, rollbackError)
        }
      }
      const detail = error?.message ? ` ${error.message}` : ''
      contentAddError.value = `Could not add content.${detail}`
    } finally {
      addingContent.value = false
    }
  }

  async function removeContent(id) {
    if (removingContentId.value) return

    removingContentId.value = id
    contentRemovalError.value = ''
    let tagRemoved = false

    try {
      tagRemoved = true
      await setTagging({ tag: ADMIN_CONTENT_TAG, target: id, value: null }, partition)
      await waitForAdminContentTag(
        Agent,
        partition,
        ADMIN_CONTENT_TAG,
        id,
        false
      )

      removeAdminContent(id)
      if (previewing.value === id) previewing.value = null
    } catch (error) {
      let rollbackError = null
      if (tagRemoved) {
        try {
          await setTagging({ tag: ADMIN_CONTENT_TAG, target: id, value: true }, partition)
          await waitForAdminContentTag(
            Agent,
            partition,
            ADMIN_CONTENT_TAG,
            id,
            true
          )
        } catch (error) {
          rollbackError = error
        }
      }

      console.warn(`Unable to remove admin content ${id}.`, error)
      if (rollbackError) {
        console.warn(`Unable to restore admin content ${id} after removal failed.`, rollbackError)
      }

      const detail = error?.message ? ` ${error.message}` : ''
      const rollbackDetail = rollbackError
        ? ' Restoring the content also failed; reload before making more changes.'
        : ''
      contentRemovalError.value = `Could not remove content.${detail}${rollbackDetail}`
    } finally {
      removingContentId.value = null
    }
  }

  async function fetchAdminContent() {
    loading.value = true
    adminContent.value = await Agent
      .query('taggings-for-tag', [partition, ADMIN_CONTENT_TAG], 'tags.knowlearning.systems')
      .then(taggings => taggings.map(({ target }) => target))
    loading.value = false
  }

  function addAdminContent(id) {
    if (!adminContent.value.includes(id)) {
      adminContent.value = [id, ...adminContent.value]
    }
  }

  function removeAdminContent(id) {
    adminContent.value = adminContent.value.filter(contentId => contentId !== id)
  }

  async function isValidInput(input) {
    if (input.startsWith('https://bettysbrain.knowlearning.systems/bb/')) {
      const possibleModuleId = input.slice(44, 80)
      return isUUID(possibleModuleId)
    }

    return isUUID(input)
  }

</script>
