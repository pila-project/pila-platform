<template>
  <v-container :key="lastRefresh">
    <RoleTable
      :header="t('your-teachers')"
      :partition="partition"
      :tag="TEACHER_TAG"
      descendentTaggings
      :relatedTags="[{ id: TRAINER_TAG, editable: true }]"
      @tag="setTagging"
      :editable="true"
    />
    <RoleRequestTable
      @tag="setTagging"
    />
  </v-container>
</template>

<script setup>
  import { ref } from 'vue'
  import { useStore } from 'vuex'
  import RoleTable from '../../components/role-table.vue'
  import RoleRequestTable from '../../components/role-request-table.vue'
  import { TEACHER_TAG, TRAINER_TAG } from '../../constants.js'

  const store = useStore()
  function t(slug) { return store.getters.t(slug) }

  const partition = store.getters.tagPartition
  const lastRefresh = ref(0)

  async function setTagging({ tag, target, value }) {
    const myTags  = await Agent.state('tags')
    if (!myTags[tag]) myTags[tag] = {}
    myTags[tag][target] = { value, partition }
    await Agent.synced()
    lastRefresh.value++
  }
</script>
