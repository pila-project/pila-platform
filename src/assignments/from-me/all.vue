<template>
  <Splitpanes class="default-theme" style="height: 100%;">
    <Pane>
      <div style="padding: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 16px">
          <div>
            <h3 style="display: inline-block; margin-right: 16px;">MY ASSIGNMENTS</h3>
            <IconButton
              icon="plus-circle"
              @click="add"
              text="New Assignment"
              background="#FFC442"
            />
          </div>
          <div style="color: #888888; display: flex; align-items: center; user-select: none; cursor: pointer;">
            <input v-model="showArchived" type="checkbox" id="show-archived" />
            <label for="show-archived"><em>Show archived</em></label>
          </div>
        </div>
        <table class="teacher-assignments-table">
          <thead>
            <tr>
              <th>Assignment</th>
              <th>Classes Assigned</th>
              <th>Results</th>
              <th v-if="showArchived">Archived</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="id in assignmentsForActiveTable"
              :key="id"
              :class="{ selected: id === current }"
              @click="current = current === id ? null: id"
            >
              <td class="first"><ScopeValue :scope="id" :path="['name']" /></td>
              <td>
                <span
                  v-for="groupId, index in assignedGroups(id)"
                  :key="groupId"
                >
                  {{ index > 0 ? ', ' : '' }}
                  <vueScopeComponent
                    :id="groupId" :path="['name']"
                  />
                </span>
              </td>
              <td :class="showArchived ? '' : 'last'">results</td>
              <td v-if="showArchived" class="last">
                <span v-if="archivedIds[id]">✘</span>
              </td>
            </tr>
            <tr v-for="n in (6-assignmentsForActiveTable.length)"> <!-- PLACHOLDER ROWS -->
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td v-if="showArchived">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Pane>
    <Pane v-if="current" :key="current">
      <div
        style="
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px;
          height: calc(100% - 32px);
        "
      >
        <div
          style="
            display: flex;
            justify-content: space-between;
            padding-bottom: 24px;
          "
        >
          <h3>ASSIGNMENT DETAILS</h3>
          <div>
            <IconButton
              icon="pencil"
              @click="showEditModal = true"
              text="Modify"
              background="#FFC442"
            />
            <IconButton
              v-if="archivedIds[current]"
              icon="archive"
              @click="readd(current)"
              text="Unarchive"
              background="#FFC442"
            />
            <IconButton
              v-else
              icon="archive"
              @click="remove(current)"
              text="Archive"
              background="#AAAAAA"
            />
          </div>
        </div>
        <div style="flex-grow: 1; display: flex;">
          <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <h4>Assignment Name</h4>
              <vueScopeComponent :id="current" :path="['name']" />
            </div>
            <div>
              <h4>Content</h4>
              <vueScopeComponent :id="current" :path="['content']" />
            </div>
            <div>
              <h4>Results</h4>
            </div>
            <div>
              <IconButton
                icon="eye"
                @click="preview"
                text="Preview"
                background="#FFC442"
              />
            </div>
          </div>
          <div>
            <table>
              <thead>
                <tr>
                  <th>
                    Class Assigned
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="id in assignedGroups(current)">
                  <td>
                    <vueScopeComponent :id="id" :path="['name']" />
                  </td>
                </tr>
                <tr v-for="n in 4 - assignedGroups(current).length"> <!-- Placeholder Rows -->
                  <td>-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Pane>
  </Splitpanes>
  <PILAModal
    v-if="showEditModal"
    @close="showEditModal = false"
  >
    <template v-slot:title>Create/Modify Assignment</template>
    <template v-slot:body>
      <ResearcherToTeacherAssignment
        v-if="assignable_item_type === 'researcher-created'"
        :id="current"
      />
      <TeacherToStudentAssignment
        v-else-if="assignable_item_type === 'teacher-created'"
        :id="current"
      />
    </template>
  </PILAModal>
</template>

<script>
  import { v4 as uuid } from 'uuid'
  import PILAModal from '../../components/PILAModal.vue'
  import ScopeValue from '../../components/scope-value.vue'
  import UserInfo from '../../components/user-info.vue'
  import IconButton from '../../components/icon-button.vue'
  import ResearcherToTeacherAssignment from './researcher-to-teacher.vue'
  import TeacherToStudentAssignment from './teacher-to-student.vue'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import { Splitpanes, Pane } from 'splitpanes'

  export default {
    components: {
      PILAModal,
      UserInfo,
      ScopeValue,
      ResearcherToTeacherAssignment,
      TeacherToStudentAssignment,
      vueScopeComponent,
      IconButton,
      Splitpanes,
      Pane
    },
    props: {
      assignable_item_type: String,
      assignment_type: String
    },
    data() {
      return {
        current: null,
        showEditModal: false,
        showArchived: false
      }
    },
    computed: {
      assignmentsForActiveTable() {
        if (this.showArchived) return [...this.assignable_items, ...this.archived_assignable_items]
        else return this.assignable_items
      },
      assignable_items() {
        return this.$store.getters['pila_tags/withTag'](this.assignable_item_type)
      },
      archived_assignable_items() {
        return this.$store.getters['pila_tags/archivedWithTag'](this.assignable_item_type)
      },
      archivedIds() {
        return Object.fromEntries(this.archived_assignable_items.map(id => [id, true]))
      }
    },
    methods: {
      async add() {
        const name = prompt(`${this.assignable_item_type === 'teacher-created' ? 'Assignment' : 'Study' } Name`)
        if (!name) return

        const content_id = uuid()
        const assignableItem = await Agent.state(content_id)
        assignableItem.name = name // TODO: add reasonable defaults based on type
        this.current = content_id
        this.$store.dispatch('pila_tags/tag', { content_id, tag_type: this.assignable_item_type })
      },
      async readd(content_id) {
        await this.$store.dispatch('pila_tags/tag', { content_id, tag_type: this.assignable_item_type })
      },
      remove(content_id) {
        const tag_type = this.assignable_item_type
        this.$store.dispatch('pila_tags/untag', { content_id, tag_type })
        if (this.current === content_id) this.current = null
      },
      assignedGroups(id) {
        return this.$store.getters['assignments/assignedGroups'](id, this.assignment_type)
      },
      edit(id) {
        alert('SHOW EDIT MODAL FOR ' + id)
      },
      preview(id) {
        alert('SHOW PREVIEW MODAL FOR ' + id)
      }
    }
  }
</script>

<style scoped>

.wrapper
{
  max-width: 800px;
  margin: auto;
}

.teacher-assignments-table
{
  width: 100%;
  margin: auto;
}

tr.selected td {
  border-top: 2px solid #1B1B83;
  border-bottom: 2px solid #1B1B83;
}
tr.selected td.first {
  border: 2px solid #1B1B83;
  border-right: none;
  border-bottom-left-radius: 12px;
  border-top-left-radius: 12px;
}
tr.selected td.last {
  border: 2px solid #1B1B83;
  border-left: none;
  border-bottom-right-radius: 12px;
  border-top-right-radius: 12px;

}

.member-tables {
  display: flex;
  justify-content: space-around;
  align-items: top;
}

</style>