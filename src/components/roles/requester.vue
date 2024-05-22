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
          {{ t('please-send-your-full-name-school-institution-and-this-anonymous-id-to-edu-pila-oecd-org-in-order-to-obtain-access-to-pila') }}
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

      <IconButton v-if="requestedRole === role"
        @click="reload"
        :text="t('click-here-to-reload-once-you-receive-approval-confirmation')"
        background="orange"
      />
    </div>

    <div v-if="requestedRole !== role">
      <v-select
        :items="trainers"
        :label="t('select-your-trainer')"
      >
        <template v-slot:selection="{ item: { value } }">
          <DecryptedName :user="value" />
        </template>
        <template v-slot:item="{ item: { value }, props }">
          <v-list-item v-bind="props">
            <template v-slot:title>
              <DecryptedName :user="value" />
            </template>
          </v-list-item>
        </template>
      </v-select>
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
  import { TRAINER_TAG } from '../../constants.js'
  import DecryptedName from '../decrypted-name.vue'

  export default {
    name: 'role-requester',
    components: { IconButton, DecryptedName },
    props: {
      role: String
    },
    data() {
      return {
        trainers: []
      }
    },
    async created() {
      this.trainers = await (
        Agent
          .query(
            'taggings-for-tag',
            [this.$store.getters.tagPartition, TRAINER_TAG],
            'tags.knowlearning.systems'
          ).then(
            taggings => taggings.map(t => t.target)
          )
      )
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
      },
      reload() {
        location.reload()
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