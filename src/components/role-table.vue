<template>
  <div class="text-h3">
    {{ props.header }}
    <v-btn
      v-if="downloadable"
      @click="download"
    >
      {{ t('download') }}
    </v-btn>
  </div>
  <v-data-table
    sticky
    :items="taggings"
    :loading="loading"
    :headers="headers"
    :no-data-text="t('no-one-has-been-assigned-this-role')"
    :items-per-page-text="t('items-per-page')"
    :items-per-page-options="[
      {value: 10, title: '10'},
      {value: 25, title: '25'},
      {value: 50, title: '50'},
      {value: 100, title: '100'},
      {value: -1, title: t('all')}
    ]"
  >
    <template v-slot:item.target="data">
      <DecryptedName
        avatar
        :user="data.item.target"
      />
    </template>
    <template
      v-for="{ id, key, templateSlot, editable, values } in relatedTagTemplateData"
      :key="key"
      v-slot:[templateSlot]="data"
    >
      <template v-if="editable">
        <v-select
          v-if="values"
          density="compact"
          variant="solo"
          :items="values"
          :item-title="v => t(v?.label || 'teacher')"
          return-object
          v-model="relatedTagStates[id][data.item.target]"
          @update:modelValue="val => setRelatedTag(id, data.item.target, val)"
        />
        <LucideIcon
          v-else
          class="d-inline-flex cursor-pointer"
          :name="relatedTagStates[id][data.item.target] ? 'check-square' : 'square'"
          :size="18"
          @click="toggleRelatedTag(id, data.item.target)"
        />
      </template>
    </template>
    <template v-slot:item.contributor="data">
      <DecryptedName
        avatar
        :user="data.item.contributor"
      />
    </template>
    <template v-slot:item.edit="data">
      <v-btn
        v-if="editable"
        variant="plain"
        icon="mdi-close"
        @click="potentialRemoval = data.item.target"
      />
    </template>
  </v-data-table>
  <v-dialog
    max-width="500"
    v-model="potentialRemoval"
  >
    <template v-slot:default="{ isActive }">
      <v-card :title="t('are-you-sure')">
        <template v-slot:actions>
          <v-spacer></v-spacer>
          <v-btn @click="potentialRemoval = null">
            {{t('cancel')}}
          </v-btn>
          <v-btn @click="() => {
            tag(potentialRemoval, null)
            potentialRemoval = null
          }">
            {{t('remove')}}
          </v-btn>
        </template>
      </v-card>
    </template>
  </v-dialog>
  <v-dialog
    v-if="editable"
    max-width="500"
  >
    <template v-slot:activator="{ props: activatorProps }">
      <v-btn v-bind="activatorProps">{{ t('add-new') }}</v-btn>
    </template>
    <template v-slot:default="{ isActive }">
      <v-card :title="`${t('add')} ${props.header}`">
        <v-card-text>
          <v-text-field
            autofocus
            v-model="newRoleUser"
            :label="t('user-id')"
            :rules="[validateUUID]"
            @keypress.enter="submitNewTeacher(newRoleUser, isActive)"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            :text="t('add')"
            @click="submitNewTeacher(newRoleUser, isActive)"
          />
          <v-btn
            :text="t('cancel')"
            @click="isActive.value = false"
          />
        </v-card-actions>
      </v-card>
    </template>
  </v-dialog>
</template>

<script setup>
  import { ref, reactive, computed } from 'vue'
  import { validate as isUUID } from 'uuid'
  import DecryptedName from './decrypted-name.vue'
  import { useStore } from 'vuex'
  import { json2csv } from 'json-2-csv'
  import LucideIcon from '@/components/ui/LucideIcon.vue'

  const store = useStore()

  function t(slug) { return store.getters.t(slug) }

  function validateUUID(val) {
    return isUUID(val) || 'Enter a valid user id'
  }
  function submitNewTeacher(user, isActive) {
    if (isUUID(user)) {
      tag(user, true)
      isActive.value = false
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
