<template>
  <Splitpanes class="default-theme">
    <Pane>
      <div class="wrapper">
        <h3 style="color: #2E32DB;">{{ GET_TEXT.MAIN_HEADER }}</h3>
        <div style="display: flex; justify-content: space-between;">
          <IconButton
            icon="plus-circle"
            background="#FFC442"
            :text="GET_TEXT.NEW_GROUP_TEXT"
            @click="add"
          />
          <IconButton
            v-if="type === 'class'"
            icon="link"
            background="#FFC442"
            :text="t('link-students-to-you')"
            @click="showLinkStudentModal = !showLinkStudentModal"
          />
          <IconButton
            v-if="type === 'class'"
            icon="key"
            background="#FFC442"
            :text="t('enter-encryption-key-word')"
            @click="showNamePasswordModal = true"
          />
        </div>
        <div class="class-list">
          <div style="display: flex; justify-content: space-between; align-items: flex-top; margin-bottom: 12px;">
            <h3 style="color: #2E32DB;">{{ GET_TEXT.LIST_HEADER }}</h3>
            <div style="color: #888888; display: flex; align-items: center; user-select: none; cursor: pointer;">
              <input v-model="showArchived" type="checkbox" id="show-archived" />
              <label for="show-archived"><em>{{ t('show-archived') }}</em></label>
            </div>
          </div>
          <div v-if="!groups.length">{{ GET_TEXT.NO_GROUPS }}</div>
          <div
            v-for="id in groups"
            :key="`group-list-${id}`"
            :class="{
              'class-select-item' : true,
              'active' : current === id
            }"
            @click="current = (current === id ? null : id)"
          >
            <vueScopeComponent :id="id" :path="['name']" placeholder="(( unnamed class ))" />
          </div>
          <div v-if="showArchived" style="margin-top: 40px;">
            <h4 style="color: #888888;"><em>{{ t('archived') }}</em></h4>
            <div
              v-for="id in archivedGroups"
              :key="`archived-group-list-${id}`"
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
        <br>
        <br>
        <div style="display: flex; justify-content: space-between;">
          <h3 style="color: #2E32DB;"> {{ GET_TEXT.MEMBER_LIST_HEADER }}</h3>
          <IconButton
            v-if="type === 'class'"
            :text="t('manage-data')"
            background="rgb(220 220 220)"
            textColor="grey"
            @click="showDeleteDataModal = !showDeleteDataModal"
          />
        </div>
        <div class="class-list">
          <div v-if="!possibleMembers.length">{{ GET_TEXT.CURRENTLY_NO_MEMBERS }}</div>
          <div
            v-for="id in possibleMembers"
            :key="`possible-member-id-${id}`"
          >
            <DecryptedName :user="id" />
          </div>
        </div>
      </div>
    </Pane>
    <Pane v-if="current" :key="current">
      <div style="padding: 8px;">
        <h3 style="color: #2E32DB;">{{ GET_TEXT.SIDE_HEADER }}</h3>
        <div> <!-- ROW FOR NAME AND ICONS -->
          <h4 style="display: inline-block; margin-right: 17px;">
            <vueScopeComponent :id="current" :path="['name']" style="color: #2E32DB;" />
          </h4>
          <IconButton
            :text="t('modify')"
            icon="pencil"
            background="#FFC442"
            @click="showEditClassModal = !showEditClassModal"
          />
          <IconButton
            @click="archive(current)"
            :text="t('archive')"
            icon="archive"
            background="#ccc"
          />
        </div>
        <h4 style="color: #2E32DB;">{{ GET_TEXT.TABLE_HEADER }}</h4>
        <table style="width: 100%;">
          <thead>
            <tr>
              <th>{{ GET_TEXT.MEMBER_COL_HEADER }}</th>
<!--
              <th>{{ t('last-login') }}</th>
              <th>{{ GET_TEXT.OTHER_GROUPS_COL_HEADER }}</th>
