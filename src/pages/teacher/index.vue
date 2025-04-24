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
          :title="t('assign-and-monitor')"
          :active="tab === 'assignments-from-me'"
          @click="tab = 'assignments-from-me'"
        />
        <v-list-item
          prepend-icon="fa-solid fa-magnifying-glass-plus"
          :title="t('explore')"
          :active="tab === 'content'"
          @click="tab = 'content'"
        />
        <v-list-item
          prepend-icon="fa-solid fa-folder-plus"
          :title="t('create')"
          :active="tab === 'create'"
          @click="tab = 'create'"
        />
        <v-list-item
          prepend-icon="fa-solid fa-file-alt"
          :title="t('resources')"
          :active="tab === 'resources'"
          @click="tab = 'resources'"
        />
        <v-list-item
          v-if="userIsTrainer"
          prepend-icon="fa-solid fa-chalkboard-user"
          :title="t('trainer')"
          :active="tab === 'trainer'"
          @click="tab = 'trainer'"
        />
        <v-list-item
          prepend-icon="fa-solid fa-flask"
          :title="t('join-studies')"
          :active="tab === 'assignments-to-me'"
          @click="tab = 'assignments-to-me'"
        />
      </v-list>

      <template v-slot:append>
        <v-list>
          <v-list-item
            @click="tab = 'support'"
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
      <UserInfoModal
        v-if="userModalUser"
        :id="userModalUser"
        @close="userModalUser = null"
      />
      <Groups
        v-if="tab === 'classes'"
        type="class"
        :possibleMembers="students"
        @createUser="createUserAndLaunchModal"
      />
      <div v-if="tab === 'content'">
        <ContentLibrary />
      </div>
      <AssignmentsFromMe
        v-if="tab === 'assignments-from-me'"
        assignable_item_type="teacher-created"
        assignment_type="teacher-to-student"
      />
      <TrainerPage
        v-if="tab === 'trainer'"
      />
      <ResourcesPage
        v-if="tab === 'resources'"
      />
      <StudiesNotAvailable
        v-if="tab === 'assignments-to-me' && hideStudies"
      />
      <AssignmentsToMe
        v-else-if="tab === 'assignments-to-me'"
        type="researcher-to-teacher"
      />
      <v-container v-if="tab === 'support'">
        <div style="width: 400px; margin: auto; text-align: center; margin-top: 32px;">
          <p>{{ t('for-support-please-email-edu-pila-oecd-org') }}</p>
        </div>
      </v-container>
      <TeacherCreateTab v-else-if="tab === 'create'" />
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
  import { useStore } from 'vuex'
  import Navbar from '../Navbar.vue'
  import TeacherAgreement from './teacher-agreement.vue'
  import RoleRequester from '../../components/roles/requester.vue'
  import Groups from '../../components/groups/viewer.vue'
  import TabMenu from '../../components/tab-menu.vue'
  import ContentLibrary from '../../components/content-library.vue'
  import AssignmentsToMe from '../../assignments/to-me/all.vue'
  import AssignmentsFromMe from '../../assignments/from-me/all.vue'
  import StudiesNotAvailable from '../../components/studies-not-available.vue'
  import TeacherCreateTab from './teacher-create-tab.vue'
  import TrainerPage from './trainer-page.vue'
  import ResourcesPage from './resources-page.vue'
  import { TRAINER_TAG } from '../../constants.js'
  import UserInfoModal from '../../components/user-info-modal.vue'
  import createUser from '../../create-user.js'

  const store = useStore()
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

  const userModalUser = ref(null)
  const users = reactive(await Agent.state('users'))
  const myPILAUsers = computed(() => Object.keys(users))

  const hasTeacherAgreement = computed(() => {
    return store.getters.hasAcceptedTeacherAgreement()
  })

  const students = computed(() => [
    ...myPILAUsers.value,
    ...store.getters['groups/myStudents']()
  ])

  function t(slug) {
    return store.getters.t(slug)
  }

  function logout() {
    Agent.logout()
  }

  function openLink(link) {
    window.open(link, '_blank')
  }

  async function createUserAndLaunchModal() {
    const id = await createUser()
    users[id] = {}
    userModalUser.value = id
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