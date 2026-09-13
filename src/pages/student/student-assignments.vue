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
          <LucideIcon
            :name="oldestFirst ? 'arrow-down' : 'arrow-up'"
            :size="12"
            class="text-slate-400"
          />
          <LucideIcon name="calendar" :size="12" class="ml-2 text-slate-400" />
        </div>

      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          v-for="assignmentId in filteredAssignmentIds"
          :key="assignmentId"
        >
          <NewBadge :show="isNewAssignment(assignmentId)">
            <AssignmentCard
              :assignment="assignmentId"
              @play="play(assignmentId)"
            />
          </NewBadge>
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
import NewBadge from '@/components/new-badge.vue'
import { vueEmbedComponent, vueScopeComponent, } from '@knowlearning/agents/vue.js'
import URL_CONTENT_DATA from '@/utils/url-content-data.js'
import AssignmentCard from './assignment-card.vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'

const NEW_ASSIGNMENT_DAYS = 5

export default {
  components: { vueEmbedComponent, vueScopeComponent, CardIconsBar, AssignmentCard, DecryptedName, LucideIcon, NewBadge },
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
        .filter(Boolean)
        .reduce((acc, cur) => acc.includes(cur) ? acc : [ ...acc, cur ], [])
    },
    filteredAssignmentIds() {
      const compareCreated = (id1, id2) => {
        const ts1 = this.timestamp(this.assignmentsToAssignerAndCreated[id1]?.created)
        const ts2 = this.timestamp(this.assignmentsToAssignerAndCreated[id2]?.created)
        return ts1 - ts2
      }

      // Show all until an assigner is known; never hide ids still missing owner metadata.
      const visibleIds = this.activeAssigner
        ? this.assignmentIds.filter(aid => {
            const meta = this.assignmentsToAssignerAndCreated[aid]
            if (!meta || !meta.owner) return true
            return meta.owner === this.activeAssigner
          })
        : this.assignmentIds

      const sorted = [...visibleIds].sort(compareCreated)
      return this.oldestFirst ? sorted : sorted.reverse()
    }

  },
  watch: {
    assignmentIds: {
      immediate: true,
      async handler(val) {
        const ids = Array.isArray(val) ? val : []
        ids.forEach(async aid => {
          try {
            const metadata = await Agent.metadata(aid)
            const stored = this.$store.getters['assignments/get'](aid) || {}
            const owner = metadata?.owner || stored.assigner_id || null
            const created = metadata?.created || null
            this.assignmentsToAssignerAndCreated[aid] = { owner, created }
            if (!this.activeAssigner && owner) this.activeAssigner = owner
          } catch (error) {
            console.warn(`Unable to load assignment metadata for ${aid}.`, error)
            const stored = this.$store.getters['assignments/get'](aid) || {}
            this.assignmentsToAssignerAndCreated[aid] = {
              owner: stored.assigner_id || null,
              created: null,
            }
            if (!this.activeAssigner && stored.assigner_id) {
              this.activeAssigner = stored.assigner_id
            }
          }

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
  z-index: 50;
}
</style>