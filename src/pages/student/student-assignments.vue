<template>
  <div class="student-assignments">
    <div
      v-for="id, aid in assignmentsToContent"
      :key="id"
      class="card"
    >
      <div
        v-if="URL_CONTENT_DATA[id]"
        class="content-name"
      >
        {{ URL_CONTENT_DATA[id].name }}
      </div>
      <div class="preview-image">
        <img v-if="isCandliLink(id)" src="/candli-logo.svg" />
        <img v-else-if="isBettyLink(id)" src="/betty.png" />
        <vueEmbedComponent
          v-else
          :id="id"
          mode="card"
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
import { vueEmbedComponent } from '@knowlearning/agents/vue.js'
import URL_CONTENT_DATA from '../../url-content-data.js'

export default {
  components: { vueEmbedComponent, CardIconsBar },

  data() {
    return {
      playing: null,
      assignmentsToContent: {}
    }
  },
  computed: {
    assignments() {
      return Object.keys(this.assignmentsToContent)
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

          const unwatch = Agent.watch(
            [aid,'item_id', 'content'],
            res => {
              this.assignmentsToContent[aid] = res
              unwatch()
            }
          )
        })
      }
    }
  },
  methods: {
    async play(aid) {
      const assignment = await Agent.state(aid)
      this.playing = assignment.item_id
    },
    isCandliLink(id) {
      return id.startsWith('https://pila.cand.li/')
    },
    isBettyLink(id) {
      return id.startsWith('https://bettysbrain.knowlearning.systems/')
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
  display: block;
  color: #5d5d5d;
  font-size: 1.25em;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 8px;
}
</style>
