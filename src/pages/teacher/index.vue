<template>
  <TeacherAgreement v-if="!hasTeacherAgreement" />
  <v-app
    class="teacher-view"
    v-else-if="$store.getters['roles/hasPermission']($store.state.user, 'teacher')"
  >
    <Navbar />
    <v-navigation-drawer
      v-model:rail="showRail"
      permanent
      rail
      expand-on-hover
    >
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
            class="mx-2"
            @click.shift="alertUserName"
          />
        </template>
      </v-list-item>

      <v-divider></v-divider>

      <v-list density="compact" nav>
        <v-list-item
          prepend-icon="fa-solid fa-users-gear"
          :title="t('admin')"
          to="classes"
          exact
        />
        <v-list-item
          prepend-icon="fa-solid fa-clipboard-check"
          :title="t('assign-and-monitor')"
          to="assignments-from-me"
          exact
        />
        <v-list-item
          prepend-icon="fa-solid fa-magnifying-glass-plus"
          :title="t('explore')"
          to="content"
          exact
        />
        <v-list-item
          v-if="!isSimplifiedStudyDomain"
          prepend-icon="fa-solid fa-folder-plus"
          :title="t('create')"
          to="create"
        />
        <v-list-item
          prepend-icon="fa-solid fa-file-alt"
          :title="t('resources')"
          to="resources"
        />
        <v-list-item
          v-if="userIsTrainer"
          prepend-icon="fa-solid fa-chalkboard-user"
          :title="t('trainer')"
          to="trainer"
        />
      </v-list>

      <template v-slot:append>
        <v-list>
          <v-list-item
            to="support"
            exact
          >
            <v-avatar
              image="/support-icon.svg"
              rounded="0"
            />
          </v-list-item>
        </v-list>
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-icon
              v-bind="props"
              class="ma-4"
              icon="fa-solid fa-gear"
            />
          </template>
          <v-list>
<!--             <v-list-item
              v-if="isSimplifiedStudyDomain"
              @click="router.push(`/teacher/opt-out`)"
              append-icon="fa-solid fa-person-walking-arrow-right"
              :title="t('opt-out')"
            /> -->
            <v-list-item
              @click="logout"
              append-icon="fa-solid fa-arrow-right-from-bracket"
              :title="t('log-out')"
            />
          </v-list>
        </v-menu>
      </template>
    </v-navigation-drawer>
    
    <v-main>
      <router-view />
    </v-main>

    <v-footer
      style="flex-grow: 0; background: #CCCCCC"
    >
      <v-row justify="center" no-gutters>
        <v-btn
          @click="openLink('https://oecd.org')"
          variant="text"
          :text="`${t('visit')} (OECD.org)`"
        />
        <v-btn
          variant="text"
          text="© OECD"
        />
        <v-btn
          @click="openLink('https://pilaproject.org/about-pila/terms-and-conditions-for-teachers')"
          variant="text"
          :text="t('terms-and-conditions')"
        />
        <v-btn
          @click="openLink('https://pilaproject.org/about-pila/data-protection-notice-for-teachers')"
          variant="text"
          :text="t('data-protection')"
        />
        <v-btn
          @click="openLink('https://pilaproject.org/contact-us')"
          variant="text"
          :text="t('contact-us')"
        />
      </v-row>
    </v-footer>
  </v-app>

  <RoleRequester v-else role="teacher" />
</template>

<script setup>
  import { ref, reactive, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { useStore } from 'vuex'
  import Navbar from '../Navbar.vue'
  import TeacherAgreement from './teacher-agreement.vue'
  import RoleRequester from '../../components/roles/requester.vue'
  import { TRAINER_TAG, SIMPLIFIED_STUDY_DOMAINS } from '../../constants.js'

  const isSimplifiedStudyDomain = SIMPLIFIED_STUDY_DOMAINS.includes(window.location.host)
  const store = useStore()
  const router = useRouter()
  const hideStudies = true
  const tab = ref('classes')
  const userInfo = ref({})
  const userIsTrainer= ref(null)

  Agent
    .query(
      'tagging-for-target',
      [
        store.getters.tagPartition,
        TRAINER_TAG,
        store.state.user
      ],
      'tags.knowlearning.systems'
    )
    .then(result => {
      userIsTrainer.value = !!result.length
    })

  const showRail = ref(true)

  Agent.environment().then(({ auth:{info}}) => userInfo.value = info)

  const hasTeacherAgreement = computed(() => {
    return store.getters.hasAcceptedTeacherAgreement()
  })

  function t(slug) { return store.getters.t(slug) }

  function alertUserName() { alert(store.state.user )}

  function logout() { Agent.logout() }

  function openLink(link) { window.open(link, '_blank') }

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

/*
  This is to prevent name and role wrapping and overflowing
  making there appear to be too much padding around the avatar
  in the nav bar.
*/
.v-list-item__content
{
  white-space: nowrap !important;
}

</style>