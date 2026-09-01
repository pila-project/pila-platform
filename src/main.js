import { createApp } from 'vue'
import { createStore } from 'vuex'
import { validate as isUUID } from 'uuid'
import router from './router.js'
import Agent from '@knowlearning/agents/browser.js'
import { vuePersistentStore } from '@knowlearning/agents/vue.js'
import storeDef from './store/index.js'
import App from './pages/App.vue'
import runTests from './tests/index.js'

import 'mathlive' // for math input support for RCT content

import './main.css'

import 'vuetify/styles'
import '@fortawesome/fontawesome-free/css/all.css'
import { createVuetify } from 'vuetify'
import { aliases, fa } from 'vuetify/iconsets/fa'
//  TODO: trim down imports
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

mathVirtualKeyboard.targetOrigin = '*' // for math input support for RCT content


if (window.location.pathname === '/test') runTests()
else if (window.location.pathname === '/login/pila') {
  history.replaceState(null, '', '/')
  Agent.login('login.pilaproject.org')
}
else initializeApp()

async function initializeApp() {
  window.Agent = Agent

  const vuetify = createVuetify({
    components,
    directives,
    icons: {
      defaultSet: 'fa',
      aliases,
      sets: { fa }
    }
  })

  const store = createStore(
    Agent.embedded ? storeDef : await vuePersistentStore(storeDef)
  )

  createApp(App)
    .use(store)
    .use(vuetify)
    .use(router)
    .mount('#app')

  if (!Agent.embedded) {
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
