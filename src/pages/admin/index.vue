<template>
  <RefreshingIndicator />
  <div
    v-if="iAmAnAdmin"
    class="admin-view"
  >
    <Navbar />
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <nav class="flex flex-col w-64 border-r border-slate-200 bg-white flex-shrink-0">
        <!-- User info -->
        <div class="flex items-center gap-3 px-4 py-3 border-b border-slate-200" style="white-space: nowrap;">
          <PAvatar
            :image="userInfo.picture"
            :name="userInfo.name"
            :size="32"
            @click.shift="alertUserName"
          />
          <div class="min-w-0">
            <div class="text-sm font-medium text-zinc-950 truncate">{{ userInfo.name }}</div>
            <div class="text-xs text-slate-500 truncate">{{ t(store.getters['roles/role']()) }}</div>
          </div>
        </div>

        <PDivider />

        <!-- Nav items -->
        <div class="flex-1 py-2">
          <button
            v-for="item in navItems"
            :key="item.key"
            v-show="item.show !== false"
            class="nav-item w-full"
            :class="{ 'nav-item-active': tab === item.key }"
            @click="tab = item.key"
          >
            <LucideIcon :name="item.icon" :size="16" class="w-5 text-center" />
            <span>{{ item.title }}</span>
          </button>
        </div>

        <!-- Settings -->
        <div class="border-t border-slate-200 py-2">
          <PMenu>
            <template #activator="{ props }">
              <button class="nav-item w-full" @click="props.onClick">
                <LucideIcon name="settings" :size="16" class="w-5 text-center" />
                <span>{{ t('settings') || 'Settings' }}</span>
              </button>
            </template>
            <PMenuItem
              :title="t('log-out')"
              append-icon="lucide:log-out"
              @click="logout"
            />
          </PMenu>
        </div>
      </nav>

      <!-- Main content -->
      <main class="flex-1 overflow-auto">
        <RoleManager
          v-if="['admins', 'teachers', 'trainers', 'role-requests'].includes(tab)"
          :role="tab"
        />
        <AdminReports v-else-if="tab === 'reports'" />
        <StudiesNotAvailable v-else-if="tab === 'studies' && hideStudies" />
        <AdminStudyManager v-else-if="tab === 'studies' && !hideStudies" />
      </main>
    </div>
  </div>
  <div v-else>
    {{ t('admin-role-required') }}
  </div>
</template>

<script setup>
  import { computed, ref } from 'vue'
  import { useStore } from 'vuex'
  import Navbar from '@/pages/navbar.vue'
  import RoleManager from './roles.vue'
  import AdminReports from './admin-reports.vue'
  import AdminStudyManager from './studies.vue'
  import StudiesNotAvailable from '@/components/common/studies-not-available.vue'
  import { PAvatar, PMenu, PMenuItem, PDivider } from '@/components/ui/index.js'
  import LucideIcon from '@/components/ui/LucideIcon.vue'
  import {
    ADMIN_TAG,
    TEACHER_TAG,
    TRAINER_TAG,
    PILA_CONTENT_TAG,
    SIMPLIFIED_STUDY_DOMAINS
  } from '@/utils/constants.js'
  import { logout as doLogout } from '@/utils/logout.js'
  import RefreshingIndicator from '@/components/ui/RefreshingIndicator.vue'

  const isSimplifiedStudyDomain = SIMPLIFIED_STUDY_DOMAINS.includes(window.location.host)

  const store = useStore()
  const { auth: { user, info: userInfo } } = await Agent.environment()
  function alertUserName() { alert(store.state.user )}

  const hideStudies = true
  const tab = ref('teachers')

  const iAmAnAdmin = await isAdmin(user)

  const navItems = computed(() => [
    { icon: 'presentation', title: t('trainers'), key: 'trainers', show: !isSimplifiedStudyDomain },
    { icon: 'presentation', title: t('teachers'), key: 'teachers', show: true },
    { icon: 'clipboard-list', title: t('role-requests'), key: 'role-requests', show: true },
    { icon: 'search', title: t('reports'), key: 'reports', show: true },
    { icon: 'flask-conical', title: t('studies'), key: 'studies', show: !isSimplifiedStudyDomain },
  ])

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
    doLogout(store.state.user)
  }
</script>

<style scoped>
.admin-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1.25rem;
  color: var(--color-slate-700);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 150ms;
  white-space: nowrap;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
}
.nav-item:hover {
  background: var(--color-slate-50);
}
.nav-item-active {
  color: var(--color-primary-600);
  background: var(--color-primary-50);
}
</style>
