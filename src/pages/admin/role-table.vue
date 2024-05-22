<template>
  <div class="text-h3">{{ props.header }}</div>
  <v-data-table
    sticky
    :items="taggings"
    :loading="loading"
    :headers="headers"
    no-data-text="No one has been assigned this role"
  >
    <template v-slot:item.target="data">
      <DecryptedName :user="data.item.target" />
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
      <DecryptedName :user="data.item.contributor" />
    </template>
    <template v-slot:item.edit="data">
      <v-btn
        v-if="editable"
        variant="plain"
        icon="fa-solid fa-xmark"
        @click="tag(data.item.target, null)"
      />
    </template>
  </v-data-table>
  <v-dialog
    v-if="editable"
    max-width="500"
  >
    <template v-slot:activator="{ props: activatorProps }">
      <v-btn v-bind="activatorProps">Add {{ props.header }}</v-btn>
    </template>
    <template v-slot:default="{ isActive }">
      <v-card :title="`Add ${props.header}`">
        <v-card-text>
          <v-text-field
            autofocus
            v-model="newRoleUser"
            label="User Id"
            @keypress.enter="() => {
              tag(newRoleUser, true)
              isActive.value = false
            }"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text="Add"
            @click="() => {
              tag(newRoleUser, true)
              isActive.value = false
            }"
          />
          <v-btn
            text="Cancel"
            @click="isActive.value = false"
          />
        </v-card-actions>
      </v-card>
    </template>
  </v-dialog>
</template>

<script setup>
  import { ref, reactive, computed } from 'vue'
  import DecryptedName from '../../components/decrypted-name.vue'

  const props = defineProps({
    partition: String,
    tag: String,
    header: String,
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

  const headers = [
    { key: 'target', title: 'User' }
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
    headers.push({ key, title: name })
  }))

  headers.push({ key: 'contributor', title: 'Assigned By' })
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
    await (
      Agent
        .query('taggings-for-tag', [props.partition, props.tag], 'tags.knowlearning.systems')
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
