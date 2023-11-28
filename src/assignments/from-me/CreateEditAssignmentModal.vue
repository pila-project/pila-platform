<template>
  <PILAModal
    @close="$emit('close')"
    showCloseButton
    :closeButtonText="t('save')"
  >
    <template v-slot:title>{{ t('create-modify-assignment') }}</template>
    <template v-slot:body>
      <ResearcherToTeacherAssignment
        v-if="researcher"
        :id="id"
      />
      <TeacherToStudentAssignment
        v-else-if="teacher"
        :id="id"
      />
    </template>
  </PILAModal>
</template>

<script>
  import PILAModal from '../../components/PILAModal.vue'
  import ResearcherToTeacherAssignment from './researcher-to-teacher.vue'
  import TeacherToStudentAssignment from './teacher-to-student.vue'
  
  export default {
    components: {
      PILAModal,
      ResearcherToTeacherAssignment,
      TeacherToStudentAssignment
    },
    props: {
      id: String,
      teacher: Boolean,
      researcher: Boolean
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) }
    }
  }

</script>