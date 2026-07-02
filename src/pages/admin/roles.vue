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
  </v-container>
</template>

<script setup>
  import { useStore } from 'vuex'
  import RoleTable from '../../components/role-table.vue'
  import RoleRequestTable from '../../components/role-request-table.vue'
  import {
    ADMIN_TAG,
    TRAINER_TAG,
    TEACHER_TAG,
    HOST_TO_EXTRA_TEACHER_TAGS,
    SIMPLIFIED_STUDY_DOMAINS,
    TREATMENT_TAG,
    CONTROL_TAG
  } from '../../constants.js'

  const props = defineProps({ role: String })

  const store = useStore()

  const { tagPartition } = store.getters

  // We maybe should unify this section, teacherTags (extra, related) by host in constants...
  const isSimplifiedStudyDomain = SIMPLIFIED_STUDY_DOMAINS.includes(window.location.host)
  const teacherRelatedTags = isSimplifiedStudyDomain
    ? []
    : [{ id: TRAINER_TAG, editable: true }]

  const extraTeacherTags = HOST_TO_EXTRA_TEACHER_TAGS[window.location.host]

  if (extraTeacherTags) {
    teacherRelatedTags.push(...extraTeacherTags)
  }
  // End of section we maybe should unify

  async function setTagging({ tag, target, value }) {
    const partition = tagPartition
    const myTags  = await Agent.state('tags')
    if (!myTags[tag]) myTags[tag] = {}
    myTags[tag][target] = { value, partition }

    console.log('tag, target, value, partition')
    console.log(tag, target, value, partition)

    // START CRUFTIFICATION for TvC assignment on new teacher approval
    // Apply TCTCTC pattern for new teachers
    // Look at the total T or C taggings, if even T, if odd C
    if (tag === TEACHER_TAG && value === true) {
      console.log('inside set TC logic')
      const [ allTreatmentTaggings, allControlTaggings ] = await Promise.all([
        Agent.query('taggings-for-tag', [ partition, TREATMENT_TAG ], 'tags.knowlearning.systems'),
        Agent.query('taggings-for-tag', [ partition, CONTROL_TAG ], 'tags.knowlearning.systems')
      ])
    
      // early return if already assigned
      const alreadyTreatment = allTreatmentTaggings.some(tagging => tagging.target === target)
      const alreadyControl = allControlTaggings.some(tagging => tagging.target === target)
      console.log('alreadyTreatment: ', alreadyTreatment)
      console.log('alreadyControl: ', alreadyControl)
      if (alreadyTreatment || alreadyControl) return

      const totalAssignments = allTreatmentTaggings.length + allControlTaggings.length
      console.log('total assignments :', totalAssignments)

      if (totalAssignments % 2 === 0) {
        if (!myTags[TREATMENT_TAG]) myTags[TREATMENT_TAG] = {}
        myTags[TREATMENT_TAG][target] = { value: true, partition }
      } else {
        if (!myTags[CONTROL_TAG]) myTags[CONTROL_TAG] = {}
        myTags[CONTROL_TAG][target] = { value: true, partition }
      }

    }
    // END TCTC Assignment Crustification
  }

  function t(slug) { return store.getters.t(slug) }
</script>
