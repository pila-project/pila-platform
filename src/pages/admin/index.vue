<template>
  <v-app
    v-if="iAmAnAdmin"
    class="teacher-view"
  >
    <Navbar />
    <v-navigation-drawer permanent>
      <v-list-item
        class="my-2"
        style="white-space: nowrap;"
        :title="userInfo.name"
        :subtitle="t(store.getters['roles/role']())"
        nav
      >

        <template v-slot:prepend>
          <v-avatar
            :image="userInfo.picture"
            @click.shift="alertUserName"
            class="mx-2"
          />
        </template>
      </v-list-item>

      <v-divider></v-divider>

      <v-list density="compact" nav>
        <v-list-item
          v-if="!isSimplifiedStudyDomain"
          prepend-icon="fa-solid fa-chalkboard-user"
          :title="t('trainers')"
          :active="tab === 'trainers'"
          @click="tab = 'trainers'"
        />
        <v-list-item
          prepend-icon="fa-solid fa-person-chalkboard"
          :title="t('teachers')"
          :active="tab === 'teachers'"
          @click="tab = 'teachers'"
        />
        <v-list-item
          prepend-icon="fa-solid fa-clipboard-check"
          :title="t('role-requests')"
          :active="tab === 'role-requests'"
          @click="tab = 'role-requests'"
        />
        <v-list-item
          prepend-icon="fa-solid fa-magnifying-glass-chart"
          :title="t('reports')"
          :active="tab === 'reports'"
          @click="tab = 'reports'"
        />
        <v-list-item
          v-if="!isSimplifiedStudyDomain"
          prepend-icon="fa-solid fa-flask"
          :title="t('studies')"
          :active="tab === 'studies'"
          @click="tab = 'studies'"
        />
      </v-list>

      <template v-slot:append>
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-icon
              v-bind="props"
              class="ma-4"
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
      </template>
    </v-navigation-drawer>
    <v-main>
      <RoleManager
        v-if="['admins', 'teachers', 'trainers', 'role-requests'].includes(tab)"
        :role="tab"
      />
      <AdminReports v-else-if="tab === 'reports'" />
      <StudiesNotAvailable v-else-if="tab === 'studies' && hideStudies" />
      <AdminStudyManager v-else-if="tab === 'studies' && !hideStudies" />
    </v-main>
  </v-app>
  <div v-else>
    {{ t('admin-role-required') }}
  </div>
</template>

<script setup>
  import { computed, ref } from 'vue'
  import { useStore } from 'vuex'
  import Navbar from '../Navbar.vue'
  import RoleManager from './roles.vue'
  import AdminReports from './admin-reports.vue'
  import AdminStudyManager from './studies.vue'
  import StudiesNotAvailable from '../../components/studies-not-available.vue'
  import {
    ADMIN_TAG,
    TEACHER_TAG,
    TRAINER_TAG,
    PILA_CONTENT_TAG,
    SIMPLIFIED_STUDY_DOMAINS
  } from '../../constants.js'

  const isSimplifiedStudyDomain = SIMPLIFIED_STUDY_DOMAINS.includes(window.location.host)

  const store = useStore()
  const { auth: { user, info: userInfo } } = await Agent.environment()
  function alertUserName() { alert(store.state.user )}

  const hideStudies = true
  const tab = ref('teachers')

  const iAmAnAdmin = await isAdmin(user)

  async function isAdmin(user) {
    const adminTagging = await Agent.query(
      'tagging-for-target',
      [store.getters.tagPartition, ADMIN_TAG, user],
      'tags.knowlearning.systems'
    )
    return !!adminTagging.length
  }

  function t(slug) {
    return store.getters.t(slug)
  }

  function logout() {
    Agent.logout()
  }
</script>
