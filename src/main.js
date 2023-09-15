import { createApp } from 'vue'
import { createStore } from 'vuex'
import router from './router.js'
import { browserAgent, vuePersistentStore } from '@knowlearning/agents'
import storeDef from './store/index.js'
import App from './pages/App.vue'

import './main.css'

window.Agent = browserAgent()

async function initialize() {
  const store = await vuePersistentStore(storeDef)
  const app = createApp(App)
  app.use(createStore(store))
  app.use(router)
  app.mount('#app')
}

initialize()