import { createApp } from 'vue'
import { createStore } from 'vuex'
import router from './router.js'
import { browserAgent } from '@knowlearning/agents'
import { vuePersistentStore } from '@knowlearning/agents/vue.js'
import storeDef from './store/index.js'
import App from './pages/App.vue'

import 'splitpanes/dist/splitpanes.css'
import './main.css'

window.Agent = browserAgent()

async function initialize() {
  const store = Agent.embedded ? storeDef : await vuePersistentStore(storeDef)
  const app = createApp(App)
  app.use(createStore(store))
  app.use(router)
  app.mount('#app')
}

initialize()