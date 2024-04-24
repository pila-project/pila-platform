<template>
  <TeacherAgreement v-if="!hasTeacherAgreement" />
  <v-app
    class="teacher-view"
    v-else-if="$store.getters['roles/hasPermission']($store.state.user, 'teacher')"
  >

    <v-app-bar
      color="primary"
      :title="store.getters.isThailandDomain ? 'ประเทศไทย' : 'International'"
    >
      <template v-slot:prepend>
        <v-app-bar-nav-icon variant="text" @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
        <v-icon class="fa-solid fa-menue" />
        <img
          src="/logo-green.svg"
          height="32"
        />
      </template>
      <v-spacer />
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-icon
            v-bind="props"
            class="mr-4"
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
    </v-app-bar>
    <v-navigation-drawer
      v-model="drawer"
      peristent
      expand-on-hover
    >
      <v-list-item
        class="mt-3 mb-2"
        :title="userInfo.name"
        :subtitle="store.getters['roles/role']()"
        nav
      >
        <template v-slot:prepend>
          <v-avatar
            :image="userInfo.picture"
          />
        </template>
      </v-list-item>

      <v-divider></v-divider>

      <v-list density="compact" nav>
        <v-list-item
          prepend-icon="fa-solid fa-users-gear"
          :title="t('admin')"
          :active="tab === 'classes'"
          @click="tab = 'classes'"
        />
        <v-list-item
          prepend-icon="fa-solid fa-clipboard-check"
          :title="t('assign-and-manage')"
          :active="tab === 'assignments-from-me'"
          @click="tab = 'assignments-from-me'"
        />
        <v-list-item
          prepend-icon="fa-solid fa-folder"
          :title="t('explore-and-create')"
          :active="tab === 'content'"
          @click="tab = 'content'"
        />
        <v-list-item
          prepend-icon="fa-solid fa-flask"
          :title="t('join-studies')"
          :active="tab === 'assignments-to-me'"
          @click="tab = 'assignments-to-me'"
        />
      </v-list>
    </v-navigation-drawer>
    <v-main>
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
    </v-main>
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

  const store = useStore()
  const hideStudies = true
  const tab = ref('classes')
  const userInfo = ref({})
  const drawer = ref(true)

  Agent.environment().then(({ auth:{info}}) => userInfo.value = info)

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