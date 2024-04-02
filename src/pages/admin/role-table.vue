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
      {{ data.item.target }}
    </template>
    <template v-slot:item.contributor="data">
      {{ data.item.contributor }}
    </template>
  </v-data-table>
  <v-dialog max-width="500">
    <template v-slot:activator="{ props: activatorProps }">
      <v-btn v-bind="activatorProps">Add {{ props.header }}</v-btn>
    </template>
    <template v-slot:default="{ isActive }">
      <v-card title="New Tag">
        <v-card-text>
          <v-text-field
            autofocus
            v-model="newRoleUser"
            label="Name"
            @keypress.enter="() => {
              addTagging(newRoleUser)
              isActive.value = false
            }"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text="Add"
            @click="() => {
              addTagging(newRoleUser)
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
  import { ref } from 'vue'

  const props = defineProps({ partition: String, tag: String, header: String })

  const loading = ref(true)
  const taggings = ref([])
  const newRoleUser = ref('')

  const headers = [
    { key: 'target', title: 'User' },
    { key: 'contributor', title: 'Assigned By' }
  ]

  fetchTaggings()

  async function fetchTaggings() {
    loading.value = true
    await (
      Agent
        .query('taggings-for-tag', [props.partition, props.tag], 'tags.knowlearning.systems')
        .then(result => taggings.value = result)
    )
    loading.value = false
   }

  async function addTagging(target) {
    const { tag, partition } = props

    const myTags  = await Agent.state('tags')
    if (!myTags[tag]) myTags[tag] = {}
    myTags[tag][target] = { value: true, partition }
    loading.value = true
    await Agent.synced()
    await new Promise(r => setTimeout(r, 500))
    fetchTaggings()
  }

</script>
