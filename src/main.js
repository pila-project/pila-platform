import { createApp } from 'vue'
import { createStore } from 'vuex'
import { validate as isUUID } from 'uuid'
import router from './router.js'
import Agent from '@knowlearning/agents/browser.js'
import { vuePersistentStore } from '@knowlearning/agents/vue.js'
import storeDef from './store/index.js'
import App from './pages/App.vue'
import Assignment from './pages/assignment/index.vue'

import './main.css'

window.Agent = Agent

async function initialize() {
  if (isUUID(location.pathname.slice(1))) {
    const app = createApp(Assignment, {id: location.pathname.slice(1)})
    app.mount('#app')
  }
  else {
    const store = Agent.embedded ? storeDef : await vuePersistentStore(storeDef)
    const app = createApp(App)
    app.use(createStore(store))
    app.use(router)
    app.mount('#app')
  }
}

initialize()