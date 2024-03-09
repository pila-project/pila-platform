import { createApp } from 'vue'
import { createStore } from 'vuex'
import router from './router.js'
import Agent from '@knowlearning/agents/browser.js'
import { vuePersistentStore } from '@knowlearning/agents/vue.js'
import storeDef from './store/index.js'
import App from './pages/App.vue'
import runTests from './tests/index.js'

import './main.css'

if (window.location.pathname === '/test') runTests()
else initializeApp()

async function initializeApp() {
  window.Agent = Agent
  const store = Agent.embedded ? storeDef : await vuePersistentStore(storeDef)
  const app = createApp(App)
  app.use(createStore(store))
  app.use(router)
  app.mount('#app')
}