-->
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="member in currentGroupMembers"
              :key="member"
            >
              <td style="text-align: left;"><DecryptedName :user="member" /></td>
            </tr>
            <tr
              v-for="n in Math.max(0, 6 - currentGroupMembers.length)"
              :key="`blank-row-${n}`"
            >
              <td style="width: 250px;">-</td>
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
    <template v-slot:title>{{ t('add-students-to-your-student-list') }}</template>
    <template v-slot:body>
      <LinkStudentModal />
    </template>
  </PILAModal>
  <PILAModal
    v-if="showNamePasswordModal"
    @close="showNamePasswordModal = false"
    showCloseButton
    width="600px"
    :closeButtonText="t('done')"
  >
    <template v-slot:title>{{ t('enter-encryption-key-word') }}</template>
    <template v-slot:body>
      <div style="padding: 20px 42px; text-align: center;">
        {{ t('enter-an-encryption-key-word-you-will-remember-this-key-word-will-be-used-to-allow-you-to-see-your-students-names-while-preserving-the-anonymity-of-their-data-for-all-other-users') }}
        <br>
        <input v-model="namePassword" class="rounded-grey" style="width: 60%; text-align: center;" />
      </div>
    </template>
  </PILAModal>
  <PILAModal
    v-if="showEditClassModal"
    @close="showEditClassModal = false"
    showCloseButton
    :closeButtonText="t('done')"
  >
    <template v-slot:title>{{ GET_TEXT.MODAL_HEADER }}</template>
    <template v-slot:body>
      <CreateEditGroupModal
        :type="type"
        :id="current"
        :possibleMembers="possibleMembers"
      />
    </template>
  </PILAModal>
  <PILAModal
    v-if="showDeleteDataModal"
    @close="showDeleteDataModal = false"
    showCloseButton
    :closeButtonText="t('done')"
  >
    <template v-slot:title>{{ t('manage-data') }}</template>
    <template v-slot:body>
      <div style="margin: 40px 32px;">
        {{ t('to-request-deletion-of-data-please-email-data-requests-knowlearning-org') }}
      </div>
    </template>
  </PILAModal>
</template>

<script>
  import naclUtil from 'tweetnacl-util'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import { Splitpanes, Pane } from 'splitpanes'
  import IconButton from '../icon-button.vue'
  import PILAModal from '../PILAModal.vue'
  import LinkStudentModal from './LinkStudentModal.vue'
  import CreateEditGroupModal from './CreateEditGroupModal.vue'
  import DecryptedName from '../decrypted-name.vue'
  import * as encryption from '../../encryption.js'

  export default {
    components: {
      DecryptedName,
      vueScopeComponent,
      Splitpanes,
      IconButton,
      Pane,
      LinkStudentModal,
      CreateEditGroupModal,
      PILAModal
    },
    props: {
      possibleMembers: Array,
      type: String
    },
    data() {
      const namePassword = localStorage.getItem(`zkek-${this.$store.state.user}`) || ''
      return {
        current: null,
        host: window.location.host,
        showArchived: false,
        showLinkStudentModal: false,
        showEditClassModal: false,
        showDeleteDataModal: false,
        showNamePasswordModal: !namePassword,
        namePassword
      }
    },
    watch: {
      async namePassword(val) {
        localStorage.setItem(`zkek-${this.$store.state.user}`, val)
        const publicKeys = await Agent.state('user-info-public-keys')
        const { publicKey: publicKeyBuffer } = await encryption.generateKeyPair(val)
        publicKeys.public = naclUtil.encodeBase64(publicKeyBuffer)
        console.log('stringified length', publicKeys.public.length)
      }
    },
    computed: {
      GET_TEXT() {
        if (this.type === 'class') {
          return {
            MAIN_HEADER: this.t('my-classes'),
            LIST_HEADER: this.t('class-name'),
            NEW_GROUP_TEXT: this.t('new-class'),
            MEMBER_LIST_HEADER: this.t('my-students'),
            SIDE_HEADER: this.t('class-details'),
            TABLE_HEADER: this.t('students-in-class'),
            MEMBER_COL_HEADER: this.t('student'),
            OTHER_GROUPS_COL_HEADER: this.t('other-classes'),
            CURRENTLY_NO_MEMBERS: this.t('you-currently-have-no-students'),
            NO_GROUPS: this.t('you-currently-have-no-active-classes'),
            MODAL_HEADER: this.t('create-edit-class')
          }
        } else if (this.type === 'teachers') {
          return {
            MAIN_HEADER: this.t('my-teacher-groups'),
            LIST_HEADER: this.t('group-name'),
            NEW_GROUP_TEXT: this.t('new-group'),
            MEMBER_LIST_HEADER: this.t('my-teachers'),
            SIDE_HEADER: this.t('group-details'),
            TABLE_HEADER: this.t('teachers-in-group'),
            MEMBER_COL_HEADER: this.t('teacher'),
            OTHER_GROUPS_COL_HEADER: this.t('other-groups'),
            CURRENTLY_NO_MEMBERS: this.t('you-currently-have-no-teachers'),
            NO_GROUPS: this.t('you-currently-have-no-active-groups'),
            MODAL_HEADER: this.t('create-edit-group')
          }
        } else {
          return {}
        }
      },
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
      t(slug) { return this.$store.getters.t(slug) },
      async add() {
        const { type } = this
        this.current = await this.$store.dispatch('groups/add',{
          type,
          name: this.GET_TEXT.NEW_GROUP_TEXT
        })
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
