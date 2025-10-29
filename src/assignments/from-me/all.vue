<template>
  <div class="split-panes">
    <div class="pane">
      <div class="wrapper">
        <div style="display: flex; justify-content: space-between; padding: 16px">
          <div>
            <h3 style="display: inline-block; margin-right: 16px;">{{ t('my-assignments') }}</h3>
            <IconButton
              icon="plus-circle"
              @click="add"
              :text="t('new-assignment')"
              background="#FFC442"
            />
          </div>
          <ShowArchivedToggle v-model="showArchived" />
        </div>

        <v-data-table
          :no-data-text="t('no-data-available')"
          :headers="headers"
          :items="assignmentsForActiveTable"
          :items-per-page="-1"
          fixed-header
          @click:row="handleRowClick"
          :row-props="item => {
            if (item.item === current) {
              return { style: { background: '#EEEEEE' } }
            }
            else return {}
          }"
        >
          <template #bottom></template>
          <template v-slot:item.assignment_name="{ item }">
            <vueScopeComponent :id="item" :path="['name']" />
          </template>
          <template v-slot:item.classes_assigned="{ item }">
            <span
              v-if="assignedGroups(item).length === 0"
              style="color: grey; font-size: 0.9em;"
            ><em>{{ t('no-classes-assigned') }}</em></span>
            <span
              v-for="groupId, index in assignedGroups(item)"
              :key="groupId"
            >
              {{ index > 0 ? ', ' : '' }}
              <vueScopeComponent
                :id="groupId" :path="['name']"
              />
            </span>
          </template>
          <template v-slot:item.assignment_date="{ item }">
            <vueScopeComponent
              metadata
              :id="item"
              :path="['created']"
            >
              <template v-slot="data">
                {{ data.loading ? '-' : (new Date(data.value)).toLocaleString() }}
              </template>
            </vueScopeComponent>
          </template>
          <template v-slot:item.archived="{ item }">
            <span v-if="archivedIds[item]">✘</span>
          </template>
        </v-data-table>
      </div>
    </div>
    <div class="pane" v-if="current" :key="current">
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
          <h3 style="display: inline-block; margin-right: 17px;">
            <vueScopeComponent
              :id="current"
              :path="['name']"
              style="color: #2E32DB;"
            />
          </h3>
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
              <IconButton
                icon="eye"
                @click="preview(current)"
                :text="t('preview')"
                background="#FFC442"
              />
              <br>
              <IconButton
                icon="dashboard"
                @click="showResultsModal = true"
                :text="t('live-monitoring-dashboard')"
                background="#FFC442"
              />
              <br v-if="assignmentContainsCandli">
              <IconButton
                icon="dashboard"
                v-if="assignmentContainsCandli"
                @click="showCandliResultsModal = true"
                :text="t('competency-dashboard')"
                background="rgb(107, 234, 201)"
              />
              <br v-if="assignmentContainsGenAI">
              <IconButton
                icon="dashboard"
                v-if="assignmentContainsGenAI"
                @click="showGenAIDashboardModal = true"
                :text="t('generative-ai-module-dashboard')"
                background="#FFC442"
              />
            </div>
          </div>
          <div style="flex-grow: 1">
            <h4>{{ t('class-assigned') }}</h4>
            <table class="old-table">
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
            <br>
            <div style="text-align: right;">
              <IconButton
                icon="message"
                @click="goToSupport"
                :text="t('send-feedback')"
                background="#FFC442"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
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
    width="90vw"
    height="90vh"
  >
    <template v-slot:title>
      <span>
        {{ t('live-monitoring-dashboard') }} -
        <vueScopeComponent :id="current" :path="['name']" />
      </span>
    </template>
    <template v-slot:body>
      <suspense>
        <Dashboard
          :assignment="current"
          :url="dashboardUrl"
        />
      </suspense>
    </template>
  </PILAModal>
  <PILAModal
    v-if="showCandliResultsModal"
    @close="showCandliResultsModal = false"
    showCloseButton
    width="90vw"
    height="90vh"
  >
    <template v-slot:title>
      <span>
        {{ t('competency-dashboard') }} -
        <vueScopeComponent :id="current" :path="['name']" />
      </span>
    </template>
    <template v-slot:body>
      <div style="position: absolute; width: 100%; height: 100%;">
        <CandliDashboard
          :assignment="current"
        />
      </div>
    </template>
  </PILAModal>
  <PILAModal
    v-if="showGenAIDashboardModal"
    @close="showGenAIDashboardModal = false"
    showCloseButton
    width="90vw"
    height="90vh"
  >
    <template v-slot:title>
      <span>
        {{ t('generative-ai-module-dashboard') }}
      </span>
    </template>
    <template v-slot:body>
      <div style="position: absolute; width: 100%; height: 100%;">
        <GenAIDashboard
          :assignment="current"
        />
      </div>
    </template>
  </PILAModal>
