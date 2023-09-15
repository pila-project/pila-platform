<template>
  <h1>Student</h1>
  <div>
    <button @click="tab = 'class-assignments'">Assignments</button>
    <button @click="tab = 'study-assignments'">Studies</button>
    <AssignmentsToMe
      :key="tab"
      :type="assignmentType"
    />
  </div>
</template>

<script>
  import AssignmentsToMe from '../../assignments/to-me/all.vue'

  export default {
    components: {
      AssignmentsToMe
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
    }
  }
</script>