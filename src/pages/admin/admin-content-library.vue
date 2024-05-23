<template>
  <v-container>
    <div class="text-h3">PILA Content</div>
    <v-data-table
      sticky
      :items="taggings"
      :loading="loading"
      :headers="headers"
      :no-data-text="t('no-content-published')"
      :items-per-page-text="t('items-per-page')"
      :items-per-page-options="[
        {value: 10, title: '10'},
        {value: 25, title: '25'},
        {value: 50, title: '50'},
        {value: 100, title: '100'},
        {value: -1, title: t('all')}
      ]"
    >
      <template v-slot:item.preview="data">
        <v-btn>
          Preview
          <v-overlay
            activator="parent"
            location-strategy="static"
            scroll-strategy="block"
          >
            <v-card style="height: 80vh; width: 80vw;">
              <vueEmbedComponent
                namespace="preview"
                :id="data.item.target"
                allow="camera;microphone;fullscreen"
              />
            </v-card>
          </v-overlay>
        </v-btn>
      </template>
      <template v-slot:item.target="data">
        {{ data.item.target }}
      </template>
      <template v-slot:item.owner="data">
        <vueScopeComponent
          :id="data.item.target"
          metadata
          :path="['owner']"
        />
      </template>
      <template v-slot:item.contributor="data">
        {{ data.item.contributor }}
      </template>
      <template v-slot:item.edit="data">
        <v-btn @click="setTagging(data.item.target, null)">x</v-btn>
      </template>
    </v-data-table>
    <v-dialog max-width="500">
      <template v-slot:activator="{ props: activatorProps }">
        <v-btn v-bind="activatorProps">Add Content</v-btn>
      </template>
      <template v-slot:default="{ isActive }">
        <v-card title="Publish Content">
          <v-card-text>
            <v-text-field
              autofocus
              v-model="newRoleUser"
              label="uuid"
              @keypress.enter="() => {
                setTagging(newRoleUser, true)
                isActive.value = false
              }"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              text="Add"
              @click="() => {
                setTagging(newRoleUser, true)
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
  </v-container>
</template>

<script setup>
  import { ref } from 'vue'
  import { useStore } from 'vuex'
  import { vueScopeComponent, vueEmbedComponent } from '@knowlearning/agents/vue.js'

  const store = useStore()
  
  const tag = 'f760dad0-f133-11ee-804e-27f76a81958c'
  const partition = store.getters.tagPartition

  const loading = ref(true)
  const taggings = ref([])
  const newRoleUser = ref('')

  const headers = [
    { key: 'preview', title: '' },
    { key: 'target', title: 'Content' },
    { key: 'owner', title: 'Owner' },
    { key: 'contributor', title: 'Published By' },
    { key: 'edit', title: '' }
  ]

  fetchTaggings()

  async function fetchTaggings() {
    loading.value = true
    await (
      Agent
        .query('taggings-for-tag', [partition, tag], 'tags.knowlearning.systems')
        .then(result => taggings.value = result)
    )
    loading.value = false
   }

  async function setTagging(target, value) {
    const myTags  = await Agent.state('tags')
    if (!myTags[tag]) myTags[tag] = {}
    myTags[tag][target] = { value, partition }
    loading.value = true
    await Agent.synced()
    await new Promise(r => setTimeout(r, 500))
    fetchTaggings()
  }

</script>
