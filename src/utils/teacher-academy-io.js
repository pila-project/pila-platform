/**
 * Agent reads and writes for Teacher Academy.
 * Every write goes through the pure access gate and the signed-in teacher only.
 */
import setTagging from '@/utils/set-tagging.js'
import { readAccingoModule } from './accingo-module.js'
import {
  ACADEMY_MODULE_TYPE,
  ACADEMY_PROGRESS_SCOPE,
  ACADEMY_SERIES_TYPE,
  TEACHER_ACADEMY_CONTENT_TAG,
  academyPlayNamespace,
  academyStatement,
  acceptAcademyRecord,
  activeTypeFor,
  assertOwnAcademyWrite,
  canMutateAcademyDoc,
  canOpenAcademyRole,
  canRetagAcademyModule,
  orderedModuleIds,
  validateAcademyDocument,
} from './teacher-academy.js'

export function teacherActor(store) {
  const actorId = store?.state?.user || null
  const role = store?.getters?.['roles/role']?.(actorId)
  const permission = store?.getters?.['roles/hasPermission']?.(actorId, 'teacher') === true
  return {
    actorId,
    role,
    allowed: Boolean(actorId) && permission && canOpenAcademyRole(role),
  }
}

function refuse() {
  const error = new Error('forbidden')
  error.code = 'forbidden'
  throw error
}

function actorOrRefuse(store) {
  const actor = teacherActor(store)
  if (!actor.allowed) refuse()
  return actor
}

async function ownState(actor, scope) {
  const check = assertOwnAcademyWrite({
    actorId: actor.actorId,
    targetUserId: actor.actorId,
    scope,
  })
  if (!check.ok) refuse()
  return Agent.state(scope)
}

function kindFromType(activeType) {
  if (activeType === ACADEMY_SERIES_TYPE) return 'series'
  if (activeType === ACADEMY_MODULE_TYPE) return 'module'
  return null
}

export async function loadAcademyDocument(store, id) {
  actorOrRefuse(store)
  const meta = await Agent.metadata(id)
  const raw = await Agent.state(id)
  const accepted = acceptAcademyRecord(raw, meta?.active_type)
  if (accepted === 'accingo') {
    return { id, kind: 'module', doc: readAccingoModule(raw, id), owner: meta?.owner || null }
  }
  if (accepted === 'native') return { id, kind: 'module', doc: raw, owner: meta?.owner || null }
  return null
}

export async function loadCatalogIds(store, hostPartition) {
  actorOrRefuse(store)
  const rows = await Agent.query(
    'taggings-intersection',
    [hostPartition, [TEACHER_ACADEMY_CONTENT_TAG]],
    'tags.knowlearning.systems',
  ).catch(() => [])
  return [...new Set((rows || []).map((row) => row?.target).filter(Boolean))]
}

async function setMembership(id, hostPartition, value) {
  await setTagging(
    { tag: TEACHER_ACADEMY_CONTENT_TAG, target: id, value },
    hostPartition,
  )
}

async function retagOwnedModule(actor, moduleId, hostPartition, value) {
  let meta
  try {
    meta = await Agent.metadata(moduleId)
  } catch {
    return
  }
  if (!canRetagAcademyModule(meta, actor.actorId)) return
  await setMembership(moduleId, hostPartition, value)
}

function assignDocument(state, value) {
  state.schemaVersion = value.schemaVersion
  state.name = value.name
  state.description = value.description
  state.cover = value.cover
  state.downloads = value.downloads
  state.reflection = value.reflection
  if (value.sections) {
    state.durationMinutes = value.durationMinutes
    state.sections = value.sections
    state.related = value.related
    state.tools = value.tools
  } else {
    state.modules = value.modules
  }
}

export async function createAcademyDocument(store, kind, draft, hostPartition) {
  const actor = actorOrRefuse(store)
  const validated = validateAcademyDocument(kind, draft)
  if (!validated.ok) return validated
  const id = await Agent.create({ active_type: activeTypeFor(kind) })
  const state = await Agent.state(id)
  assignDocument(state, validated.value)
  await Agent.synced()
  await setMembership(id, hostPartition, true)
  if (kind === 'series') {
    for (const moduleId of orderedModuleIds(validated.value)) {
      await retagOwnedModule(actor, moduleId, hostPartition, null)
    }
  }
  return { ok: true, id, value: validated.value, owner: actor.actorId }
}

export async function updateAcademyDocument(store, id, kind, draft, hostPartition) {
  const actor = actorOrRefuse(store)
  const meta = await Agent.metadata(id)
  if (!canMutateAcademyDoc(meta, actor.actorId)) return { ok: false, errors: ['forbidden'] }
  if (kindFromType(meta.active_type) !== kind) return { ok: false, errors: ['kind'] }
  const validated = validateAcademyDocument(kind, draft)
  if (!validated.ok) return validated
  const previous = kind === 'series' ? orderedModuleIds(await Agent.state(id)) : []
  const state = await Agent.state(id)
  assignDocument(state, validated.value)
  await Agent.synced()
  await setMembership(id, hostPartition, true)
  if (kind === 'series') {
    const nextIds = new Set(orderedModuleIds(validated.value))
    for (const moduleId of nextIds) await retagOwnedModule(actor, moduleId, hostPartition, null)
    for (const moduleId of previous) {
      if (!nextIds.has(moduleId)) await retagOwnedModule(actor, moduleId, hostPartition, true)
    }
  }
  return { ok: true, id, value: validated.value, owner: actor.actorId }
}

export async function loadSnapshot(store) {
  const actor = actorOrRefuse(store)
  const state = await ownState(actor, ACADEMY_PROGRESS_SCOPE)
  return {
    schemaVersion: 1,
    modules: { ...(state.modules || {}) },
    series: { ...(state.series || {}) },
  }
}

export async function saveSnapshot(store, next) {
  const actor = actorOrRefuse(store)
  const state = await ownState(actor, ACADEMY_PROGRESS_SCOPE)
  state.schemaVersion = 1
  if (!state.modules || typeof state.modules !== 'object') state.modules = {}
  if (!state.series || typeof state.series !== 'object') state.series = {}
  for (const [id, entry] of Object.entries(next?.modules || {})) state.modules[id] = entry
  for (const [id, entry] of Object.entries(next?.series || {})) state.series[id] = entry
  await Agent.synced()
}

export async function loadRunstate(store, id) {
  const actor = actorOrRefuse(store)
  const state = await ownState(actor, academyPlayNamespace(id))
  if (!state.runstate || typeof state.runstate !== 'object') return null
  return { ...state.runstate }
}

export async function savePlay(store, id, runstate, publicEntry) {
  const actor = actorOrRefuse(store)
  const state = await ownState(actor, academyPlayNamespace(id))
  if (runstate) {
    state.runstate = {
      sectionIndex: runstate.sectionIndex ?? 0,
      maxSectionIndex: runstate.maxSectionIndex ?? runstate.sectionIndex ?? 0,
      continued: { ...(runstate.continued || {}) },
      answers: { ...(runstate.answers || {}) },
      checkedSections: { ...(runstate.checkedSections || {}) },
      retakeCount: runstate.retakeCount || 0,
      reflectionText: runstate.reflectionText || '',
      reflectionOption: runstate.reflectionOption ?? null,
      reflectionSubmitted: runstate.reflectionSubmitted === true,
    }
  }
  if (publicEntry) {
    const statement = academyStatement(id, publicEntry)
    if (!statement) refuse()
    state.xapi = statement
  }
  await Agent.synced()
}
