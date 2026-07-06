<template>
  <div class="assigned-to-me">
    <div v-if="noAssignments" style="width: 100%;">
      {{ t('it-looks-like-you-do-not-have-any-assignments-pl')}}
    </div>
    <div v-else style="width: 100%;">
      <div class="assigner-select">
        <div>
          <span><strong>{{ t('assigner') }}:</strong></span>
          <DecryptedName
            v-for="assigner in allAssigners"
            :key="assigner"
            :user="assigner"
            avatar
            :size="activeAssigner === assigner ? 'large' : 'small'"
            showName
            @click="activeAssigner = assigner"
          />
        </div>
        <div
          style="cursor: pointer; margin: 4px 24px 12px 0px;"
          @click="oldestFirst = !oldestFirst"
        >
          <v-icon
            size="x-small"
            color="grey"
            :icon="`fa-solid fa-arrow-${oldestFirst ? 'down' : 'up'}`"
          />
          <v-icon
            class="ml-2"
            color="grey"
            icon="fa-solid fa-calendar"
          />
        </div>
      </div>
      <v-row>
        <v-col
          v-for="assignmentId in filteredAssignmentIds"
          :key="assignmentId"
          cols="12"
          lg="3"
          md="4"
          sm="6"
        >
          <AssignmentCard
            :assignment="assignmentId"
            @play="play(assignmentId)"
          />
        </v-col>
      </v-row>
    </div>
  </div>
  <v-overlay v-if="id" :model-value="true" persistent>
    <div class="assignment-overlay">
      <vueEmbedComponent
        :id="id"
        @close="$router.push('/teacher/tasks')"
        allow="camera;microphone;fullscreen"
      />
    </div>
  </v-overlay>
</template>

<script>
  import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
  import DecryptedName from '../../components/decrypted-name.vue'
  import AssignmentCard from '../../pages/student/assignment-card.vue'

  export default {
    components: {
      vueEmbedComponent,
      AssignmentCard,
      DecryptedName
    },
    props: {
      type: String,
      id: String
    },
    data() {
      return {
        assignmentsToAssignerAndCreated: {},
        activeAssigner: null,
        oldestFirst: false
      }
    },
    computed: {
      assignmentIds() {
        const me = this.$store.state.user
        return this.$store.getters['assignments/to'](me, this.type)
      },
      noAssignments() {
        return this.assignmentIds.length === 0
      },
      allAssigners() {
        return Object.values(this.assignmentsToAssignerAndCreated)
          .map(assignment => assignment.owner)
          .reduce((acc, cur) => acc.includes(cur) ? acc : [ ...acc, cur ], [])
      },
      filteredAssignmentIds() {
        const compareCreated = (id1, id2) => {
          const ts1 = this.assignmentsToAssignerAndCreated[id1]?.created
          const ts2 = this.assignmentsToAssignerAndCreated[id2]?.created
          return ts1 > ts2 ? 1 : -1
        }

        const assignments = this.activeAssigner
          ? this.assignmentIds.filter(id => this.assignmentsToAssignerAndCreated[id]?.owner === this.activeAssigner)
          : this.assignmentIds
        const oldestFirst = assignments.sort(compareCreated)
        return this.oldestFirst ? oldestFirst : oldestFirst.reverse()
      }
    },
    watch: {
      assignmentIds: {
        immediate: true,
        async handler(ids) {
          ids.forEach(async id => {
            const { owner, created } = await Agent.metadata(id)
            this.assignmentsToAssignerAndCreated[id] = { owner, created }
            if (!this.activeAssigner) this.activeAssigner = owner
          })
        }
      }
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) },
      async play(assignment_id) {
        const assignment = await Agent.state(assignment_id)
        this.$router.push(`/teacher/tasks/${assignment.item_id}`)
      }
    }
  }
</script>

<style scoped>
.assigner-select {
  padding: 4px 0 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 80px;
}
.assigner-select > div > span {
  margin: 0 12px;
}
.assigned-to-me {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  padding: 16px;
}

.assignment-overlay
{
  position: fixed;
  top: 0;
  left: 0;
  background: white;
  overflow: hidden;
  line-height: 0;
  width: 100vw;
  height: calc(var(--vh, 1vh) * 100);
}

.assignment-overlay :deep(iframe)
{
  display: block;
}

</style>
