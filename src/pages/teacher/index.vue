<template>
  <RefreshingIndicator />
  <TeacherAgreement v-if="!hasTeacherAgreement" />
  <div
    class="teacher-view"
    v-else-if="$store.getters['roles/hasPermission']($store.state.user, 'teacher')"
  >
    <div class="teacher-layout">
      <!-- Mobile header bar -->
      <header v-if="isMobile" class="mobile-header">
        <img src="/oecd-pila-logo.svg" alt="OECD PILA" class="mobile-header-logo" />
        <div class="mobile-header-actions">
          <button class="mobile-header-btn" aria-label="Search">
            <LucideIcon name="search" :size="18" />
          </button>
          <button class="mobile-header-btn" aria-label="Open menu" @click="mobileMenuOpen = true">
            <LucideIcon name="menu" :size="18" />
          </button>
        </div>
      </header>

      <!-- Mobile backdrop -->
      <div
        v-if="isMobile && mobileMenuOpen"
        class="sidebar-backdrop"
        @click="mobileMenuOpen = false"
      />

      <!-- Sidebar -->
      <nav class="sidebar" :class="{ 'sidebar-collapsed': !sidebarOpen && !isMobile, 'sidebar-mobile': isMobile, 'sidebar-mobile-open': isMobile && mobileMenuOpen }">
        <!-- Logo area -->
        <div class="logo-area">
          <img
            v-if="sidebarOpen"
            src="/oecd-pila-logo.svg"
            alt="OECD PILA"
            class="oecd-pila-logo"
          />
          <img
            v-else
            src="/pila-logo-p.svg"
            alt="PILA"
            class="pila-p-logo"
          />
        </div>

        <!-- Collapse/expand toggle -->
        <button v-if="!isMobile" class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen">
          <LucideIcon :name="sidebarOpen ? 'chevron-left' : 'chevron-right'" :size="14" />
        </button>

        <!-- Separator -->
        <div class="sidebar-separator" />

        <!-- Nav items -->
        <div class="nav-list">
          <router-link
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            v-show="item.show !== false"
            class="nav-item"
            :active-class="item.exact ? '' : 'nav-item-active'"
            exact-active-class="nav-item-active"
            :title="!sidebarOpen ? item.title : undefined"
            @click="mobileMenuOpen = false"
          >
            <LucideIcon :name="item.icon" :size="20" class="nav-icon" />
            <span v-if="sidebarOpen || isMobile">{{ item.title }}</span>
          </router-link>
        </div>

        <!-- User card with dropdown -->
        <div class="user-card-wrapper">
          <PMenu openUp>
            <template #activator="{ props }">
              <button
                class="user-card"
                :aria-label="encryptionAttentionAriaLabel"
                @click="props.onClick"
                @click.shift="alertUserName"
              >
                <PAvatar
                  :image="userInfo.picture"
                  :name="userInfo.name"
                  :size="32"
                />
                <div v-if="sidebarOpen" class="user-card-info">
                  <div class="user-card-name">{{ userInfo.name }}</div>
                  <div class="user-card-role">{{ t(store.getters['roles/role']()) }}</div>
                </div>
                <span v-if="sidebarOpen" class="user-card-trailing">
                  <span
                    v-if="needsEncryptionAttention"
                    class="user-card-attention-icon"
                    :title="encryptionAttentionTitle"
                    aria-hidden="true"
                  >
                    <LucideIcon name="circle-alert" :size="14" />
                  </span>
                  <LucideIcon name="chevron-up" :size="14" class="user-card-chevron" />
                </span>
              </button>
            </template>
            <PMenuItem
              :title="languageLabel(currentLanguage)"
              prepend-icon="lucide:globe"
            >
              <template #submenu>
                <PMenuItem
                  v-for="lang in languageChoices"
                  :key="lang"
                  :title="languageLabel(lang)"
                  :prepend-icon="lang === currentLanguage ? 'lucide:check' : ''"
                  @click="store.dispatch('language', lang)"
                />
              </template>
            </PMenuItem>
            <PMenuItem
              :title="t('support')"
              prepend-icon="lucide:help-circle"
              @click="$router.push('/teacher/support')"
            />
            <PMenuItem
              :title="t('enter-encryption-key-word')"
              prepend-icon="lucide:key-round"
              :attention="needsEncryptionAttention"
              :append-icon="needsEncryptionAttention ? 'lucide:circle-alert' : undefined"
              @click="showEncryptionKeyModal = true"
            />
            <PMenuItem
              :title="t('log-out')"
              prepend-icon="lucide:log-out"
              danger
              @click="logout"
            />
          </PMenu>
        </div>
      </nav>

      <EncryptionKeyModal
        v-if="showEncryptionKeyModal"
        @close="showEncryptionKeyModal = false"
      />

      <!-- Main content -->
      <main class="teacher-main">
        <router-view v-slot="{ Component }">
          <KeepAlive :max="4">
            <component :is="Component" :key="$route.path" />
          </KeepAlive>
        </router-view>
      </main>
    </div>

    <!-- Footer removed — not in Figma designs -->
  </div>

  <RoleRequester v-else role="teacher" />
