<template>
  <div class="student-assignments">
    <div v-if="noAssignments">
      {{ t('you-currently-have-no-assignments-ask-you-teacher-if-you-expect-an-assignment-here')}}
    </div>
    <div
      v-else
      v-for="id, aid in assignmentsToContent"
      :key="id"
      class="card"
    >
      <div
        class="content-name"
      >
        <vueScopeComponent :id="assignmentsToAssignableItem[aid]" :path="['name']" />
      </div>
      <div class="preview-image">
        <img v-if="isCandliLink(id)" src="/candli-logo.svg" />
        <img v-else-if="isBettyLink(id)" src="/betty.png" />
        <vueEmbedComponent
          v-else
          :id="id"
          mode="card-image"
        />
      </div>
      <div>
        <CardIconsBar
          :id="id"
          :key="`icon-bar-for-${id}`"
          showPlay
          @play="play(aid)"
        />
      </div>
    </div>
  </div>


<!-- Overlay Playing Assignment -->
  <div
    class="assignment-overlay"
    v-if="playing"
  >
    <vueEmbedComponent
      :id="playing"
      @close="playing = null"
    />
  </div>

</template>

<script>
import CardIconsBar from '../../components/card-icons-bar.vue'
import { vueEmbedComponent, vueScopeComponent, } from '@knowlearning/agents/vue.js'
import URL_CONTENT_DATA from '../../url-content-data.js'

export default {
  components: { vueEmbedComponent, vueScopeComponent, CardIconsBar },

  data() {
    return {
      playing: null,
      assignmentsToContent: {},
      assignmentsToAssignableItem: {}
    }
  },
  computed: {
    assignments() {
      return Object.keys(this.assignmentsToContent)
    },
    noAssignments() {
      return this.assignments.length === 0
    },
    URL_CONTENT_DATA() {
        return URL_CONTENT_DATA
    },
    assignmentIds() {
      const user = this.$store.state.user
      const type ="teacher-to-student"
      return this.$store.getters['assignments/to'](user, type)
    }
  },
  watch: {
    assignmentIds: {
      immediate: true,
      handler() {
        this.assignmentIds.forEach(aid => {
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
