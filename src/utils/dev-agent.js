// Offline static pack (trunk-style); no slug-map dependency
import staticTranslations from '@/store/staticTranslations.js'
// import { SAMPLE_MODULE_IDS, sampleEnvelope } from '@/pages/teacher/academy/sample-modules.js'

const mockUser = '00000000-dev0-4000-a000-000000000000'

const states = {}
const metadatas = {}

const devTranslations = Object.entries(staticTranslations).flatMap(([slug, langs]) =>
  Object.entries(langs || {}).map(([language, value]) => ({
    target: slug,
    value,
    language,
  })),
)

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

  query(type, args) {
    if (type === 'translations') return Promise.resolve(devTranslations)
    if (type === 'taggings-intersection') {
      const tag = args?.[1]?.[0]
      return Promise.resolve(tag === ACADEMY_TAG ? academyCatalogRows : [])
    }
    if (type === 'taggings-for-target') {
      const id = args?.[1]
      return Promise.resolve((academyTagsForTarget[id] || []).map((tag) => ({ tag })))
    }
    if (type === 'taggings-targeting-tags') {
      const id = args?.[1]
      return Promise.resolve((academyTagChildren[id] || []).map((target) => ({ target })))
    }
    if (type === 'translate-item' || type === 'tagging-for-target') return Promise.resolve([])
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

const ACADEMY_TAG = 'b40aa310-9aff-11f1-acd7-69003406037b'
const COMPETENCY_ROOT = 'fde718b0-762e-11f1-a2c5-33e64ed6c140'
const OTHER_ROOT = '3241cb20-94ff-11f1-836c-fb0d26641e20'
const CAT_TOPIC = 'bb000001-0000-4000-8000-000000000001'
const CAT_TYPE = 'bb000001-0000-4000-8000-000000000002'
const LEAF_AI = 'bb000001-0000-4000-8000-000000000011'
const LEAF_CRIT = 'bb000001-0000-4000-8000-000000000012'
const LEAF_DIGITAL = 'bb000001-0000-4000-8000-000000000013'
const LEAF_INTER = 'bb000001-0000-4000-8000-000000000021'
const LEAF_VIDEO = 'bb000001-0000-4000-8000-000000000022'
const LEAF_REQUIRED = 'bb000001-0000-4000-8000-000000000023'
const SERIES = 'aa000001-0000-4000-8000-000000000001'
const CHILD_1 = 'aa000001-0000-4000-8000-000000000011'
const CHILD_2 = 'aa000001-0000-4000-8000-000000000012'
const CHILD_3 = 'aa000001-0000-4000-8000-000000000013'
const LESSON = 'aa000001-0000-4000-8000-000000000021'
const DATA = 'aa000001-0000-4000-8000-000000000022'
const SCIENCE = 'aa000001-0000-4000-8000-000000000023'
const RUBRIC = 'aa000001-0000-4000-8000-000000000024'
const TECH = 'aa000001-0000-4000-8000-000000000025'
const EXTRA = 'aa000001-0000-4000-8000-000000000026'

const academyTagChildren = {
  [COMPETENCY_ROOT]: [CAT_TOPIC],
  [CAT_TOPIC]: [LEAF_AI, LEAF_CRIT, LEAF_DIGITAL],
  [OTHER_ROOT]: [CAT_TYPE],
  [CAT_TYPE]: [LEAF_INTER, LEAF_VIDEO, LEAF_REQUIRED],
}

const academyTagsForTarget = {
  [SERIES]: [LEAF_DIGITAL, LEAF_AI],
  [DATA]: [LEAF_INTER, LEAF_REQUIRED],
  [SCIENCE]: [LEAF_INTER],
  [RUBRIC]: [LEAF_INTER],
  [TECH]: [LEAF_VIDEO],
  [EXTRA]: [LEAF_INTER],
  [LESSON]: [LEAF_INTER, LEAF_AI],
  [CHILD_1]: [LEAF_AI, LEAF_DIGITAL, LEAF_REQUIRED],
  [CHILD_2]: [LEAF_AI, LEAF_DIGITAL, LEAF_REQUIRED],
  [CHILD_3]: [LEAF_AI, LEAF_CRIT],
}

const academyCatalogRows = []
// const academyCatalogRows = SAMPLE_MODULE_IDS.map((target) => ({ target }))

function academyName(en) {
  return { en, th: en }
}

function academyModule({ title, description, cover, minutes, withCheck = true, reflection = null, related = [], tools = [] }) {
  const section = (name, check) => ({
    title: academyName(name),
    blocks: [
      { type: 'heading', text: academyName(name) },
      { type: 'paragraph', text: academyName('Differentiated instruction is a teaching philosophy that acknowledges the diversity of learners in every classroom. Rather than delivering a one-size-fits-all curriculum, teachers plan approaches to content, process, and products based on students’ readiness, interests, and learning profiles.') },
      { type: 'callout', kind: 'insight', text: academyName('Differentiation is not about assigning different work to different students. It is about providing multiple pathways to the same learning goals.') },
      { type: 'video', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', caption: academyName('Video: Introduction (4:32)') },
    ],
    check: check ? {
      prompt: academyName('According to the module, what is the primary goal of differentiated instruction?'),
      options: [
        { text: academyName('To give each student completely different assignments'), correct: false },
        { text: academyName('To maximize each student’s growth by meeting them where they are'), correct: true },
        { text: academyName('To group students by ability level permanently'), correct: false },
      ],
    } : null,
  })
  return {
    schemaVersion: 1,
    name: academyName(title),
    description: academyName(description),
    cover,
    durationMinutes: minutes,
    sections: {
      0: section('What is Differentiated Instruction?', withCheck),
      1: section('Strategies for Content Differentiation', false),
      2: section('Assessing Differentiated Learning', withCheck),
    },
    downloads: [{ name: academyName('Download related resources'), url: 'https://example.com/resources.pdf' }],
    related,
    tools,
    reflection,
  }
}

// function seedPublishedModules() {
//   for (const id of SAMPLE_MODULE_IDS) {
//     states[id] = sampleEnvelope(id)
//     metadatas[id] = {
//       id,
//       owner: mockUser,
//       active_type: 'application/json',
//       domain: 'pila-teacher-academy.accingo.co',
//       name: id,
//     }
//   }
// }

function seedAcademyDev() {
  // seedPublishedModules()
  const covers = ['/login/hero.png', '/teacher-home/workspace-ready.png', '/mascotte.png', '/login/hero-thailand.jpg']
  const modules = {
    [LESSON]: academyModule({
      title: 'Differentiated Instruction Fundamentals',
      description: 'Builds standard Multiple Choice math items aligned to Common Core.',
      cover: covers[0],
      minutes: 45,
      related: [DATA, SCIENCE, EXTRA],
      tools: [
        { name: academyName('Math Item Builder'), url: 'https://create.pilaproject.org/sequence-builder' },
        { name: academyName('Reading passage generator'), url: 'https://create.pilaproject.org/sequence-builder' },
        { name: academyName('Science lab report'), url: 'https://create.pilaproject.org/sequence-builder' },
      ],
      reflection: { kind: 'text', prompt: academyName('Summarize your key learnings.') },
    }),
    [DATA]: academyModule({
      title: 'Data-Driven Decision Making',
      description: 'Builds standard Multiple Choice math items aligned to Common Core.',
      cover: covers[1],
      minutes: 45,
    }),
    [SCIENCE]: academyModule({
      title: 'Science lab report',
      description: 'Builds standard Multiple Choice math items aligned to Common Core.',
      cover: covers[2],
      minutes: 45,
    }),
    [RUBRIC]: academyModule({
      title: 'Rubric Creator',
      description: 'Builds standard Multiple Choice math items aligned to Common Core.',
      cover: covers[0],
      minutes: 30,
    }),
    [TECH]: academyModule({
      title: 'Technology Integration Series',
      description: 'Builds standard Multiple Choice math items aligned to Common Core.',
      cover: covers[3],
      minutes: 20,
      withCheck: false,
    }),
    [EXTRA]: academyModule({
      title: 'Data-Driven Decision Making',
      description: 'Builds standard Multiple Choice math items aligned to Common Core.',
      cover: covers[1],
      minutes: 45,
    }),
    [CHILD_1]: academyModule({
      title: 'Module 1: What is AI?',
      description: 'Builds standard Multiple Choice math items aligned to Common Core.',
      cover: covers[0],
      minutes: 45,
    }),
    [CHILD_2]: academyModule({
      title: 'Module 2: What is AI?',
      description: 'Builds standard Multiple Choice math items aligned to Common Core.',
      cover: covers[1],
      minutes: 45,
    }),
    [CHILD_3]: academyModule({
      title: 'Module 3: Machine learning basics',
      description: 'Builds standard Multiple Choice math items aligned to Common Core.',
      cover: covers[2],
      minutes: 15,
      withCheck: false,
    }),
  }
  const series = {
    schemaVersion: 1,
    name: academyName('AI Literacy Fundamentals Series'),
    description: academyName('A three-module series on digital fluency.'),
    cover: covers[0],
    modules: { 0: { id: CHILD_1 }, 1: { id: CHILD_2 }, 2: { id: CHILD_3 } },
    downloads: [{ name: academyName('Download resources (PDF)'), url: 'https://example.com/series.pdf' }],
    reflection: { kind: 'text', prompt: academyName('What will you try first?') },
  }
  const docs = { ...modules, [SERIES]: series }
  for (const [id, doc] of Object.entries(docs)) {
    states[id] = doc
    metadatas[id] = {
      id,
      owner: mockUser,
      active_type: id === SERIES ? 'application/json;type=academy_series' : 'application/json;type=academy_module',
      domain: 'localhost',
    }
  }
  const tagNames = {
    [CAT_TOPIC]: 'Topic',
    [CAT_TYPE]: 'Type',
    [LEAF_AI]: 'AI literacy',
    [LEAF_CRIT]: 'Critical thinking',
    [LEAF_DIGITAL]: 'Digital fluency',
    [LEAF_INTER]: 'Interactive module',
    [LEAF_VIDEO]: 'Video Assessment',
    [LEAF_REQUIRED]: 'Required',
  }
  for (const [id, name] of Object.entries(tagNames)) {
    states[id] = { name: { en: name } }
    metadatas[id] = { id, owner: mockUser, active_type: 'application/json', domain: 'localhost' }
  }
  states['academy-progress:v1'] = {
    schemaVersion: 1,
    modules: {
      [CHILD_1]: { status: 'completed', progress: 1, scoreRaw: 1, scoreMin: 0, scoreMax: 1, scoreScaled: 1, sectionIndex: 2, retakeCount: 0, completedAt: 1, source: 'shell' },
      [CHILD_2]: { status: 'completed', progress: 1, scoreRaw: 1, scoreMin: 0, scoreMax: 1, scoreScaled: 1, sectionIndex: 2, retakeCount: 0, completedAt: 1, source: 'shell' },
      [CHILD_3]: { status: 'in-progress', progress: 0.5, scoreRaw: null, scoreMin: null, scoreMax: null, scoreScaled: null, sectionIndex: 1, retakeCount: 0, source: 'shell' },
      [LESSON]: { status: 'in-progress', progress: 0.2, scoreRaw: 1, scoreMin: 0, scoreMax: 3, scoreScaled: 0.33, sectionIndex: 0, retakeCount: 0, source: 'shell' },
    },
    series: {},
  }
  states[`academy-progress:v1:${LESSON}`] = {
    runstate: {
      sectionIndex: 0,
      continued: {},
      answers: { 0: 0 },
      retakeCount: 0,
      reflectionText: '',
      reflectionOption: null,
      reflectionSubmitted: false,
    },
  }
}

seedAcademyDev()
