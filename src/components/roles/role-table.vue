<template>
  <div class="text-xl font-semibold text-zinc-950 mb-4">
    {{ props.header }}
    <PButton
      v-if="downloadable"
      @click="download"
      variant="secondary"
      size="sm"
      :text="t('download')"
    />
  </div>
  <PTable
    :items="taggings"
    :loading="loading"
    :headers="headers"
    :noDataText="t('no-one-has-been-assigned-this-role')"
    :itemsPerPageText="t('items-per-page')"
    :itemsPerPage="10"
    :itemsPerPageOptions="[
      {value: 10, title: '10'},
      {value: 25, title: '25'},
      {value: 50, title: '50'},
      {value: 100, title: '100'},
      {value: -1, title: t('all')}
    ]"
  >
    <template #item.target="{ item }">
      <DecryptedName
        avatar
        :user="item.target"
      />
    </template>
    <template
      v-for="{ id, key, templateSlot, editable, values } in relatedTagTemplateData"
      :key="key"
      #[templateSlot]="{ item }"
    >
      <template v-if="editable">
        <PSelect
          v-if="values"
          :items="values"
          :itemTitle="v => t(v?.label || 'teacher')"
          returnObject
          :modelValue="relatedTagStates[id][item.target]"
          @update:modelValue="val => setRelatedTag(id, item.target, val)"
        />
        <button
          v-else
          class="inline-flex"
          @click="toggleRelatedTag(id, item.target)"
        >
          <LucideIcon :name="relatedTagStates[id][item.target] ? 'check-square' : 'square'" :size="16" />
        </button>
      </template>
    </template>
    <template #item.contributor="{ item }">
      <DecryptedName
        avatar
        :user="item.contributor"
      />
    </template>
    <template #item.edit="{ item }">
      <button
        v-if="editable"
        class="text-slate-400 hover:text-danger-600"
        @click="potentialRemoval = item.target"
      >
        <LucideIcon name="x" :size="16" />
      </button>
    </template>
  </PTable>

  <!-- Confirm removal dialog -->
  <PModal
    v-if="potentialRemoval"
    width="500px"
    :title="t('are-you-sure')"
    @close="potentialRemoval = null"
  >
    <template #footer>
      <PButton variant="secondary" color="danger" :text="t('cancel')" @click="potentialRemoval = null" />
      <PButton variant="primary" color="danger" :text="t('remove')" @click="() => {
        tag(potentialRemoval, null)
        potentialRemoval = null
      }" />
    </template>
  </PModal>

  <!-- Add new dialog -->
  <PModal
    v-if="editable && showAddDialog"
    width="500px"
    :title="`${t('add')} ${props.header}`"
    @close="showAddDialog = false"
  >
    <template #body>
      <PInput
        autofocus
        v-model="newRoleUser"
        :label="t('user-id')"
        :error="newRoleUser && !validateUUID(newRoleUser) ? 'Enter a valid user id' : ''"
        @enter="submitNewTeacher(newRoleUser)"
        required
      />
    </template>
    <template #footer>
      <PButton variant="secondary" color="danger" :text="t('cancel')" @click="showAddDialog = false" />
      <PButton variant="primary" :text="t('add')" @click="submitNewTeacher(newRoleUser)" />
    </template>
  </PModal>
  <PButton
    v-if="editable"
    variant="secondary"
    :text="t('add-new')"
    @click="showAddDialog = true"
    class="mt-4"
  />
</template>

