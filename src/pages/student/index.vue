<template>
  <div class="tab-wrapper">
    <TabMenu
      :tabs="[
        {
          name: t('assignments'),
          background: '#2E9DF9',
          id:'class-assignments',
          color: 'white'
        },
        { spacer: true, width: 1 },
        {
          name: t('studies'),
          background: '#6BEAC9',
          id:'study-assignments',
          color: 'black',
          icon: '/mascotte.png'
        }
      ]"
      :current="tab"
      @select="tab = $event"
    />
  </div>

  <div>
    <StudiesNotAvailable
      v-if="tab === 'study-assignments' && hideStudies"
      @showStudies="hideStudies = false"
    />
    <AssignmentsToMe v-else
      :key="tab"
      :type="assignmentType"
    />
    <!-- TODO Remove Button -->
    <button v-if="!hideStudies" @click="hideStudies = true">Temp for Dev Only -- Re-Hide Studies Page</button>
  </div>
</template>

<script>
  import AssignmentsToMe from '../../assignments/to-me/all.vue'
  import TabMenu from '../../components/tab-menu.vue'
  import StudiesNotAvailable from '../../components/studies-not-available.vue'
  export default {
    components: {
      AssignmentsToMe,
      TabMenu,
      StudiesNotAvailable
    },
    data() {
      return {
        tab: 'class-assignments',
        hideStudies: true, // TODO Remove After Demo
      }
    },
    computed: {
      assignmentType() {
        return {
          'class-assignments': 'teacher-to-student',
          'study-assignments': 'teacher-to-student-research'
        }[this.tab]
      }
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) }
    }
  }
</script>