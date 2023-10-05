<template>
  <Splitpanes class="default-theme">
    <Pane>
      <div style="padding: 8px">
        <h3 style="color: #2E32DB;">MY CLASSES</h3>
        <div style="display: flex; justify-content: space-between;">
          <IconButton
            icon="plus-circle"
            background="#FFC442"
            text="New Class"
          />
          <IconButton
            icon="link"
            background="#FFC442"
            text="Add Students"
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
          <div v-for="id in groups">
            <div
              @click="current = (current === id ? null : id)"
              :class="{
                'class-select-item' : true,
                'active' : current === id
              }">
              <ScopeWatcher :id="id" :path="['name']" />
            </div>
          </div>
          <div v-if="showArchived" style="margin-top: 18px;">
            <h4 style="color: #888888;"><em>Archived</em></h4>
          <div v-for="id in archivedGroups">
            <div
              @click="current = (current === id ? null : id)"
              :class="{
                'class-select-item' : true,
                'active' : current === id
              }">
              <ScopeWatcher :id="id" :path="['name']" />
            </div>
          </div>
          </div>
        </div>
      </div>
    </Pane>
    <Pane v-if="current">
      <div style="padding: 8px;">
        <h3 style="color: #2E32DB;">CLASS DETAILS</h3>
        <ScopeWatcher :id="current" :path="['name']" />

      </div>
    </Pane>
  </Splitpanes>
  <div class="wrapper">
    <h1>Groups</h1>
    <button @click="add">New Group</button>
    <br>
    <br>
    Your student link:
    <a :href="`https://${host}/join/${user}`">
      {{`https://${host}/join/${user}`}}
    </a>
    <br>
    <br>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="id in groups"
          :key="id"
          :class="{ selected: id === current }"
          @click="current = current === id ? null: id"
        >
          <td>
            <ScopeWatcher :id="id" :path="['name']" />
          </td>
          <td>
            <button @click.stop="remove(id)">x</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="current">
      <h1>
        <ScopeWatcher :id="current" :path="['name']" />
      </h1>
      <div class="member-tables">
        <div>
          <table>
            <tr>
              <th>Member</th>
              <th></th>
            </tr>
            <tr
              v-for="member in currentGroupMembers"
              :key="member"
            >
              <td><UserInfo :user="member" name /></td>
              <td>
                <button @click="removeMember(member, current)">x</button>
              </td>
            </tr>
          </table>
        </div>
        <div>
          <table>
            <tr>
              <th>Member</th>
              <th></th>
            </tr>
            <tr
              v-for="member in possibleMembers"
              :key="member"
            >
              <td>
                <button @click="addMember(member, current)">+</button>
              </td>
              <td><UserInfo :user="member" name /></td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import UserInfo from '../user-info.vue'
  import ScopeWatcher from '../scope-watcher.vue'

  import { Splitpanes, Pane } from 'splitpanes'
  import IconButton from '../icon-button.vue'



  export default {
    components: {
      UserInfo,
      ScopeWatcher,
      Splitpanes,
      IconButton,
      Pane
    },
    props: {
      possibleMembers: Array,
      type: String
    },
    data() {
      return {
        current: null,
        host: window.location.host,
        showArchived: false
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
        const name = prompt('Group name')
        const { type } = this
        this.current = await this.$store.dispatch('groups/add', { name, type })
      },
      remove(id) {
        this.$store.dispatch('groups/remove', id)
        if (this.current === id) this.current = null
      },
      addMember(user_id, group_id) {
        this.$store.dispatch('groups/addMember', { user_id, group_id })
      },
      removeMember(user_id, group_id) {
        this.$store.dispatch('groups/removeMember', { user_id, group_id })
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
}
.class-select-item:hover {
  cursor: pointer;
  background: #eee;
}
.class-select-item.active {
  border: 2px solid blue;
}
</style>
