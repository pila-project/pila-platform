<template>
  <div class="role-requester">
    <h2>{{ t('request-role') }}</h2>
    <div
      v-if="requestedRole"
      class="requested-role"
    >
      <div class="message-wrapper">
        <p>
          {{ headerText }}
          {{ t('please-email-pila-administrators-at-edu-pila-oecd-org-and-they-will-process-your-request') }}
          {{ t('include-your-pila-user-id') }}
        </p>
        <p class="user-id">
          {{ t('user-id') }} :: {{ $store.getters.user() }}
        </p>
      </div>

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
.requested-role .message-wrapper {
  width: 500px;
  border: 2px solid grey;
  border-radius: 12px;
  background: #EEE;
  padding: 20px 30px;
  margin-bottom: 20px;
}

p.user-id {
  margin: 20px 0;
}

.role-requester h2 {
  color: #2E32DB;
  margin: 14px;
}
.role-requester p {
  margin-bottom: 8px;
}


</style>