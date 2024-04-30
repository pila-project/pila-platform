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
    <template v-slot:item.contributor="data">
      <DecryptedName :user="data.item.contributor" />
    </template>
    <template v-slot:item.edit="data">
      <v-btn @click="tag(data.item.target, null)">x</v-btn>
    </template>
  </v-data-table>
  <v-dialog max-width="500">
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
  import { ref } from 'vue'
  import DecryptedName from '../../components/decrypted-name.vue'

  const props = defineProps({ partition: String, tag: String, header: String })
  const emit = defineEmits(['tag'])

  const loading = ref(true)
  const taggings = ref([])
  const newRoleUser = ref('')

  const headers = [
    { key: 'target', title: 'User' },
    { key: 'contributor', title: 'Assigned By' },
    { key: 'edit', title: '' }
  ]

  fetchTaggings()

  async function tag(target, value) {
    loading.value = true
    emit('tag', { tag: props.tag, target, value })
    await Agent.synced()
    await new Promise(r => setTimeout(r, 500))
    fetchTaggings()
  }

  async function fetchTaggings() {
    loading.value = true
    await (
      Agent
        .query('taggings-for-tag', [props.partition, props.tag], 'tags.knowlearning.systems')
        .then(result => taggings.value = result)
    )
    loading.value = false
   }

</script>
