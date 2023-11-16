<template>
  <div class="role-requester">
    <h2>{{ t('request-role') }}</h2>
    <div
      v-if="requestedRole"
      class="requested-role"
    >
      <p>{{ headerText }}</p> 
      <IconButton v-if="requestedRole === role"
        @click="requestRole(null)"
        :text="t('undo-request')"
        background="orange"
      />
    </div>

    <div v-if="requestedRole !== role">
      <IconButton
        @click="requestRole(role)"
        :text="buttonText"
        background="orange"
      />
    </div>

  </div>
</template>

<script>
  import IconButton from '../icon-button.vue'
  export default {
    name: 'role-requester',
    components: { IconButton },
    props: {
      role: String
    },
    computed: {
      headerText() {
        let output = this.t('you-have-requested-the-role-of')
        output += ' '
        output += this.t(this.role)
        output += '. '
        output += this.t('please-wait-for-admin-approval')
        return output
      },
      buttonText() {
        return this.t('request-role-of') + ' "' + this.t(this.role) + '"'
      },
      requestedRole() {
        return this.$store.getters['roles/request'](this.$store.state.user)
      },
      validResearcher() {
        return false
      }
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) },
      requestRole(role) {
        this.$store.dispatch('roles/request', role)
      }
    }
  }
</script>

<style scoped>
.role-requester,
.requested-role
{
  display: flex;
  flex-direction: column;
  align-items: center;
}
.role-requester h2 {
  color: #2E32DB;
  margin: 14px;
}
.role-requester p {
  margin-bottom: 8px;
}


</style>