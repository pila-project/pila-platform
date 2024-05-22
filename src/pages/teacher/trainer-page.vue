<template>
  <v-container>
    <RoleTable
      :header="t('your-teachers')"
      :partition="partition"
      :tag="TEACHER_TAG"
      :relatedTags="[{ id: TRAINER_TAG, editable: true }]"
      @tag="setTagging"
      :editable="true"
    />
  </v-container>
</template>

<script setup>
  import { useStore } from 'vuex'
  import RoleTable from '../../components/role-table.vue'
  import { TEACHER_TAG, TRAINER_TAG } from '../../constants.js'

  const store = useStore()
  function t(slug) { return store.getters.t(slug) }

  const partition = store.getters.tagPartition

  async function setTagging({ tag, target, value }) {
    const myTags  = await Agent.state('tags')
    if (!myTags[tag]) myTags[tag] = {}
    myTags[tag][target] = { value, partition }
  }
</script>
