<template>
  <div class="p-6">
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
      :downloadable="false"
      :header="t('teachers')"
      :partition="tagPartition"
      :relatedTags="teacherRelatedTags"
      :tag="TEACHER_TAG"
      @tag="setTagging"
    />
    <RoleRequestTable
      v-else-if="props.role === 'role-requests'"
      @tag="setTagging"
      showTrainer
    />
  </div>
</template>

<script setup>
  import { useStore } from 'vuex'
  import RoleTable from '@/components/roles/role-table.vue'
  import RoleRequestTable from '@/components/roles/role-request-table.vue'
  import {
    ADMIN_TAG,
    TRAINER_TAG,
    TEACHER_TAG,
    HOST_TO_EXTRA_TEACHER_TAGS,
    SIMPLIFIED_STUDY_DOMAINS
  } from '@/utils/constants.js'

  const props = defineProps({ role: String })

  const store = useStore()

  const { tagPartition } = store.getters

  const isSimplifiedStudyDomain = SIMPLIFIED_STUDY_DOMAINS.includes(window.location.host)
  const teacherRelatedTags = isSimplifiedStudyDomain
    ? []
    : [{ id: TRAINER_TAG, editable: true }]

  const extraTeacherTags = HOST_TO_EXTRA_TEACHER_TAGS[window.location.host]

  if (extraTeacherTags) {
    teacherRelatedTags.push(...extraTeacherTags)
  }

  async function setTagging({ tag, target, value }) {
    const myTags  = await Agent.state('tags')
    if (!myTags[tag]) myTags[tag] = {}
    myTags[tag][target] = { value, partition: tagPartition }
  }

  function t(slug) { return store.getters.t(slug) }
</script>