</template>

<script setup>
  import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
  import { useRouter } from 'vue-router'
  import { useStore } from 'vuex'
  import TeacherAgreement from './teacher-agreement.vue'
  import RoleRequester from '@/components/roles/role-requester.vue'
  import { PAvatar, PMenu, PMenuItem } from '@/components/ui/index.js'
  import LucideIcon from '@/components/ui/LucideIcon.vue'
  import { TRAINER_TAG, SIMPLIFIED_STUDY_DOMAINS, DOMAIN_DATA_PROTECTION_LINKS } from '@/utils/constants.js'
  import languageChoices from '@/store/language-choices.js'
  import { logout as doLogout } from '@/utils/logout.js'
  import RefreshingIndicator from '@/components/ui/RefreshingIndicator.vue'
  import EncryptionKeyModal from '@/components/common/EncryptionKeyModal.vue'
  import { useEncryptionKey } from '@/utils/useEncryptionKey.js'

  const isSimplifiedStudyDomain = SIMPLIFIED_STUDY_DOMAINS.includes(window.location.host)
  const showEncryptionKeyModal = ref(false)
  const store = useStore()
  const router = useRouter()
  const {
    needsEncryptionAttention,
    isEncryptionKeyMissing,
    isEncryptionKeyInvalid,
  } = useEncryptionKey(store)

  const encryptionAttentionTitle = computed(() => {
    if (isEncryptionKeyInvalid.value) return t('encryption-key-invalid-badge')
    if (isEncryptionKeyMissing.value) return t('encryption-key-missing-badge')
    return undefined
  })
  const encryptionAttentionAriaLabel = computed(() => encryptionAttentionTitle.value)

  const userInfo = ref({})
  const userIsTrainer = ref(null)
  const sidebarOpen = ref(true)
  const isMobile = ref(window.innerWidth < 1024)
  const mobileMenuOpen = ref(false)

  function handleResize() {
    const mobile = window.innerWidth < 1024
    if (mobile !== isMobile.value) {
      isMobile.value = mobile
      if (mobile) {
        mobileMenuOpen.value = false
      }
    }
  }

  onMounted(() => window.addEventListener('resize', handleResize))
  onBeforeUnmount(() => window.removeEventListener('resize', handleResize))

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

  Agent.environment().then(({ auth:{info}}) => userInfo.value = info)

  const hasTeacherAgreement = computed(() => {
    return store.getters.hasAcceptedTeacherAgreement()
  })

  const teacherDataProtectionLink = DOMAIN_DATA_PROTECTION_LINKS[location.host]
          || DOMAIN_DATA_PROTECTION_LINKS.default

  const navItems = computed(() => [
    { icon: 'house', title: t('home'), to: '/teacher', show: true, exact: true },
    { icon: 'user', title: t('admin'), to: '/teacher/classes', show: true },
    { icon: 'file-text', title: t('assignments').toLowerCase(), to: '/teacher/assignments-from-me', show: true },
    { icon: 'list-checks', title: t('your-tasks'), to: '/teacher/tasks', show: isSimplifiedStudyDomain },
    { icon: 'search', title: t('explore'), to: '/teacher/content', show: true },
    { icon: 'folder-plus', title: t('create'), to: '/teacher/create', show: !isSimplifiedStudyDomain },
    { icon: 'file-text', title: t('resources'), to: '/teacher/resources', show: true },
    { icon: 'school', title: t('trainer'), to: '/teacher/trainer', show: userIsTrainer.value && !isSimplifiedStudyDomain },
    { icon: 'sliders-horizontal', title: t('settings'), to: '/teacher/support', show: true },
  ])

  const LANGUAGE_NAMES = { en: 'English', th: 'Thai', pl: 'Polish', fr: 'French', km: 'Khmer' }

  const currentLanguage = computed(() => store.getters.language())

  function languageLabel(code) {
    const name = LANGUAGE_NAMES[code] || code.toUpperCase()
    return `${name} (${code.toUpperCase()})`
  }

  function t(slug) { return store.getters.t(slug) }

  function alertUserName() { alert(store.state.user )}

  function logout() { doLogout(store.state.user) }

