<template>
  <div class="text-h3">{{ props.header }}</div>
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
      v-for="{ id, key, templateSlot } in relatedTagTemplateData"
      :key="key"
      v-slot:[templateSlot]="data"
    >
      <v-icon
        class="d-inline-flex"
        :icon="`fa-regular fa-square${relatedTagStates[id][data.item.target] ? '-check' : ''}`"
        @click="toggleRelatedTag(id, data.item.target)"
      />
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
        icon="fa-solid fa-xmark"
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
      <v-btn v-bind="activatorProps">Add {{ props.header }}</v-btn>
    </template>
    <template v-slot:default="{ isActive }">
      <v-card :title="`${t('add')} ${props.header}`">
        <v-card-text>
          <v-text-field
            autofocus
            v-model="newRoleUser"
            :label="t('user-id')"
            @keypress.enter="() => {
              tag(newRoleUser, true)
              isActive.value = false
            }"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            :text="t('add')"
            @click="() => {
              tag(newRoleUser, true)
              isActive.value = false
            }"
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
  import DecryptedName from './decrypted-name.vue'
  import { useStore } from 'vuex'

  const store = useStore()

  function t(slug) { return store.getters.t(slug) }

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

  const relatedTagStates = {}

  props.relatedTags.forEach(({ id, editable }) => {
    relatedTagStates[id] = reactive({})
    Agent
      .query(
        'taggings-for-tag',
        [props.partition, id],
        'tags.knowlearning.systems'
      )
      .then(results => {
        results.forEach(result => relatedTagStates[id][result.target] = true)
      })
  })

  const relatedTagTemplateData = computed(() => {
    return props.relatedTags.map(({ id, editable }, index) => ({
      id,
      editable,
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

</script>
