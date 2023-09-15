<template>
  <h1>Role Assignments</h1>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Assigner</th>
        <th>Assigned</th>
        <th>Role</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="{ role, assigner, updated }, user in roles">
        <td><UserInfo :user="user" name /></td>
        <td><UserInfo :user="user" email /></td>
        <td><UserInfo :user="assigner" name /></td>
        <td>{{ updated }}</td>
        <td>
          <select
            v-if="role !== 'admin'"
            @change="({ target: { value } }) => grantRole(user, value)"
          >
            <option
              v-for="roleName in availableRoles"
              :selected="roleName === role"
            >
              {{ roleName }}
            </option>
          </select>
          <span v-else>admin</span>
        </td>
      </tr>
    </tbody>
  </table>
  <h1>Role Requests</h1>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Requested</th>
        <th>Role</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="{ role, updated }, user in roleRequests">
        <td><UserInfo :user="user" name /></td>
        <td><UserInfo :user="user" email /></td>
        <td>{{ updated }}</td>
        <td>{{ role }}</td>
        <td>
          <button @click="grantRole(user, role)">grant</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script>
  import UserInfo from '../../components/user-info.vue'

  export default {
    components: {
      UserInfo
    },
    state() {
      return {}
    },
    computed: {
      availableRoles() {
        return ['researcher', 'teacher', 'student']
      },
      roleRequests() {
        return this.$store.getters['roles/requests']()
      },
      roles() {
        return this.$store.getters['roles/assignments']()
      },
      iAmAnAdmin() {
        return this.$store.getters['roles/role'](this.$store.state.user) === 'admin'
      }
    },
    methods: {
      grantRole(user, role) {
        this.$store.dispatch('roles/assign', { user, role })
      }
    }
  }

</script>