<script setup>
  import { ref, reactive, computed } from 'vue'
  import { validate as isUUID } from 'uuid'
  import DecryptedName from '@/components/common/decrypted-name.vue'
  import { useStore } from 'vuex'
  import { json2csv } from 'json-2-csv'
  import { PTable, PModal, PButton, PInput, PSelect } from '@/components/ui/index.js'
  import LucideIcon from '@/components/ui/LucideIcon.vue'

  const store = useStore()

  function t(slug) { return store.getters.t(slug) }

  function validateUUID(val) {
    return isUUID(val) || false
  }
  function submitNewTeacher(user) {
    if (isUUID(user)) {
      tag(user, true)
      showAddDialog.value = false
    }
  }

  const props = defineProps({
    partition: String,
    tag: String,
    header: String,
    descendentTaggings: {
      type: Boolean,
      default: false
    },
    relatedTags: {
      type: Array,
      default: () => []
    },
    editable: {
      type: Boolean,
      default: true
    },
    downloadable: {
      type: Boolean,
      defaut: false
    }
  })
  const emit = defineEmits(['tag'])

  const loading = ref(true)
  const taggings = ref([])
  const newRoleUser = ref('')
  const potentialRemoval = ref(null)
  const showAddDialog = ref(false)

  const headers = [
    { key: 'target', title: t('user') }
  ]

  fetchTaggings()

  const relatedTagStates = reactive({})

  props.relatedTags.forEach(({ id, editable }) => {
    relatedTagStates[id] = {}
    Agent
      .query(
        'taggings-for-tag',
        [props.partition, id],
        'tags.knowlearning.systems'
      )
      .then(results => {
        results
          .forEach(({ target, value }) => {
            relatedTagStates[id][target] = value
          })
      })
  })

  const relatedTagTemplateData = computed(() => {
    return props.relatedTags.map(({ id, editable, values }, index) => ({
      id,
      editable,
      values,
      key: `relatedTag${index}`,
      templateSlot: `item.relatedTag${index}`
    }))
  })

  await Promise.all(relatedTagTemplateData.value.map(async ({ id, key }, index) => {
    const { name } = await Agent.state(id)
    headers.push({ key, title: t(name) })
  }))

  headers.push({ key: 'contributor', title: t('assigned-by') })
  headers.push({ key: 'edit', title: '' })

  function setRelatedTag(relatedTagId, target, value) {
    relatedTagStates[relatedTagId][target] = value
    tag(target, value, relatedTagId)
  }

  function toggleRelatedTag(relatedTagId, target) {
    const value = !relatedTagStates[relatedTagId][target]
    relatedTagStates[relatedTagId][target] = value
    tag(target, value ? true : null, relatedTagId)
  }

  async function tag(target, value, tag) {
    loading.value = true
    emit('tag', { tag: tag || props.tag, target, value })
    await Agent.synced()
    await new Promise(r => setTimeout(r, 500))
    fetchTaggings()
  }

  async function fetchTaggings() {
    loading.value = true
    const query = props.descendentTaggings ? 'my-descendent-taggings-for-tag' : 'taggings-for-tag'
    await (
      Agent
        .query(query, [props.partition, props.tag], 'tags.knowlearning.systems')
        .then(result => {
          result.forEach(
            o => relatedTagTemplateData.value.forEach(({ key }) => o[key] = true)
          )
          taggings.value = result
        })
    )

    taggings
      .value
      .forEach(result => {
        props.relatedTags.forEach(({ id, editable }) => {
          if (relatedTagStates[id][result.target]) return
          relatedTagStates[id][result.target] = false
        })
      })
    loading.value = false
  }

  async function download() {
    const table = await Promise.all(
      taggings
        .value
        .map(async ({ target, contributor }) => {
          const entry = { [t('user')]: target }
          await Promise.all(
            Object
              .entries(relatedTagStates)
              .map(async ([tagId, tagTargets]) => {
                const { name } = await Agent.state(tagId)
                entry[t(name)] = tagTargets[target] || null
              })
          )
          return entry
        })
    )
    const csv = await json2csv(table)
    const file = new File([csv], `${t('teachers')}-${(new Date()).toLocaleString()}.csv`, {
      type: 'text/plain',
    })
    const link = document.createElement('a')
    const url = URL.createObjectURL(file)

    link.href = url
    link.download = file.name
    document.body.appendChild(link)
    link.click()

    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }
</script>
