<template>
  <v-container v-if="isThailandDomain">
    <RoleTable
      header="Admins"
      :partition="tagPartition"
      :tag="ADMIN_TAG"
      @tag="setTagging"
    />
    <RoleTable
      header="Trainers"
      :partition="tagPartition"
      :tag="TRAINER_TAG"
      @tag="setTagging"
    />
    <RoleTable
      header="Teachers"
      :partition="tagPartition"
      :tag="TEACHER_TAG"
      @tag="setTagging"
    />
    <RoleRequestTable
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

  const store = useStore()
  const ADMIN_TAG = "36e1b060-ed49-11ee-be89-5b04faf266ea"
  const TEACHER_TAG = "49bf66a0-ed49-11ee-be89-5b04faf266ea"
  const TRAINER_TAG = "8ae541e0-ed49-11ee-be89-5b04faf266ea"

  const { tagPartition, isThailandDomain } = store.getters

  async function setTagging({ tag, target, value }) {
    const myTags  = await Agent.state('tags')
    if (!myTags[tag]) myTags[tag] = {}
    myTags[tag][target] = { value, partition: tagPartition }
  }
</script>
