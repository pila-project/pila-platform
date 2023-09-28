<template>
  <h1>Groups</h1>
  <button @click="add">New Group</button>
  Your student link:
  <a :href="`https://${host}/join/${user}`">
    {{`https://${host}/join/${user}`}}
  </a>
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
    <hr>
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
</template>

<script>
  import UserInfo from '../user-info.vue'
  import ScopeWatcher from '../scope-watcher.vue'

  export default {
    components: {
      UserInfo,
      ScopeWatcher
    },
    props: {
      possibleMembers: Array,
      type: String
    },
    data() {
      return {
        current: null,
        host: window.location.host
      }
    },
    computed: {
      user() {
        return this.$store.state.user
      },
      groups() {
        return this.$store.getters['groups/groups'](this.type)
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