</template>

<script>
  import { v4 as uuid } from 'uuid'
  import PILAModal from '../../components/PILAModal.vue'
  import IconButton from '../../components/icon-button.vue'
  import PreviewModal from '../../components/PreviewModal.vue'
  import ShowArchivedToggle from '../../components/show-archived-toggle.vue'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import Dashboard from './dashboard/index.vue'
  import CreateEditAssignmentModal from './CreateEditAssignmentModal.vue'
  import CandliDashboard from './candli-dashboard.vue'
  import GenAIDashboard from './gen-ai-dashboard.vue'
  import { CANDLI_SEQUENCES, GEN_AI_SEQUENCES } from '../../constants.js'

  let idToCreated = {}

  export default {
    components: {
      PILAModal,
      PreviewModal,
      vueScopeComponent,
      IconButton,
      Dashboard,
      CandliDashboard,
      GenAIDashboard,
      CreateEditAssignmentModal,
      ShowArchivedToggle
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
        showResultsModal: false,
        showCandliResultsModal: false,
        assignmentContainsCandli: null,
        assignmentContainsGenAI: false,
        showGenAIDashboardModal: false,
        dashboardUrl: null
      }
    },
    mounted() {
      this.assignable_items.forEach(async id => {
        idToCreated[id] = await Agent.metadata(id).then(md => md.created)
      })
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
      },
      headers() {
        const headers = [
          { title: this.t('assignment'), key: 'assignment_name', sortable: false },
          { title: this.t('classes-assigned'), key: 'classes_assigned', sortable: false },
          {
            title: this.t('assignment-date'),
            key: 'assignment_date',
            sortRaw: (a, b) => idToCreated[a] - idToCreated[b]
          }
        ]

        if (this.showArchived) headers.push({
          title: this.t('archived'), key: 'archived'
        })

        return headers
      }
    },
    watch: {
      current(value) {
        this.reassessContents()
      },
      showEditModal(value) {
        if (!value) this.reassessContents()
      }
    },
    methods: {
      handleRowClick(event, item) {
        this.current = this.current === item.item ? null : item.item
      },
      goToSupport() {
        this.$router.push(`/teacher/support?assignment=${this.current}`)
      },
      async reassessContents() {
        this.assignmentContainsCandli = null
        if (this.current) {
          await Agent
            .state(this.current)
            .then(async ({ content }) => {
              this.assignmentContainsCandli = !!CANDLI_SEQUENCES[content]
              this.assignmentContainsGenAI = !!GEN_AI_SEQUENCES[content]

              if ((await Agent.metadata(content)).domain === 'datawise.accingo.co') {
                this.dashboardUrl = 'https://datawise.accingo.co/dashboard'
              }
              else this.dashboardUrl = null
            })
        }
      },
      t(slug) { return this.$store.getters.t(slug) },
      async add() {
        const content_id = uuid()
        const assignableItem = await Agent.state(content_id)
        assignableItem.name = this.t('new-assignment')
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
        return this.$store.getters['assignments/assignedGroups'](id, this.assignment_type, false)
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

.member-tables {
  display: flex;
  justify-content: space-around;
  align-items: top;
}

</style>