<template>
  <div class="student-assignments">
    <div v-if="noAssignments" style="width: 100%;">
      {{ t('it-looks-like-you-do-not-have-any-assignments')}}
    </div>
    <div v-else style="width: 100%;">
      <div class="teacher-select">
        <div>
          <span><strong>{{ t('your-teachers') }}:</strong></span>
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
          <NewBadge :show="isNewAssignment(assignmentId)">
            <AssignmentCard
              :assignment="assignmentId"
              @play="play(assignmentId)"
            />
          </NewBadge>
        </v-col>
      </v-row>
    </div>
    <v-overlay v-if="id" :model-value="true"  persistent>
      <div class="assignment-overlay">
        <vueEmbedComponent
          :id="id"
          @close="$router.push('/')"
          allow="camera;microphone;fullscreen"
        />
      </div>
    </v-overlay>
  </div>
</template>

<script>
import CardIconsBar from '../../components/card-icons-bar.vue'
import DecryptedName from '../../components/decrypted-name.vue'
import NewBadge from '../../components/new-badge.vue'
import { vueEmbedComponent, vueScopeComponent, } from '@knowlearning/agents/vue.js'
import URL_CONTENT_DATA from '../../url-content-data.js'
import AssignmentCard from './assignment-card.vue'

const NEW_ASSIGNMENT_DAYS = 7

export default {
  components: { vueEmbedComponent, vueScopeComponent, CardIconsBar, AssignmentCard, DecryptedName, NewBadge },
  props: ['id'],
  data() {
    return {
      assignmentsToContent: {},
      assignmentsToAssignableItem: {},
      assignmentsToAssignerAndCreated: {},
      activeAssigner: null,
      oldestFirst: false
    }
  },
  computed: {
    assignments() {
      return Object.keys(this.assignmentsToContent)
    },
    noAssignments() {
      return this.assignmentIds.length === 0
    },
    URL_CONTENT_DATA() {
        return URL_CONTENT_DATA
    },
    assignmentIds() {
      const user = this.$store.state.user
      const type ="teacher-to-student"
      return this.$store.getters['assignments/to'](user, type)
    },
    allAssigners() {
      return Object.values(this.assignmentsToAssignerAndCreated)
        .map(aid => aid.owner)
        .reduce((acc, cur) => acc.includes(cur) ? acc : [ ...acc, cur ], [])
    },
    filteredAssignmentIds() {
      const compareCreated = (id1, id2) => {
        const ts1 = this.assignmentsToAssignerAndCreated[id1].created
        const ts2 = this.assignmentsToAssignerAndCreated[id2].created
        return ts1 > ts2 ? 1 : -1
      }

      const aidsFromActiveAssigner = this.assignmentIds.filter(aid => this.assignmentsToAssignerAndCreated[aid]?.owner === this.activeAssigner)
      const oldestFirst = aidsFromActiveAssigner.sort(compareCreated)
      return this.oldestFirst ? oldestFirst : oldestFirst.reverse()


    }

  },
  watch: {
    assignmentIds: {
      immediate: true,
      async handler(val) {
        val.forEach(async aid => {

          // happens every time, but i don't care
          const { owner, created } = await Agent.metadata(aid)
          this.assignmentsToAssignerAndCreated[aid] = { owner, created }
          if (!this.activeAssigner) this.activeAssigner = owner

          if (this.assignmentsToContent[aid]) return

          const unwatch1 = Agent.watch(
            [aid,'item_id'],
            res => {
              this.assignmentsToAssignableItem[aid] = res
              unwatch1()
            }
          )

          const unwatch2 = Agent.watch(
            [aid,'item_id', 'content'],
            res => {
              this.assignmentsToContent[aid] = res
              unwatch2()
            }
          )
        })
      }
    }
  },
  methods: {
    t(slug) { return this.$store.getters.t(slug) },
    timestamp(value) {
      const parsed = new Date(value).getTime()
      return Number.isNaN(parsed) ? 0 : parsed
    },
    isNewAssignment(assignmentId) {
      const created = this.assignmentsToAssignerAndCreated[assignmentId]?.created
      const cutoff = Date.now() - (NEW_ASSIGNMENT_DAYS * 24 * 60 * 60 * 1000)
      return this.timestamp(created) >= cutoff
    },
    play(aid) {
      Agent
        .state(aid)
        .then(({ item_id }) => {
          this.$router.push(`/assignment/${item_id}`)
        })
    },
    isCandliLink(id) {
      return id && id.startsWith('https://pila.cand.li/')
    },
    isBettyLink(id) {
      return id && id.startsWith('https://bettysbrain.knowlearning.systems/')
    },
  }
}
</script>

<style scoped>
.teacher-select {
  padding: 4px 0 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 80px;
}
.teacher-select > div > span {
  margin: 0 12px;
}
.student-assignments {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  padding: 16px;
}
.assignment-overlay {
  position: fixed;
  top: 0;
  left: 0;
  background: white;
  overflow: hidden;
  width: 100vw;
  height: calc(var(--vh, 1vh) * 100);
}

.card {
  display: flex;
  flex-direction: column;
  border: 2px solid #ccc;
  width: 33%;
  max-width: 256px;
  height: 33vw;
  max-height: 192px;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin: 10px;
  max-width: 300px;
  overflow: hidden;
  position: relative;
}
card.bottom {
  color: pink;
}
.preview-image
{
  position: relative;
  flex-grow: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-image > img
{
  position: absolute;
  max-width: 80%;
  max-height: 80%;
}
.content-name
{
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  color: #5d5d5d;
  font-size: 1.25em;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 8px;
}
</style>