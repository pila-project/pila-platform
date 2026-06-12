import { createApp } from 'vue'
import { createStore } from 'vuex'
import { validate as isUUID } from 'uuid'
import router from '@/router.js'
import Agent from '@knowlearning/agents/browser.js'
import { vuePersistentStore } from '@knowlearning/agents/vue.js'
import storeDef from '@/store/index.js'
import App from '@/pages/App.vue'
import runTests from '@/tests/index.js'

import 'mathlive' // for math input support for RCT content

import './main.css'

import '@fortawesome/fontawesome-free/css/all.css'

mathVirtualKeyboard.targetOrigin = '*' // for math input support for RCT content


if (window.location.pathname === '/test') runTests()
else initializeApp()

async function initializeApp() {
  const isDev = import.meta.env.DEV && !import.meta.env.VITE_REAL_AUTH

  if (isDev) {
    const { default: DevAgent } = await import('@/utils/dev-agent.js')
    window.Agent = DevAgent
  } else {
    window.Agent = Agent
  }

  if (isDev) {
    storeDef.plugins = [
      store => window.store = store,
      async store => {
        store.commit('load', { user: Agent._mockUser, provider: 'dev' })
        store.commit('roles/addAssignment', {
          assignee: Agent._mockUser, role: 'admin', assigner: Agent._mockUser
        })
        store.commit('acceptTeacherAgreement')
        store.commit('acceptStudentAgreement')
        store.commit('language', 'en')
        store.state.codeEntered = true
        await store.dispatch('fetchTranslations')
        store.dispatch('loaded', true)
      }
    ]
  }

  let resolvedStoreDef = storeDef
  if (!isDev && !Agent.embedded) {
    try {
      resolvedStoreDef = await Promise.race([
        vuePersistentStore(storeDef),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
      ])
    } catch (e) {
      console.warn('[main] vuePersistentStore failed or timed out, using plain store:', e.message)
    }
  }
  const store = createStore(resolvedStoreDef)

  createApp(App)
    .use(store)
    .use(router)
    .mount('#app')

  if (!isDev && !Agent.embedded) {
    // if is teacher created student, make sure to join teacher
    Agent.environment().then(async ({ auth: { provider } }) => {
      if (isUUID(provider)) {
        const { id: group_id } = await Agent.metadata('my-teachers')
        store.dispatch(
          'groups/addMember',
          {
            user_id: provider,
            group_id
          }
        )
      }
      if (provider === 'anonymous' && location.pathname === '/') {
        Agent.login('login.pilaproject.org')
      }
    })
  }
}

// Use --vh variable for older browsers to support dvh like behavior
function setDynamicVH() {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}

setDynamicVH()

window.addEventListener('resize', setDynamicVH)
window.addEventListener('orientationchange', setDynamicVH)
