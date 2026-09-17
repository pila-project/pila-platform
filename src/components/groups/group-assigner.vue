<template>
  <div class="assignment-tables">
    <table class="old-table" style="min-width: 250px;">
      <tbody>
        <tr
          v-for="group_id in groups"
          :key="group_id"
          :class="{ 'assigner-row-blocked': isSecondGroupBlocked(group_id) }"
          @click="onBlockedRowClick(group_id)"
        >
          <td>
            <PCheckbox
              :modelValue="!!assignmentForGroup(group_id)"
              :disabled="isSecondGroupBlocked(group_id)"
              size="sm"
              @update:modelValue="() => toggleAssignment(group_id)"
            />
          </td>
          <td>
            <vueScopeComponent
              :id="group_id"
              :path="['name']"
            />
          </td>
        </tr>
        <tr
          v-for="n in Math.max(0, 6 - groups.length)"
          :key="n"
        >
          <td>-</td>
          <td>-</td>
        </tr>
      </tbody>
    </table>
  </div>

  <PAlertDialog
    v-if="showOneGroupError"
    variant="error"
    :title="t('only-one-group-per-assignment')"
    :confirm-text="t('done')"
    cancel-text=""
    @confirm="showOneGroupError = false"
    @cancel="showOneGroupError = false"
  />
</template>

<script>
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import { PCheckbox, PAlertDialog } from '@/components/ui/index.js'

  const TEACHER_TO_STUDENT = 'teacher-to-student'

  export default {
    props: {
      id: String,
      groups: Array,
      assignment_type: String
    },
    components: {
      vueScopeComponent,
      PCheckbox,
      PAlertDialog
    },
    data() {
      return {
        showOneGroupError: false
      }
    },
    computed: {
      assignments() {
        return this.$store.getters['assignments/assignments'](this.id, this.assignment_type)
      },
      assignedGroupIds() {
        return this.assignments.map(id => this.groupForAssignment(id))
      }
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) },
      groupForAssignment(assignment_id) {
        return this.$store.getters['assignments/get'](assignment_id).group_id
      },
      makeAssignment(group_id, item_id, assignment_type) {
        this.$store.dispatch('assignments/assign', { group_id, item_id, assignment_type })
      },
      removeAssignment(assignment_id) {
        this.$store.dispatch('assignments/unassign', assignment_id)
      },
      assignmentForGroup(group_id) {
        return this.assignments.find(id => this.groupForAssignment(id) === group_id)
      },
      isSecondGroupBlocked(group_id) {
        if (this.assignment_type !== TEACHER_TO_STUDENT) return false
        if (this.assignmentForGroup(group_id)) return false
        return this.assignedGroupIds.some(id => id && id !== group_id)
      },
      onBlockedRowClick(group_id) {
        if (this.isSecondGroupBlocked(group_id)) this.showOneGroupError = true
      },
      toggleAssignment(group_id) {
        const assignment_id = this.assignmentForGroup(group_id)
        if (assignment_id) {
          this.removeAssignment(assignment_id)
          return
        }
        if (this.isSecondGroupBlocked(group_id)) {
          this.showOneGroupError = true
          return
        }
        this.makeAssignment(group_id, this.id, this.assignment_type)
      }
    }

  }

</script>

<style>

.assignment-tables {
  margin: 16px;
  display: flex;
  justify-content: space-around;
  align-items: top;
}

.assigner-row-blocked {
  opacity: 0.5;
  cursor: not-allowed;
}

</style>
