<template>
  <TeacherAgreement v-if="!hasTeacherAgreement" />
  <v-app
    class="teacher-view"
    v-else-if="$store.getters['roles/hasPermission']($store.state.user, 'teacher')"
  >

    <v-toolbar
      color="primary"
    >
      <v-toolbar-title>
        PILA
      </v-toolbar-title>
      <v-spacer />
      <v-avatar
        class="ms-4 me-4"
        :image="avatarImage"
      />
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-icon
            v-bind="props"
            icon="fa-solid fa-gear"
          />
        </template>
        <v-list>
          <v-list-item
            @click="logout"
            append-icon="fa-solid fa-arrow-right-from-bracket"
            :title="t('log-out')"
          >
          </v-list-item>
        </v-list>
      </v-menu>
    </v-toolbar>
    <v-content>
      <TabMenu
        :tabs="[
          { name: t('my-classes'), background: '#2E9DF9', id:'classes', color: 'white' },
          { spacer: true, width: 1 },
          { name: t('assignments'), background: '#2E32DB', id:'assignments-from-me', color: 'white' },
          { name: t('item-library'), background: '#1B1B83', id:'content', color: 'white' },
          { spacer: true, width: 1 },
          { name: t('pila-studies'), background: '#6BEAC9', id:'assignments-to-me', color: 'black', icon: '/mascotte.png' }
        ]"
        :current="tab"
        @select="tab = $event"
      />

      <Groups
        v-if="tab === 'classes'"
        type="class"
        :possibleMembers="students"
      />
      <div v-if="tab === 'content'">
        <ContentLibrary />
      </div>
      <AssignmentsFromMe
        v-if="tab === 'assignments-from-me'"
        assignable_item_type="teacher-created"
        assignment_type="teacher-to-student"
      />
      <StudiesNotAvailable
        v-if="tab === 'assignments-to-me' && hideStudies"
      />
      <AssignmentsToMe
        v-else-if="tab === 'assignments-to-me'"
        type="researcher-to-teacher"
      />
    </v-content>
  </v-app>

  <RoleRequester v-else role="teacher" />
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useStore } from 'vuex'
  import TeacherAgreement from './teacher-agreement.vue'
  import RoleRequester from '../../components/roles/requester.vue'
  import Groups from '../../components/groups/viewer.vue'
  import TabMenu from '../../components/tab-menu.vue'
  import ContentLibrary from '../../components/content-library.vue'
  import AssignmentsToMe from '../../assignments/to-me/all.vue'
  import AssignmentsFromMe from '../../assignments/from-me/all.vue'
  import StudiesNotAvailable from '../../components/studies-not-available.vue'

  const hideStudies = true
  const tab = ref('classes')
  const avatarImage = ref(null)

  Agent.environment().then(({ auth:{info:{picture}}}) => avatarImage.value = picture)

  const store = useStore()

  const hasTeacherAgreement = computed(() => {
    return store.getters.hasAcceptedTeacherAgreement()
  })

  const students = computed(() => store.getters['groups/myStudents']())

  function t(slug) {
    return store.getters.t(slug)
  }

  function logout() {
    Agent.logout()
  }
</script>

<style scoped>
.teacher-view {
  display: flex;
  flex-direction: column;
  height: 100%;  
}
.tab-wrapper {
    font-weight: bold;
  }
</style>