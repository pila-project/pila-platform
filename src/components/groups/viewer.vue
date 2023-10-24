<template>
  <Splitpanes class="default-theme">
    <Pane>
      <div class="wrapper">
        <h3 style="color: #2E32DB;">MY CLASSES</h3>
        <div style="display: flex; justify-content: space-between;">
          <IconButton
            icon="plus-circle"
            background="#FFC442"
            text="New Class"
            @click="add"
          />
          <IconButton
            icon="link"
            background="#FFC442"
            text="Link Students to You"
            @click="showLinkStudentModal = !showLinkStudentModal"
          />
        </div>
        <div class="class-list">
          <div style="display: flex; justify-content: space-between; align-items: flex-top; margin-bottom: 12px;">
            <h3 style="color: #2E32DB;">Class Name</h3>
            <div style="color: #888888; display: flex; align-items: center; user-select: none; cursor: pointer;">
              <input v-model="showArchived" type="checkbox" id="show-archived" />
              <label for="show-archived"><em>Show archived</em></label>
            </div>
          </div>
          <div v-if="!groups.length">You currently have no active classes</div>
          <div v-for="id in groups"
           :class="{
              'class-select-item' : true,
              'active' : current === id
            }"
            @click="current = (current === id ? null : id)"
          >
            <vueScopeComponent :id="id" :path="['name']" placeholder="(( unnamed class ))" />
          </div>
          <div v-if="showArchived" style="margin-top: 40px;">
            <h4 style="color: #888888;"><em>Archived</em></h4>
            <div v-for="id in archivedGroups"
              @click="current = (current === id ? null : id)"
              :class="{
                'class-select-item' : true,
                'archived' : true,
                'active' : current === id
              }">
              <vueScopeComponent placeholder="(( unnamed class ))" style="padding: 8px;" :id="id" :path="['name']" />
              <IconButton
                class="archive-button"
                @click="unarchive(id)"
                text="Unarchive"
                icon="archive"
                background="#ccc"
              />
            </div>
          </div>
        </div>
      </div>
    </Pane>


    <Pane v-if="current" :key="current">
      <div style="padding: 8px;">
        <h3 style="color: #2E32DB;">CLASS DETAILS</h3>
        <div> <!-- ROW FOR NAME AND ICONS -->
          <h4 style="display: inline-block; margin-right: 17px;">
            <vueScopeComponent :id="current" :path="['name']" style="color: #2E32DB;" />
          </h4>
          <IconButton
            text="Modify"
            icon="pencil"
            background="#FFC442"
            @click="showEditClassModal = !showEditClassModal"
          />
          <IconButton
            @click="archive(current)"
            text="Archive"
            icon="archive"
            background="#ccc"
          />
        </div>
        <h4 style="color: #2E32DB;">Students in Class:</h4>
        <table style="width: 100%;">
          <thead>
            <tr>
              <th>Student</th>
              <th>Last Login</th>
              <th>Other Classes</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="member in currentGroupMembers"
              :key="member"
            >
              <td style="text-align: left;"><UserInfo :user="member" name /></td>
              <td>-</td>
              <td>TODO</td>
            </tr>
            <tr
              v-if="currentGroupMembers.length < 6"
              v-for="n in 6 - currentGroupMembers.length"
              :key="`blank-row-${n}`"
            >
              <td style="width: 250px;">-</td>
              <td>-</td>
              <td>-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Pane>
  </Splitpanes>
  <PILAModal
    v-if="showLinkStudentModal"
    @close="showLinkStudentModal = false"
  >
    <template v-slot:title>Add Students to Your Student List</template>
    <template v-slot:body>
      <LinkStudentModal />
    </template>
  </PILAModal>
  <PILAModal
    v-if="showEditClassModal"
    @close="showEditClassModal = false"
    showCloseButton
    closeButtonText="Done"
  >
    <template v-slot:title>Create / Edit Class</template>
    <template v-slot:body>
      <CreateEditClassModal
        :id="current"
        :possibleMembers="possibleMembers"
      />
    </template>
  </PILAModal>
</template>

<script>
  import UserInfo from '../user-info.vue'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import { Splitpanes, Pane } from 'splitpanes'
  import IconButton from '../icon-button.vue'
  import PILAModal from '../PILAModal.vue'
  import LinkStudentModal from './LinkStudentModal.vue'
  import CreateEditClassModal from './CreateEditClassModal.vue'

  export default {
    components: {
      UserInfo,
      vueScopeComponent,
      Splitpanes,
      IconButton,
      Pane,
      LinkStudentModal,
      CreateEditClassModal,
      PILAModal
    },
    props: {
      possibleMembers: Array,
      type: String
    },
    data() {
      return {
        current: null,
        host: window.location.host,
        showArchived: false,
        showLinkStudentModal: false,
        showEditClassModal: false
      }
    },
    computed: {
      user() {
        return this.$store.state.user
      },
      groups() {
        return this.$store.getters['groups/groups'](this.type)
      },
      archivedGroups() {
        return this.$store.getters['groups/archivedGroups'](this.type)
      },
      currentGroupMembers() {
        return this.$store.getters['groups/members'](this.current)
      }
    },
    methods: {
      async add() {
        const { type } = this
        this.current = await this.$store.dispatch('groups/add', { name: 'New Class', type })
        this.showEditClassModal = true
      },
      archive(id) {
        this.$store.dispatch('groups/archive', id)
        if (this.current === id) this.current = null
      },
      unarchive(id) {
        this.$store.dispatch('groups/unarchive', id)
      }
    }
  }
</script>

<style scoped>

.wrapper
{
  max-width: 800px;
  padding: 16px;
  margin: auto;
}

tr {
  cursor: pointer;
}

.class-list
{
  border: 1px solid #2E9DF9;
  border-radius: 4px;
  background: white;
  margin-top: 8px;
  padding: 8px;
}
.class-select-item {
  user-select: none;
  border-radius: 8px;
  padding: 6px;
  border: 2px solid transparent;
  display: flex;
  margin: 0;
  justify-content: space-between;
}
.class-select-item.archived {
    padding: 0 6px;
}
.class-select-item:hover {
  cursor: pointer;
  background: #eee;
}
.class-select-item button {
  display: none;
}
.class-select-item:hover button {
  display: block;
}
.class-select-item.active {
  border: 2px solid blue;
}
.archive-button {
  margin: 0;
}
</style>
