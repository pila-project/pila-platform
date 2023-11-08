<template>
  <div class="tab-wrapper">
    <TabMenu
      :tabs="[
        { name: t('assignments'), background: '#2E9DF9', id:'class-assignments', color: 'white' },
        { name: t('studies'), background: '#2E32DB', id:'study-assignments', color: 'white' },
        { spacer: true, width: 1 }
      ]"
      :current="tab"
      @select="tab = $event"
    />
  </div>

  <div>
    <AssignmentsToMe
      :key="tab"
      :type="assignmentType"
    />
  </div>
</template>

<script>
  import AssignmentsToMe from '../../assignments/to-me/all.vue'
  import TabMenu from '../../components/tab-menu.vue'
  export default {
    components: {
      AssignmentsToMe,
      TabMenu
    },
    data() {
      return {
        tab: 'class-assignments'
      }
    },
    computed: {
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