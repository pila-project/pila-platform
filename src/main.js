import { createApp } from 'vue'
import { createStore } from 'vuex'
import router from './router.js'
import Agent from '@knowlearning/agents/browser.js'
import { vuePersistentStore } from '@knowlearning/agents/vue.js'
import storeDef from './store/index.js'
import App from './pages/App.vue'
import runTests from './tests/index.js'

import './main.css'

import 'vuetify/styles'
import '@fortawesome/fontawesome-free/css/all.css'
import { createVuetify } from 'vuetify'
import { aliases, fa } from 'vuetify/iconsets/fa'
//  TODO: trim down imports
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'


if (window.location.pathname === '/test') runTests()
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

  const store = Agent.embedded ? storeDef : await vuePersistentStore(storeDef)

  createApp(App)
    .use(createStore(store))
    .use(vuetify)
    .use(router)
    .mount('#app')
}