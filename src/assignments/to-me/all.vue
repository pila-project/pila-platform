<template>
  <table>
    <thead>
      <tr>
        <th>Id</th>
        <th>Name</th>
        <th>Description</th>
        <th>Assigner</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="assignment_id in assignments"
        :key="assignment_id"
        :class="{ selected: assignment_id === current }"
        @click="current = current === assignment_id ? null: assignment_id"
      >
        <td>{{ assignment_id }}</td>
        <td>
          TODO: load info from item_id
        </td>
        <td>
          TODO: load info from item_id
        </td>
        <td>
          TODO: load info from item_id
        </td>
      </tr>
    </tbody>
  </table>
  <div
    v-if="current"
    :key="current"
  >
    <ResearcherToTeacher
      v-if="type === 'researcher-to-teacher'"
      :id="current"
    />
    <TeacherToStudent
      v-else-if="type === 'teacher-to-student'"
      :id="current"
    />
    <div
      v-else-if="type === 'teacher-to-student-research'"
    >
      TODO: special view for research assignment?
    </div>
    <div v-else>Need view for type "{{ type }}"</div>
  </div>
</template>

<script>
  import ScopeValue from '../../components/scope-value.vue'
  import UserInfo from '../../components/user-info.vue'
  import ResearcherToTeacher from './researcher-to-teacher.vue'
  import TeacherToStudent from './teacher-to-student.vue'

  export default {
    components: {
      UserInfo,
      ScopeValue,
      TeacherToStudent,
      ResearcherToTeacher
    },
    props: {
      type: String
    },
    data() {
      return {
        current: null
      }
    },
    computed: {
      assignments() {
        const me = this.$store.state.user
        return this.$store.getters['assignments/to'](me, this.type)
      }
    }
  }
</script>

<style scoped>

.selected {
  background: yellow;
}

tr {
  cursor: pointer;
}

.member-tables {
  display: flex;
  justify-content: space-around;
  align-items: top;
}

</style>