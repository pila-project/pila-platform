<template>
  <v-container v-if="isThailandDomain">
    <RoleTable
      v-if="props.role === 'admins'"
      header="Admins"
      :partition="tagPartition"
      :tag="ADMIN_TAG"
      @tag="setTagging"
      :editable="false"
    />
    <RoleTable
      v-else-if="props.role === 'trainers'"
      header="Trainers"
      :partition="tagPartition"
      :tag="TRAINER_TAG"
      @tag="setTagging"
    />
    <RoleTable
      v-else-if="props.role === 'teachers'"
      header="Teachers"
      :partition="tagPartition"
      :tag="TEACHER_TAG"
      @tag="setTagging"
    />
    <RoleRequestTable
      v-else-if="props.role === 'role-requests'"
      :roleToTagMap="{
        admin: ADMIN_TAG,
        trainer: TRAINER_TAG,
        teacher: TEACHER_TAG
      }"
      @tag="setTagging"
    />
  </v-container>
  <OldRoles v-else />
</template>

<script setup>
  import { useStore } from 'vuex'
  import RoleTable from './role-table.vue'
  import RoleRequestTable from './role-request-table.vue'
  import OldRoles from './old-roles.vue'
  import { ADMIN_TAG, TRAINER_TAG, TEACHER_TAG } from '../../constants.js'

  const props = defineProps({ role: String })

  const store = useStore()

  const { tagPartition, isThailandDomain } = store.getters

  async function setTagging({ tag, target, value }) {
    const myTags  = await Agent.state('tags')
    if (!myTags[tag]) myTags[tag] = {}
    myTags[tag][target] = { value, partition: tagPartition }
  }
</script>
