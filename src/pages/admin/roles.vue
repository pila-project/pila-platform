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
      approvalColumns
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
    SIMPLIFIED_STUDY_DOMAINS,
    TREATMENT_TAG,
    CONTROL_TAG,
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
    const partition = tagPartition
    const myTags = await Agent.state('tags')
    if (!myTags[tag]) myTags[tag] = {}
    myTags[tag][target] = { value, partition }

    // Trunk: TCTCTC pattern for new teacher approval (moved off teacher-agreement close)
    if (tag === TEACHER_TAG && value === true) {
      const [allTreatmentTaggings, allControlTaggings] = await Promise.all([
        Agent.query('taggings-for-tag', [partition, TREATMENT_TAG], 'tags.knowlearning.systems'),
        Agent.query('taggings-for-tag', [partition, CONTROL_TAG], 'tags.knowlearning.systems'),
      ])

      const alreadyTreatment = allTreatmentTaggings.some(tagging => tagging.target === target)
      const alreadyControl = allControlTaggings.some(tagging => tagging.target === target)
      if (alreadyTreatment || alreadyControl) return

      const totalAssignments = allTreatmentTaggings.length + allControlTaggings.length

      if (totalAssignments % 2 === 0) {
        if (!myTags[TREATMENT_TAG]) myTags[TREATMENT_TAG] = {}
        myTags[TREATMENT_TAG][target] = { value: true, partition }
      } else {
        if (!myTags[CONTROL_TAG]) myTags[CONTROL_TAG] = {}
        myTags[CONTROL_TAG][target] = { value: true, partition }
      }
    }
  }

  function t(slug) { return store.getters.t(slug) }
</script>
