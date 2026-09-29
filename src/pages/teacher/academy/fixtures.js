/**
 * Local stand-ins for published Academy modules.
 * The library does not list them. sample-modules.js remains for tests.
 * Nothing here is written to Agent.
 */
import { readAccingoModule } from '@/utils/accingo-module.js'
import { emptySnapshot } from '@/utils/teacher-academy.js'
import { sampleEnvelope } from './sample-modules.js'
// import { SAMPLE_MODULE_IDS, sampleEnvelope } from './sample-modules.js'

const STORAGE_KEY = 'pila-academy-ui-samples'
// Stand-in modules stay in sample-modules.js for tests.
// The library lists only ids the Teacher Academy tag returns.
const SAMPLE_IDS = new Set()
// const SAMPLE_IDS = new Set(SAMPLE_MODULE_IDS)

export function isAcademyFixture(id) {
  return SAMPLE_IDS.has(id)
}

export function fixtureRecord(id) {
  const doc = readAccingoModule(sampleEnvelope(id), id)
  if (!doc) return null
  return { id, kind: 'module', doc, owner: null, tags: [] }
}

export function fixtureCatalogRecords() {
  return []
  // return SAMPLE_MODULE_IDS.map((id) => fixtureRecord(id)).filter(Boolean)
}

function blankStore() {
  return { modules: {}, series: {}, runs: {} }
}

function readStore() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return blankStore()
    const parsed = JSON.parse(raw)
    return {
      modules: parsed.modules || {},
      series: parsed.series || {},
      runs: parsed.runs || {},
    }
  } catch {
    return blankStore()
  }
}

function writeStore(next) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* private mode */
  }
}

export function readFixtureSnapshot() {
  const stored = readStore()
  return { schemaVersion: 1, modules: stored.modules, series: stored.series }
}

export function writeFixtureSnapshot(snapshot) {
  const stored = readStore()
  for (const [id, entry] of Object.entries(snapshot?.modules || {})) {
    if (isAcademyFixture(id)) stored.modules[id] = entry
  }
  for (const [id, entry] of Object.entries(snapshot?.series || {})) {
    if (isAcademyFixture(id)) stored.series[id] = entry
  }
  writeStore(stored)
}

export function readFixtureRun(id) {
  return readStore().runs[id] || null
}

export function writeFixtureRun(id, runstate) {
  if (!isAcademyFixture(id) || !runstate) return
  const stored = readStore()
  stored.runs[id] = runstate
  writeStore(stored)
}

export function mergeFixtureSnapshot(real) {
  const local = readFixtureSnapshot()
  const base = real && typeof real === 'object' ? real : emptySnapshot()
  return {
    schemaVersion: 1,
    modules: { ...(base.modules || {}), ...local.modules },
    series: { ...(base.series || {}), ...local.series },
  }
}
