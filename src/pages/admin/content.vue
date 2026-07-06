<template>
  <v-container>
    <div class="text-h3 mb-6">
      Content
    </div>

    <v-card class="mb-6" max-width="640">
      <v-card-title>Import content</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="contentIdOrURL"
          :placeholder="t('add-content-by-id-or-url')"
          @keydown="() => {
            showInvalidMessage = false
            showSuccessMessage = false
          }"
          @keydown.enter="attemptAddContent"
        />
        <v-alert
          v-model="showInvalidMessage"
          :text="t('invalid-id-or-url')"
          type="error"
          closable
        />
        <v-alert
          v-model="showSuccessMessage"
          :text="t('success')"
          type="success"
          closable
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          :disabled="!contentIdOrURL"
          :loading="addingContent"
          :text="t('add')"
          @click="attemptAddContent"
        />
      </v-card-actions>
    </v-card>

    <v-progress-linear v-if="loading" indeterminate />
    <NoResultsFound v-else-if="!adminContent.length" />
    <v-row v-else>
      <v-col
        v-for="id in adminContent"
        :key="id"
        cols="12"
        lg="4"
        md="6"
        sm="12"
      >
        <TaggedContentCard
          :id="id"
          removable
          @preview="previewing = id"
          @remove="removeContent(id)"
        />
      </v-col>
    </v-row>

    <PreviewModal
      v-if="previewing"
      :id="previewing"
      width="90vw"
      height="90vh"
      @close="previewing = null"
    />
  </v-container>
</template>

<script setup>
  import { ref } from 'vue'
  import { validate as isUUID } from 'uuid'
  import { useStore } from 'vuex'
  import NoResultsFound from '../../components/no-results-found.vue'
  import PreviewModal from '../../components/PreviewModal.vue'
  import TaggedContentCard from '../../components/tagged-content-card.vue'
  import setTagging from '../../set-tagging.js'
  import { ADMIN_CONTENT_TAG } from '../../constants.js'

  const store = useStore()
  const partition = store.getters.tagPartition

  const contentIdOrURL = ref('')
  const adminContent = ref([])
  const previewing = ref(null)
  const loading = ref(true)
  const addingContent = ref(false)
  const showInvalidMessage = ref(false)
  const showSuccessMessage = ref(false)

  fetchAdminContent()

  function t(slug) {
    return store.getters.t(slug)
  }

  async function attemptAddContent() {
    const content = contentIdOrURL.value.trim()

    if (!(await isValidInput(content))) {
      showInvalidMessage.value = true
      return
    }

    addingContent.value = true
    try {
      await setTagging({ tag: ADMIN_CONTENT_TAG, target: content, value: true }, partition)
      addAdminContent(content)
      contentIdOrURL.value = ''
      showSuccessMessage.value = true
    } finally {
      addingContent.value = false
    }
  }

  async function removeContent(id) {
    await setTagging({ tag: ADMIN_CONTENT_TAG, target: id, value: null }, partition)
    removeAdminContent(id)
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