</script>

<style scoped>
.teacher-view {
  height: 100vh;
  overflow: hidden;
}

.teacher-layout {
  display: flex;
  height: 100%;
  background: var(--color-slate-100);
}

.teacher-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: var(--color-slate-100);
}

/* Explore: fixed viewport — panes scroll internally, not the main shell */
.teacher-main:has(.explore-page) {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.teacher-main:has(.explore-page) .explore-page {
  flex: 1 1 auto;
  min-height: 0;
}

.sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 240px;
  border: 1px solid var(--color-slate-200);
  box-shadow: 2px 0 8px rgba(0,0,0,0.04);
  background: white;
  overflow: visible;
  flex-shrink: 0;
  transition: width 200ms ease;
  border-radius: 12px;
  margin: 12px;
  height: calc(100vh - 24px);
}

.sidebar-collapsed {
  width: 64px;
}

.logo-area {
  padding: 16px;
  min-height: 72px;
  display: flex;
  align-items: center;
}

.sidebar-collapsed .logo-area {
  justify-content: center;
  padding: 16px 12px;
}

.oecd-pila-logo {
  height: 44px;
  width: auto;
}

.pila-p-logo {
  height: 28px;
  width: 28px;
}

.sidebar-separator {
  height: 1px;
  background: var(--color-slate-200);
  margin: 0 16px;
}

.sidebar-collapsed .sidebar-separator {
  margin: 0 8px;
}

.sidebar-toggle {
  position: absolute;
  right: -12px;
  top: 60px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  border: 1px solid var(--color-slate-200);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  transition: background-color 150ms;
  font-size: 0.625rem;
  color: var(--color-primary-600);
}
.sidebar-toggle:hover {
  background: var(--color-slate-50);
}

.nav-list {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-icon {
  width: 20px;
  text-align: center;
  flex-shrink: 0;
  font-size: 1rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  color: #334155;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  text-transform: capitalize;
  transition: background-color 150ms;
  white-space: nowrap;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  border-radius: 8px;
}
.nav-item:hover {
  background: var(--color-slate-50);
}
.nav-item-active {
  color: #2563EB;
  background: #EFF6FF;
}

.sidebar-collapsed .nav-list {
  padding: 8px;
}

.sidebar-collapsed .nav-item {
  justify-content: center;
  padding: 8px;
}

/* User card */
.user-card-wrapper {
  padding: 8px;
}

.user-card-wrapper :deep(.p-menu-anchor) {
  display: block;
  width: 100%;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px;
  background: #eff6ff;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 150ms;
}
.user-card:hover {
  background: #dbeafe;
}

.user-card-info {
  flex: 1;
  min-width: 0;
}

.user-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-card-role {
  font-size: 12px;
  font-weight: 400;
  color: #334155;
  text-transform: capitalize;
}

.user-card-trailing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: auto;
}

.user-card-attention-icon {
  display: inline-flex;
  color: var(--color-danger-600, #dc2626);
  flex-shrink: 0;
  line-height: 0;
}

.user-card-chevron {
  font-size: 14px;
  color: #64748b;
  flex-shrink: 0;
}

.sidebar-collapsed .user-card {
  justify-content: center;
}

/* Mobile header bar */
.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: white;
  border-bottom: 1px solid var(--color-slate-200);
}

.mobile-header-logo {
  height: 32px;
  width: auto;
}

.mobile-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mobile-header-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.125rem;
  color: #334155;
}
.mobile-header-btn:hover {
  background: var(--color-slate-50);
}

/* Mobile backdrop & sidebar */
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 45;
}

.sidebar-mobile {
  position: fixed;
  right: 0;
  top: 0;
  z-index: 50;
  height: 100vh;
  margin: 0;
  border-radius: 12px 0 0 12px;
  transform: translateX(100%);
  transition: transform 200ms ease;
  width: 260px;
}

.sidebar-mobile-open {
  transform: translateX(0);
}

@media (max-width: 1023px) {
  .teacher-main {
    padding-top: 56px;
  }
}
</style>
