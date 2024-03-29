import browserAgent from '@knowlearning/agents/agents/browser/initialize.js'
import { watch } from 'vue'
import { createStore } from 'vuex'
import storeDef from '../store/index.js'

import basicContentManagementTests from './basic-content-management.js'
import adminContentManagementTests from './admin-content-management.js'
import studentsJoiningTeachersTests from './students-joining-teachers.js'

export default function runTests() {
  window.Agent = browserAgent()
  window.TeacherAgent = browserAgent({ unique: true, getToken: () => 'anonymous-ephemeral', root: true})
  window.StudentAgent1 = browserAgent({ unique: true, getToken: () => 'anonymous-ephemeral', root: true})
  window.StudentAgent2 = browserAgent({ unique: true, getToken: () => 'anonymous-ephemeral', root: true})

  if (Agent.embedded) document.body.innerHTML = 'Cannot run tests in embedded mode.'
  else {
    createStore({
      ...storeDef,
      plugins: [
        ...storeDef.plugins,
        waitForStoreLoadThenRunTests
      ]
    })
  }
}

function waitForStoreLoadThenRunTests (store) {
  document.body.innerHTML = 'Loading store...'
  const unwatch = watch(() => store.getters.loaded(), async loaded => {
    if (loaded) {
      const user = store.getters.user()
      const role = store.getters['roles/role'](user)
      if (role !== 'admin') document.body.innerHTML = 'Tests must be run by an admin.'
      else {
        const [chai] = await Promise.all([
          import('chai/chai.js'),
          import('mocha/mocha.js'),
          import('mocha/mocha.css')
        ])
        //  set up some globals for ease of use in test files
        window.expect = chai.expect
        window.pause = ms => new Promise(r => setTimeout(r, ms))
        chai.config.truncateThreshold = 0; // disable truncating

        document.body.innerHTML = '<div id="mocha"></div>'

        mocha.setup({ ui: 'bdd', reporter: 'HTML',  slow: 1000 })
        mocha.run()

        describe('PILA Platform Tests', function () {
          basicContentManagementTests(store)
          adminContentManagementTests(store)
          studentsJoiningTeachersTests(store)
        })
      }
      unwatch()
    }
  })
}
