import { browserAgent } from '@knowlearning/agents'
import { watch } from 'vue'
import { createStore } from 'vuex'
import storeDef from '../store/index.js'

export default function runTests() {
  window.Agent = browserAgent()
  if (Agent.embedded) document.body.innerHTML = 'Cannot run tests in embedded mode.'
  else {
    document.body.innerHTML = 'Loading store...'
    storeDef.plugins.push(waitForStoreLoadThenRunTests)
    createStore(storeDef)
  }
}

function waitForStoreLoadThenRunTests (store) {
  const unwatch = watch(() => store.getters.loaded(), loaded => {
    if (loaded) {
      const user = store.getters.user()
      const role = store.getters['roles/role'](user)
      if (role !== 'admin') document.body.innerHTML = 'Tests must be run by an admin.'
      else startAdminTests(store)
      unwatch()
    }
  })
}

function startAdminTests(store) {
  document.body.innerHTML = 'Run tests!'
}