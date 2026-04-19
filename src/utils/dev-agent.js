import slugMap from '@/store/translation-slug-map.js'

const mockUser = '00000000-dev0-4000-a000-000000000000'

const states = {}
const metadatas = {}

const devTranslations = Object.entries(slugMap).map(([slug, target]) => ({
  target,
  value: slug.replace(/-/g, ' '),
  language: 'en'
}))

function getState(key) {
  if (!states[key]) states[key] = {}
  return states[key]
}

function getMetadata(id) {
  if (!metadatas[id]) metadatas[id] = { id, owner: mockUser, active_type: null, domain: location.host }
  return metadatas[id]
}

export default {
  embedded: false,
  _mockUser: mockUser,

  environment() {
    return Promise.resolve({
      domain: location.host,
      auth: {
        user: mockUser,
        provider: 'dev',
        info: { name: 'Dev Teacher', picture: null }
      },
      variables: {}
    })
  },

  state(id, user) {
    const key = user ? `${id}:${user}` : id
    return Promise.resolve(getState(key))
  },

  metadata(id) {
    return Promise.resolve(getMetadata(id))
  },

  query(type) {
    if (type === 'translations') return Promise.resolve(devTranslations)
    return Promise.resolve([])
  },

  create(config) {
    const id = crypto.randomUUID()
    states[id] = config.active || {}
    metadatas[id] = { id, owner: mockUser, active_type: config.active_type }
    return Promise.resolve(id)
  },

  watch(id, callback) {
    const state = getState(id)
    callback({ state })
    return () => {}
  },

  synced() { return Promise.resolve() },
  response() { return Promise.resolve() },
  uuid() { return crypto.randomUUID() },
  login() {},
  download() { return { direct() {} } }
}
