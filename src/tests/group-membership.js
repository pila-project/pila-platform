import { createStore } from 'vuex'
import groups from '../store/groups.js'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export default function groupMembershipTests() {
  describe('Optimistic group membership', function () {
    const membership = { user_id: 'student-a', group_id: 'class-a' }
    let store
    let records
    let metadataCalls
    let previousAgent
    let hadAgent

    const members = () => store.getters['groups/members'](membership.group_id)
    const add = () => store.dispatch('groups/addMember', membership)
    const remove = () => store.dispatch('groups/removeMember', membership)
    const seed = (id, overrides = {}) => {
      const record = { ...membership, archived: false, ...overrides }
      records[id] = { ...record }
      store.commit('groups/addMember', { id, ...record })
    }
    const rejection = promise => promise.then(
      () => { throw new Error('Expected the membership save to fail') },
      error => error
    )

    beforeEach(function () {
      hadAgent = Object.prototype.hasOwnProperty.call(globalThis, 'Agent')
      previousAgent = globalThis.Agent
      records = {}
      metadataCalls = []
      globalThis.Agent = {
        metadata: async id => {
          metadataCalls.push(id)
          return {}
        },
        state: async id => (records[id] ||= {}),
        synced: async () => {},
        query: async () => []
      }
      store = createStore({ modules: { groups } })
    })

    afterEach(function () {
      if (hadAgent) globalThis.Agent = previousAgent
      else delete globalThis.Agent
    })

    it('shows an added student before metadata has loaded', async function () {
      const metadata = deferred()
      globalThis.Agent.metadata = () => metadata.promise

      const saving = add()

      expect(members()).to.deep.equal(['student-a'])
      expect(store.getters['groups/belongs']('student-a', 'class-a')).to.equal(true)
      metadata.resolve({})
      const id = await saving
      expect(records[id]).to.include(membership)
      expect(members()).to.deep.equal(['student-a'])
    })

    it('persists one membership when added again before and after saving', async function () {
      const metadata = deferred()
      globalThis.Agent.metadata = id => {
        metadataCalls.push(id)
        return metadata.promise
      }

      const firstSave = add()
      const repeatedSave = add()
      metadata.resolve({})
      await Promise.all([firstSave, repeatedSave])
      await add()

      expect(metadataCalls).to.have.length(1)
      expect(Object.values(records)).to.have.length(1)
      expect(members()).to.deep.equal(['student-a'])
    })

    it('reinstates an archived membership without creating another record', async function () {
      seed('existing', { archived: true })

      const saving = add()
      expect(members()).to.deep.equal(['student-a'])

      expect(await saving).to.equal('existing')
      expect(Object.keys(records)).to.deep.equal(['existing'])
      expect(records.existing.archived).to.equal(false)
    })

    for (const fails of [false, true]) {
      it(`preserves a re-add when the earlier removal ${fails ? 'fails' : 'finishes'}`, async function () {
        seed('existing')
        const earlierRead = deferred()
        const readStarted = deferred()
        const error = new Error('Cannot read membership')
        let reads = 0
        globalThis.Agent.state = async id => {
          if (++reads === 1) {
            readStarted.resolve()
            return earlierRead.promise
          }
          return (records[id] ||= {})
        }
        const removing = remove()
        const removalResult = fails ? rejection(removing) : removing
        await readStarted.promise

        const adding = add()
        expect(members()).to.deep.equal(['student-a'])
        if (fails) earlierRead.reject(error)
        else earlierRead.resolve(records.existing)
        const result = await removalResult

        if (fails) expect(result).to.equal(error)
        expect(await adding).to.equal('existing')
        expect(Object.keys(records)).to.deep.equal(['existing'])
        expect(Object.keys(store.state.groups.members)).to.deep.equal(['existing'])
        expect(records.existing.archived).to.equal(false)
        expect(members()).to.deep.equal(['student-a'])
      })
    }

    for (const removalFails of [false, true]) {
      it(`restores the persisted membership when removal ${removalFails ? 'fails' : 'succeeds'} and re-add fails`, async function () {
        seed('existing')
        const earlierRead = deferred()
        const readStarted = deferred()
        const removalError = new Error('Cannot remove membership')
        const additionError = new Error('Cannot re-add membership')
        globalThis.Agent.state = async () => {
          readStarted.resolve()
          return earlierRead.promise
        }
        globalThis.Agent.metadata = async () => { throw additionError }

        const removing = remove()
        const removalResult = removalFails ? rejection(removing) : removing
        await readStarted.promise
        const additionResult = rejection(add())
        expect(members()).to.deep.equal(['student-a'])

        if (removalFails) earlierRead.reject(removalError)
        else earlierRead.resolve(records.existing)
        const result = await removalResult

        if (removalFails) expect(result).to.equal(removalError)
        expect(await additionResult).to.equal(additionError)
        expect(Object.keys(records)).to.deep.equal(['existing'])
        expect(records.existing.archived).to.equal(!removalFails)
        expect(store.state.groups.members.existing.archived).to.equal(!removalFails)
        expect(members()).to.deep.equal(removalFails ? ['student-a'] : [])
      })
    }

    it('removes a student immediately and ignores an older query result', async function () {
      seed('existing')
      const queried = deferred()
      const remote = deferred()
      globalThis.Agent.query = () => queried.promise
      globalThis.Agent.state = () => remote.promise
      const loading = store.dispatch('groups/loadMembers')

      const saving = remove()
      expect(members()).to.deep.equal([])
      queried.resolve([{ id: 'existing', ...membership, archived: false }])
      await loading
      expect(members()).to.deep.equal([])

      remote.resolve(records.existing)
      await saving
      expect(records.existing.archived).to.equal(true)
      expect(members()).to.deep.equal([])
    })

    it('rolls back a failed addition without removing other memberships', async function () {
      seed('other-class', { group_id: 'class-b' })
      const failed = deferred()
      const error = new Error('Cannot save membership')
      globalThis.Agent.metadata = () => failed.promise

      const saving = add()
      expect(members()).to.deep.equal(['student-a'])
      const caught = rejection(saving)
      failed.reject(error)

      expect(await caught).to.equal(error)
      expect(members()).to.deep.equal([])
      expect(store.getters['groups/members']('class-b')).to.deep.equal(['student-a'])
      expect(Object.keys(store.state.groups.members)).to.deep.equal(['other-class'])
    })

    it('restores the archived membership when reinstatement fails', async function () {
      seed('existing', { archived: true })
      const error = new Error('Cannot reinstate membership')
      globalThis.Agent.metadata = async () => { throw error }

      const saving = add()
      expect(members()).to.deep.equal(['student-a'])

      expect(await rejection(saving)).to.equal(error)
      expect(members()).to.deep.equal([])
      expect(Object.keys(store.state.groups.members)).to.deep.equal(['existing'])
      expect(store.state.groups.members.existing.archived).to.equal(true)
      expect(records.existing.archived).to.equal(true)
    })

    it('restores a removed membership when synchronization fails', async function () {
      seed('existing')
      seed('other-student', { user_id: 'student-b' })
      const error = new Error('Cannot synchronize membership')
      globalThis.Agent.synced = async () => { throw error }

      const saving = remove()
      expect(members()).to.deep.equal(['student-b'])

      expect(await rejection(saving)).to.equal(error)
      expect(members()).to.have.members(['student-a', 'student-b'])
      expect(store.state.groups.members.existing.archived).to.equal(false)
      expect(store.state.groups.members['other-student'].archived).to.equal(false)
    })

    it('shows legacy duplicates once and archives every active duplicate', async function () {
      seed('duplicate-a')
      seed('duplicate-b')
      seed('already-archived', { archived: true })
      seed('other-class', { group_id: 'class-b' })
      expect(members()).to.deep.equal(['student-a'])

      const saving = remove()
      expect(members()).to.deep.equal([])
      await saving

      expect(records['duplicate-a'].archived).to.equal(true)
      expect(records['duplicate-b'].archived).to.equal(true)
      expect(records['already-archived'].archived).to.equal(true)
      expect(records['other-class'].archived).to.equal(false)
      expect(members()).to.deep.equal([])
    })

    it('does not partly archive duplicates when one record cannot be read', async function () {
      seed('duplicate-a')
      seed('duplicate-b')
      const error = new Error('Cannot read duplicate membership')
      globalThis.Agent.state = async id => {
        if (id === 'duplicate-b') throw error
        return records[id]
      }

      const saving = remove()
      expect(members()).to.deep.equal([])

      expect(await rejection(saving)).to.equal(error)
      expect(records['duplicate-a'].archived).to.equal(false)
      expect(records['duplicate-b'].archived).to.equal(false)
      expect(store.state.groups.members['duplicate-a'].archived).to.equal(false)
      expect(store.state.groups.members['duplicate-b'].archived).to.equal(false)
      expect(members()).to.deep.equal(['student-a'])
    })

    it('keeps a student removed when their pending addition finishes', async function () {
      const metadata = deferred()
      globalThis.Agent.metadata = () => metadata.promise
      const adding = add()

      const removing = remove()
      expect(members()).to.deep.equal([])
      metadata.resolve({})
      const [id] = await Promise.all([adding, removing])

      expect(records[id]).to.include({ ...membership, archived: true })
      expect(members()).to.deep.equal([])
    })

    it('preserves an addition made after a membership query started', async function () {
      const queried = deferred()
      globalThis.Agent.query = () => queried.promise
      const loading = store.dispatch('groups/loadMembers')
      const id = await add()

      queried.resolve([{ id, ...membership, archived: true }])
      await loading

      expect(members()).to.deep.equal(['student-a'])
    })
  })
}
