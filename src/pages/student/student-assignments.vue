<template>
  <div class="student-assignments">
    <div v-if="noAssignments" style="width: 100%;">
      {{ t('it-looks-like-you-do-not-have-any-assignments-pl')}}
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
          <i
            :class="`fa-solid fa-arrow-${oldestFirst ? 'down' : 'up'} text-xs text-slate-400`"
          />
          <i class="fa-solid fa-calendar ml-2 text-slate-400" />
        </div>

      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          v-for="assignmentId in filteredAssignmentIds"
          :key="assignmentId"
        >
          <AssignmentCard
            :assignment="assignmentId"
            @play="play(assignmentId)"
          />
        </div>
      </div>
    </div>
    <div v-if="id" class="assignment-overlay">
      <vueEmbedComponent
        :id="id"
        @close="$router.push('/')"
        allow="camera;microphone;fullscreen"
      />
    </div>
  </div>
</template>

<script>
import CardIconsBar from '@/components/content/card-icons-bar.vue'
import DecryptedName from '@/components/common/decrypted-name.vue'
import { vueEmbedComponent, vueScopeComponent, } from '@knowlearning/agents/vue.js'
import URL_CONTENT_DATA from '@/utils/url-content-data.js'
import AssignmentCard from './assignment-card.vue'

export default {
  components: { vueEmbedComponent, vueScopeComponent, CardIconsBar, AssignmentCard, DecryptedName },
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
  z-index: 50;
}
</style>
