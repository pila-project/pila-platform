<template>
  <h1>Join Teacher</h1>
  <div v-if="isMyTeacher">
    You have already joined this teacher. {{  teacherGroupId }} {{ teacherId }}
    <button @click="leave">Leave</button>
  </div>
  <div v-else>
    <button @click="join">Join</button>
  </div>
</template>

<script>
  export default {
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
      join() {
        this
          .$store
          .dispatch(
            'groups/addMember',
            {
              user_id: this.teacherId,
              group_id: this.teacherGroupId
            }
          )
      },
      leave() {
        this
          .$store
          .dispatch(
            'groups/removeMember',
            {
              user_id: this.teacherId,
              group_id: this.teacherGroupId
            }
          )
      }
    }
  }
</script>