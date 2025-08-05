<template>
  <v-container>
    <RoleTable
      v-if="props.role === 'admins'"
      :header="t('admins')"
      :partition="tagPartition"
      :tag="ADMIN_TAG"
      @tag="setTagging"
      :editable="false"
    />
    <RoleTable
      v-else-if="props.role === 'trainers'"
      :header="t('trainers')"
      :partition="tagPartition"
      :tag="TRAINER_TAG"
      @tag="setTagging"
    />
    <RoleTable
      v-else-if="props.role === 'teachers'"
      :header="t('teachers')"
      :partition="tagPartition"
      :relatedTags="[
        { id: TRAINER_TAG, editable: true },
        {
          id: THAI_TEACHER_LABEL,
          editable: true,
          values: [
            { label: 'teacher' },
            { label: 'supervisor' },
            { label: 'core-facilitator' }
          ]
        }
      ]"
      :tag="TEACHER_TAG"
      @tag="setTagging"
    />
    <RoleRequestTable
      v-else-if="props.role === 'role-requests'"
      @tag="setTagging"
      showTrainer
    />
  </v-container>
</template>

<script setup>
  import { useStore } from 'vuex'
  import RoleTable from '../../components/role-table.vue'
  import RoleRequestTable from '../../components/role-request-table.vue'
  import { ADMIN_TAG, TRAINER_TAG, THAI_TEACHER_LABEL, TEACHER_TAG } from '../../constants.js'

  const props = defineProps({ role: String })

  const store = useStore()

  const { tagPartition } = store.getters

  async function setTagging({ tag, target, value }) {
    const myTags  = await Agent.state('tags')
    if (!myTags[tag]) myTags[tag] = {}
    myTags[tag][target] = { value, partition: tagPartition }
  }

  function t(slug) { return store.getters.t(slug) }
</script>
