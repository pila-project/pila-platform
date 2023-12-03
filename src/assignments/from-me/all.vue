<template>
  <Splitpanes class="default-theme" style="height: 100%;">
    <Pane>
      <div class="wrapper">
        <div style="display: flex; justify-content: space-between; margin-bottom: 16px">
          <div>
            <h3 style="display: inline-block; margin-right: 16px;">{{ t('my-assignments') }}</h3>
            <IconButton
              icon="plus-circle"
              @click="add"
              :text="t('new-assignment')"
              background="#FFC442"
            />
          </div>
          <div style="color: #888888; display: flex; align-items: center; user-select: none; cursor: pointer;">
            <input v-model="showArchived" type="checkbox" id="show-archived" />
            <label for="show-archived"><em>{{ t('show-archived') }}</em></label>
          </div>
        </div>
        <table class="teacher-assignments-table">
          <thead>
            <tr>
              <th>{{ t('assignment') }}</th>
              <th>{{ t('classes-assigned') }}</th>
              <th>{{ t('results') }}</th>
              <th v-if="showArchived">{{ t('archived') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="id in assignmentsForActiveTable"
              :key="id"
              :class="{ selected: id === current }"
              @click="current = current === id ? null: id"
            >
              <td class="first">
                <vueScopeComponent :id="id" :path="['name']" />
              </td>
              <td>
                <span
                  v-if="assignedGroups(id).length === 0"
                  style="color: grey; font-size: 0.9em;"
                ><em>{{ t('no-classes-assigned') }}</em></span>
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
              <td :class="showArchived ? '' : 'last'">{{ t('results') }}</td>
              <td v-if="showArchived" class="last">
                <span v-if="archivedIds[id]">✘</span>
              </td>
            </tr>
            <tr v-for="n in Math.max(0, 6-assignmentsForActiveTable.length)"> <!-- PLACHOLDER ROWS -->
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
          <h3>{{ t('assignment-details') }}</h3>
          <div>
            <IconButton
              icon="pencil"
              @click="showEditModal = true"
              :text="t('modify')"
              background="#FFC442"
            />
            <IconButton
              v-if="archivedIds[current]"
              icon="archive"
              @click="readd(current)"
              :text="t('unarchive')"
              background="#FFC442"
            />
            <IconButton
              v-else
              icon="archive"
              @click="remove(current)"
              :text="t('archive')"
              background="#AAAAAA"
            />
          </div>
        </div>
        <div style="flex-grow: 1; display: flex;">
          <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <h4>{{ t('assignment-name') }}</h4>
              <vueScopeComponent :id="current" :path="['name']" />
            </div>
            <div>
              <h4>{{ t('content-alt') }}</h4>
              <IconButton
                icon="eye"
                @click="preview(current)"
                :text="t('preview')"
                background="#FFC442"
              />
            </div>
            <div>
              <h4>{{ t('results') }}</h4>
              <IconButton
                icon="dashboard"
                @click="showResultsModal = true"
                :text="t('see-dashboard')"
                background="#FFC442"
              />
            </div>
          </div>
          <div style="flex-grow: 1">
            <h4>{{ t('class-assigned') }}</h4>
            <table>
              <tbody>
                <tr v-for="id in assignedGroups(current)">
                  <td>
                    <vueScopeComponent :id="id" :path="['name']" />
                  </td>
                </tr>
                <tr v-for="n in Math.max(0, 4 - assignedGroups(current).length)"> <!-- Placeholder Rows -->
                  <td>-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Pane>
  </Splitpanes>
  <CreateEditAssignmentModal
    v-if="showEditModal"
    @close="showEditModal = false"
    :researcher="assignable_item_type === 'researcher-created'"
    :teacher="assignable_item_type === 'teacher-created'"
    :id="current"
  />
  <PreviewModal
    v-if="previewing"
    :id="previewing"
    @close="previewing = null"
  />
  <PILAModal
    v-if="showResultsModal"
    @close="showResultsModal = false"
    showCloseButton
  >
    <template v-slot:title>{{ t('assignment-results') }}</template>
    <template v-slot:body>
      <Dashboard :assignmentId="current" />
    </template>
  </PILAModal>
</template>

<script>
  import { v4 as uuid } from 'uuid'
  import PILAModal from '../../components/PILAModal.vue'
  import IconButton from '../../components/icon-button.vue'
  import PreviewModal from '../../components/PreviewModal.vue'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import { Splitpanes, Pane } from 'splitpanes'
  import Dashboard from './dashboard/index.vue'
  import CreateEditAssignmentModal from './CreateEditAssignmentModal.vue'

  export default {
    components: {
      PILAModal,
      PreviewModal,
      vueScopeComponent,
      IconButton,
      Splitpanes,
      Pane,
      Dashboard,
      CreateEditAssignmentModal
    },
    props: {
      assignable_item_type: String,
      assignment_type: String
    },
    data() {
      return {
        current: null,
        showEditModal: false,
        showArchived: false,
        previewing: null,
        showResultsModal: false
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
      t(slug) { return this.$store.getters.t(slug) },
      async add() {
        const content_id = uuid()
        const assignableItem = await Agent.state(content_id)
        assignableItem.name = 'New Assignment'
        this.current = content_id
        this.$store.dispatch('pila_tags/tag', { content_id, tag_type: this.assignable_item_type })
        this.showEditModal = true
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
      async preview(id) {
        const { content } = await Agent.state(this.current)
        this.previewing = content
      }
    }
  }
</script>

<style scoped>

h3, h4
{
  color: #2E32DB;
  margin-bottom: 12px;
}

table
{
  width: 100%;
}

.wrapper
{
  max-width: 800px;
  margin: auto;
  padding: 16px;
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