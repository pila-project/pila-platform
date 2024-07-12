<template>
  <div class="student-assignments">
    <div v-if="noAssignments" style="width: 100%;">
      {{ t('it-looks-like-you-do-not-have-any-assignments-please-speak-to-your-teacher')}}
    </div>
    <div v-else style="width: 100%;">
      <div class="teacher-select" style="min-height:80px;">
        <span><strong>{{ t('your-teachers') }}:</strong></span>
        <DecryptedName
          v-for="assigner in allAssigners"
          :key="assigner"
          :user="assigner"
          avatar
          :size="activeAssigner === assigner ? 'large' : 'small'"
          :showName="false"
          @click="activeAssigner = assigner"
        />
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
    <v-overlay :model-value="overlayActive">
      <div class="assignment-overlay">
        <vueEmbedComponent
          :id="playing"
          @close="playing = null"
          allow="camera;microphone;fullscreen"
        />
      </div>
    </v-overlay>
  </div>
</template>

<script>
import CardIconsBar from '../../components/card-icons-bar.vue'
import DecryptedName from '../../components/decrypted-name.vue'
import { vueEmbedComponent, vueScopeComponent, } from '@knowlearning/agents/vue.js'
import URL_CONTENT_DATA from '../../url-content-data.js'
import AssignmentCard from './assignment-card.vue'

export default {
  components: { vueEmbedComponent, vueScopeComponent, CardIconsBar, AssignmentCard, DecryptedName },

  data() {
    return {
      playing: null,
      assignmentsToContent: {},
      assignmentsToAssignableItem: {},
      assignmentsToAssigner: {},
      activeAssigner: null
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
    overlayActive: {
      get() {
        return !!this.playing
      }
    },
    allAssigners() {
      return Object.values(this.assignmentsToAssigner)
        .reduce((acc, cur) => acc.includes(cur) ? acc : [ ...acc, cur ], [])
    },
    filteredAssignmentIds() {
      return this.assignmentIds.filter(aid =>  this.assignmentsToAssigner[aid] === this.activeAssigner)
    }

  },
  watch: {
    assignmentIds: {
      immediate: true,
      async handler(val) {
        val.forEach(async aid => {

          // happens every time, but i don't care
          const { owner } = await Agent.metadata(aid)
          this.assignmentsToAssigner[aid] = owner
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
    async play(aid) {
      const assignment = await Agent.state(aid)
      this.playing = assignment.item_id
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
  padding: 4px 0 12px 0;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}
.teacher-select > span {
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
  height: 100vh;
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
