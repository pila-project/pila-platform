<template>

  <StudentAgreement v-if="!hasStudentAgreement" />
  
  <div v-if="hasStudentAgreement" class="tab-wrapper">
    <TabMenu
      :tabs="[
        {
          name: t('assignments'),
          background: '#2E9DF9',
          id:'class-assignments',
          color: 'white'
        },
        { spacer: true, width: 1 },
        {
          name: t('studies'),
          background: '#6BEAC9',
          id:'study-assignments',
          color: 'black',
          icon: '/mascotte.png'
        }
      ]"
      :current="tab"
      @select="tab = $event"
    />
  </div>

  <div
    v-if="hasStudentAgreement"
    class="tab-contents"
  >
    <StudiesNotAvailable
      v-if="tab === 'study-assignments' && hideStudies"
    />
    <StudentAssignments v-else />
  </div>
</template>

<script>
  import StudentAgreement from './student-agreement.vue'
  import StudentAssignments from './student-assignments.vue'
  import TabMenu from '../../components/tab-menu.vue'
  import StudiesNotAvailable from '../../components/studies-not-available.vue'
  export default {
    components: {
      StudentAgreement,
      StudentAssignments,
      TabMenu,
      StudiesNotAvailable
    },
    data() {
      return {
        tab: 'class-assignments',
        hideStudies: true, // Remove After December Demo
      }
    },
    computed: {
      hasStudentAgreement() {
        return this.$store.getters.hasAcceptedStudentAgreement()
      },
      assignmentType() {
        return {
          'class-assignments': 'teacher-to-student',
          'study-assignments': 'teacher-to-student-research'
        }[this.tab]
      }
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) }
    }
  }
</script>