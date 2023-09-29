<template>
  <h1>Join Teacher</h1>
  <div v-if="joining">
    Joining teacher... please hold...
  </div>
  <div v-else-if="leaving">
    Leaving teacher... please hold...
  </div>
  <div v-else-if="isMyTeacher">
    You have joined this teacher!
    <button @click="leave">Leave</button>
  </div>
  <div v-else>
    <button @click="join">Join</button>
  </div>
</template>

<script>
  export default {
    data() {
      return {
        joining: false,
        leaving: false
      }
    },
    computed: {
      teacherId() {
        return this.$route.params.teacher
      },
      teacherGroupId() {
        return this.$store.getters['groups/specialGroupId']('my-teachers')
      },
      isMyTeacher() {
        return this.$store.getters['groups/belongs'](this.teacherId, this.teacherGroupId)
      }
    },
    methods: {
      async join() {
        this.joining = true
        await this.$store.dispatch(
          'groups/addMember',
          {
            user_id: this.teacherId,
            group_id: this.teacherGroupId
          }
        )
        this.joining = false
      },
      async leave() {
        this.leaving = true
        await this.$store.dispatch(
          'groups/removeMember',
          {
            user_id: this.teacherId,
            group_id: this.teacherGroupId
          }
        )
        this.leaving = false
      }
    }
  }
</script>