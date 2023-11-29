<template>
  <StudentAgreement v-if="!hasStudentAgreement" />

  <div v-else class="join-teacher">
    <h2 style="color: rgb(46, 50, 219); margin-bottom: 8px;">{{ t('join-teacher')}}</h2>
    <div v-if="joining">{{ t('joining-teacher') }}</div>
    <div v-else-if="leaving">{{ t('leaving-teacher') }}</div>
    <div class="is-teacher" v-else-if="isMyTeacher">
      <p>{{ t('you-have-joined-this-teacher')}}</p>
      <IconButton
        @click="leave"
        :text="t('leave')"
        icon="unlink"
        background="#FFC442"
      />
      <IconButton
        @click="goToAssignments"
        :text="t('go-to-assignments')"
        icon="arrow-right"
        background="#FFC442"
      />
    </div>
    <IconButton v-else
      @click="join"
      :text="t('join')"
      icon="link"
      background="#FFC442"
    />
</div>
</template>

<script>
  import StudentAgreement from './student-agreement.vue'
  import IconButton from '../../components/icon-button.vue'
  export default {
    name: 'join-teacher',
    components: {
      StudentAgreement,
      IconButton
    },
    data() {
      return {
        joining: false,
        leaving: false
      }
    },
    computed: {
      hasStudentAgreement() {
        return this.$store.getters.hasAcceptedStudentAgreement()
      },
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
      t(slug) { return this.$store.getters.t(slug) },
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
      },
      goToAssignments() {
        this.$router.push('/')
      }
    }
  }
</script>

<style scoped>
  .join-teacher {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .is-teacher {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .is-teacher p {
    margin: 12px;
  }
</style>