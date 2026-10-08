/**
 * Teacher Academy contract, catalog join, progress, and public statements.
 * Pure: no Agent and no Vue. Pages and the IO module call these functions.
 */
import {
  accingoBlocked,
  accingoBreakdown,
  accingoNeedsReview,
  accingoProgress,
  accingoScore,
  readAccingoModule,
  readStoredAnswer,
} from './accingo-module.js'

export const TEACHER_ACADEMY_CONTENT_TAG = 'b40aa310-9aff-11f1-acd7-69003406037b'

export const ACADEMY_PROGRESS_SCOPE = 'academy-progress:v1'

export const ACADEMY_SCHEMA = 1

export const ACADEMY_MODULE_TYPE = 'application/json;type=academy_module'

export const ACADEMY_SERIES_TYPE = 'application/json;type=academy_series'

export const ACADEMY_VERBS = Object.freeze({
  progressed: 'http://adlnet.gov/expapi/verbs/progressed',
  completed: 'http://adlnet.gov/expapi/verbs/completed',
})

export const ACADEMY_EXT = Object.freeze({
  schema: 'https://pilaproject.org/xapi/academy/schema',
  status: 'https://pilaproject.org/xapi/academy/status',
  progress: 'https://pilaproject.org/xapi/academy/progress',
  sectionIndex: 'https://pilaproject.org/xapi/academy/sectionIndex',
  retakeCount: 'https://pilaproject.org/xapi/academy/retakeCount',
})

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const LANG_KEY_RE = /^[a-z]{2}(?:-[a-z]{2})?$/i

const TEACHER_CAPABLE_ROLES = new Set(['teacher', 'admin', 'researcher'])

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

export function activeTypeFor(kind) {
  if (kind === 'series') return ACADEMY_SERIES_TYPE
  if (kind === 'module') return ACADEMY_MODULE_TYPE
  return null
}

export function academyPlayNamespace(id) {
  if (!isUuid(id)) throw new Error('invalid academy play id')
  return `${ACADEMY_PROGRESS_SCOPE}:${id}`
}

export function canOpenAcademyRole(role) {
  return TEACHER_CAPABLE_ROLES.has(role)
}

/**
 * Snapshot and runstate writes are only for the signed-in teacher, and only
 * on the Academy scope family. Assignment ids and the preview namespace fail.
 */
export function assertOwnAcademyWrite({ actorId, targetUserId, scope }) {
  if (!actorId || typeof actorId !== 'string') return { ok: false, error: 'forbidden' }
  if (targetUserId && targetUserId !== actorId) return { ok: false, error: 'forbidden' }
  if (scope === ACADEMY_PROGRESS_SCOPE) return { ok: true, scope }
  if (typeof scope === 'string' && scope.startsWith(`${ACADEMY_PROGRESS_SCOPE}:`)) {
    const rest = scope.slice(ACADEMY_PROGRESS_SCOPE.length + 1)
    if (rest === 'preview' || !isUuid(rest)) return { ok: false, error: 'forbidden-scope' }
    return { ok: true, scope }
  }
  return { ok: false, error: 'forbidden-scope' }
}

export function canMutateAcademyDoc(meta, actorId) {
  return Boolean(meta && actorId && meta.owner === actorId)
}

export function localizedText(value, lang = 'en') {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  const short = String(lang || 'en').split(/[-_]/)[0].toLowerCase() || 'en'
  if (typeof value[short] === 'string' && value[short].trim()) return value[short]
  if (typeof value.en === 'string') return value.en
  const first = Object.values(value).find((entry) => typeof entry === 'string' && entry.trim())
  return first || ''
}

function fail(errors) {
  return { ok: false, errors, value: null }
}

function readLang(value, required) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'lang' }
  const out = {}
  for (const [key, entry] of Object.entries(value)) {
    if (!LANG_KEY_RE.test(key) || typeof entry !== 'string') return { ok: false, error: 'lang' }
    out[key.toLowerCase()] = entry
  }
  if (typeof out.en !== 'string' || (required && !out.en.trim())) return { ok: false, error: 'lang-en' }
  return { ok: true, value: out }
}

function readUrl(value, allowEmpty) {
  if (value == null || value === '') {
    return allowEmpty ? { ok: true, value: '' } : { ok: false, error: 'url' }
  }
  if (typeof value !== 'string') return { ok: false, error: 'url' }
  let parsed
  try { parsed = new URL(value) } catch { return { ok: false, error: 'url' } }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return { ok: false, error: 'url' }
  return { ok: true, value }
}

function readOrderedMap(map, label, readValue) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    return { ok: false, errors: [`${label}-shape`] }
  }
  const keys = Object.keys(map)
  if (keys.some((key) => !/^\d+$/.test(key))) return { ok: false, errors: [`${label}-key`] }
  const nums = keys.map(Number).sort((a, b) => a - b)
  for (let i = 0; i < nums.length; i += 1) {
    if (nums[i] !== i) return { ok: false, errors: [`${label}-order`] }
  }
  const value = {}
  const errors = []
  nums.forEach((num) => {
    const parsed = readValue(map[String(num)], num)
    if (!parsed.ok) errors.push(...(parsed.errors || [parsed.error || `${label}-value`]))
    else value[String(num)] = parsed.value
  })
  if (errors.length) return { ok: false, errors }
  return { ok: true, value }
}

function readBlock(block) {
  if (!block || typeof block !== 'object') return { ok: false, errors: ['block'] }
  const type = block.type
  if (type === 'heading' || type === 'paragraph') {
    const text = readLang(block.text, true)
    if (!text.ok) return { ok: false, errors: ['block-text'] }
    return { ok: true, value: { type, text: text.value } }
  }
  if (type === 'callout') {
    if (block.kind !== 'insight' && block.kind !== 'tip') return { ok: false, errors: ['block-callout'] }
    const text = readLang(block.text, true)
    if (!text.ok) return { ok: false, errors: ['block-text'] }
    return { ok: true, value: { type, kind: block.kind, text: text.value } }
  }
  if (type === 'figure' || type === 'video') {
    const url = readUrl(block.url, false)
    if (!url.ok) return { ok: false, errors: ['block-url'] }
    const caption = readLang(block.caption || { en: '' }, false)
    if (!caption.ok) return { ok: false, errors: ['block-caption'] }
    return { ok: true, value: { type, url: url.value, caption: caption.value } }
  }
  return { ok: false, errors: ['block-type'] }
}

function readCheck(check) {
  if (check == null) return { ok: true, value: null }
  if (!check || typeof check !== 'object') return { ok: false, errors: ['check'] }
  const prompt = readLang(check.prompt, true)
  if (!prompt.ok) return { ok: false, errors: ['check-prompt'] }
  if (!Array.isArray(check.options) || check.options.length < 2) {
    return { ok: false, errors: ['check-options'] }
  }
  let correct = 0
  const options = []
  for (const option of check.options) {
    const text = readLang(option?.text, true)
    if (!text.ok) return { ok: false, errors: ['check-option'] }
    const isCorrect = option.correct === true
    if (isCorrect) correct += 1
    options.push({ text: text.value, correct: isCorrect })
  }
  if (correct !== 1) return { ok: false, errors: ['check-correct'] }
  return { ok: true, value: { prompt: prompt.value, options } }
}

function readReflection(reflection) {
  if (reflection == null) return { ok: true, value: null }
  if (!reflection || typeof reflection !== 'object') return { ok: false, errors: ['reflection'] }
  const prompt = readLang(reflection.prompt, true)
  if (!prompt.ok) return { ok: false, errors: ['reflection-prompt'] }
  if (reflection.kind === 'text') return { ok: true, value: { kind: 'text', prompt: prompt.value } }
  if (reflection.kind === 'choice') {
    if (!Array.isArray(reflection.options) || reflection.options.length < 2) {
      return { ok: false, errors: ['reflection-options'] }
    }
    const options = []
    for (const option of reflection.options) {
      const text = readLang(option?.text, true)
      if (!text.ok) return { ok: false, errors: ['reflection-option'] }
      options.push({ text: text.value })
    }
    return { ok: true, value: { kind: 'choice', prompt: prompt.value, options } }
  }
  return { ok: false, errors: ['reflection-kind'] }
}

function readDownloads(downloads) {
  if (downloads == null) return { ok: true, value: [] }
  if (!Array.isArray(downloads)) return { ok: false, errors: ['downloads'] }
  const value = []
  for (const item of downloads) {
    const name = readLang(item?.name, true)
    const url = readUrl(item?.url, false)
    if (!name.ok || !url.ok) return { ok: false, errors: ['download'] }
    value.push({ name: name.value, url: url.value })
  }
  return { ok: true, value }
}

function readIdList(list, label) {
  if (list == null) return { ok: true, value: [] }
  if (!Array.isArray(list)) return { ok: false, errors: [label] }
  const value = []
  for (const id of list) {
    if (!isUuid(id)) return { ok: false, errors: [label] }
    value.push(id)
  }
  return { ok: true, value }
}

function readTools(tools) {
  if (tools == null) return { ok: true, value: [] }
  if (!Array.isArray(tools)) return { ok: false, errors: ['tools'] }
  const value = []
  for (const tool of tools) {
    const name = readLang(tool?.name, true)
    const url = readUrl(tool?.url, false)
    if (!name.ok || !url.ok) return { ok: false, errors: ['tool'] }
    value.push({ name: name.value, url: url.value })
  }
  return { ok: true, value }
}

function readSection(section) {
  if (!section || typeof section !== 'object') return { ok: false, errors: ['section'] }
  const title = readLang(section.title, true)
  if (!title.ok) return { ok: false, errors: ['section-title'] }
  if (!Array.isArray(section.blocks)) return { ok: false, errors: ['section-blocks'] }
  const blocks = []
  for (const block of section.blocks) {
    const parsed = readBlock(block)
    if (!parsed.ok) return parsed
    blocks.push(parsed.value)
  }
  const check = readCheck(section.check)
  if (!check.ok) return check
  return { ok: true, value: { title: title.value, blocks, check: check.value } }
}

function readModule(input) {
  const errors = []
  const name = readLang(input?.name, true)
  const description = readLang(input?.description || { en: '' }, false)
  const cover = readUrl(input?.cover ?? '', true)
  if (!name.ok) errors.push('name')
  if (!description.ok) errors.push('description')
  if (!cover.ok) errors.push('cover')
  const duration = input?.durationMinutes
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) errors.push('duration')
  const sections = readOrderedMap(input?.sections, 'section', readSection)
  if (!sections.ok) errors.push(...sections.errors)
  else if (!Object.keys(sections.value).length) errors.push('section-empty')
  const downloads = readDownloads(input?.downloads)
  const related = readIdList(input?.related, 'related')
  const tools = readTools(input?.tools)
  const reflection = readReflection(input?.reflection)
  if (!downloads.ok) errors.push(...downloads.errors)
  if (!related.ok) errors.push(...related.errors)
  if (!tools.ok) errors.push(...tools.errors)
  if (!reflection.ok) errors.push(...reflection.errors)
  if (errors.length) return fail(errors)
  return {
    ok: true,
    errors: [],
    value: {
      schemaVersion: ACADEMY_SCHEMA,
      name: name.value,
      description: description.value,
      cover: cover.value,
      durationMinutes: duration,
      sections: sections.value,
      downloads: downloads.value,
      related: related.value,
      tools: tools.value,
      reflection: reflection.value,
    },
  }
}

function readSeriesModule(entry) {
  if (!entry || !isUuid(entry.id)) return { ok: false, errors: ['series-module'] }
  return { ok: true, value: { id: entry.id } }
}

function readSeries(input) {
  const errors = []
  const name = readLang(input?.name, true)
  const description = readLang(input?.description || { en: '' }, false)
  const cover = readUrl(input?.cover ?? '', true)
  if (!name.ok) errors.push('name')
  if (!description.ok) errors.push('description')
  if (!cover.ok) errors.push('cover')
  const modules = readOrderedMap(input?.modules || {}, 'series-module', readSeriesModule)
  if (!modules.ok) errors.push(...modules.errors)
  else {
    const ids = Object.values(modules.value).map((entry) => entry.id)
    if (new Set(ids).size !== ids.length) errors.push('series-duplicate')
  }
  const downloads = readDownloads(input?.downloads)
  const reflection = readReflection(input?.reflection)
  if (!downloads.ok) errors.push(...downloads.errors)
  if (!reflection.ok) errors.push(...reflection.errors)
  if (errors.length) return fail(errors)
  return {
    ok: true,
    errors: [],
    value: {
      schemaVersion: ACADEMY_SCHEMA,
      name: name.value,
      description: description.value,
      cover: cover.value,
      modules: modules.value,
      downloads: downloads.value,
      reflection: reflection.value,
    },
  }
}

export function validateAcademyDocument(kind, input) {
  if (kind === 'module') return readModule(input)
  if (kind === 'series') return readSeries(input)
  return fail(['kind'])
}

export function orderedKeys(map) {
  if (!map || typeof map !== 'object') return []
  return Object.keys(map).filter((key) => /^\d+$/.test(key)).sort((a, b) => Number(a) - Number(b))
}

export function orderedModuleIds(series) {
  return orderedKeys(series?.modules).map((key) => series.modules[key]?.id).filter(Boolean)
}

export function emptySnapshot() {
  return { schemaVersion: ACADEMY_SCHEMA, modules: {}, series: {} }
}

export function emptyRunstate() {
  return {
    sectionIndex: 0,
    maxSectionIndex: 0,
    continued: {},
    answers: {},
    checkedSections: {},
    retakeCount: 0,
    reflectionText: '',
    reflectionOption: null,
    reflectionSubmitted: false,
  }
}

function clamp01(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.min(1, Math.max(0, number))
}

function cloneSnapshot(snapshot) {
  const base = snapshot && typeof snapshot === 'object' ? snapshot : emptySnapshot()
  return {
    schemaVersion: ACADEMY_SCHEMA,
    modules: { ...(base.modules || {}) },
    series: { ...(base.series || {}) },
  }
}

function patchModule(snapshot, moduleId, entry) {
  const next = cloneSnapshot(snapshot)
  next.modules[moduleId] = entry
  return next
}

function patchSeries(snapshot, seriesId, entry) {
  const next = cloneSnapshot(snapshot)
  next.series[seriesId] = entry
  return next
}

function freshEntry(now) {
  return {
    status: 'in-progress',
    progress: 0,
    scoreRaw: null,
    scoreMin: null,
    scoreMax: null,
    scoreScaled: null,
    sectionIndex: null,
    retakeCount: 0,
    lastOpenedAt: now,
    lastProgressAt: null,
    completedAt: null,
    source: 'shell',
  }
}

export function checkKeys(moduleDoc) {
  return orderedKeys(moduleDoc?.sections).filter((key) => moduleDoc.sections[key]?.check)
}

function gradedAnswers(moduleDoc, runstate) {
  const rows = []
  for (const key of orderedKeys(moduleDoc?.sections)) {
    const section = moduleDoc.sections[key]
    if (Array.isArray(section?.checks) && section.checks.length) {
      for (const check of section.checks) {
        rows.push({ index: runstate?.answers?.[check.id], options: check.options || [] })
      }
    } else if (section?.check) {
      rows.push({ index: runstate?.answers?.[key], options: section.check.options || [] })
    }
  }
  return rows
}

function isAccingo(moduleDoc) {
  return moduleDoc?.format === 'accingo'
}

export function scoreFields(moduleDoc, runstate) {
  if (isAccingo(moduleDoc)) return accingoScore(moduleDoc, runstate)
  const rows = gradedAnswers(moduleDoc, runstate)
  if (!rows.length) {
    return { scoreRaw: null, scoreMin: null, scoreMax: null, scoreScaled: null }
  }
  let correct = 0
  for (const row of rows) {
    if (row.options[row.index]?.correct === true) correct += 1
  }
  return {
    scoreRaw: correct,
    scoreMin: 0,
    scoreMax: rows.length,
    scoreScaled: correct / rows.length,
  }
}

export function needsReview(moduleDoc, runstate) {
  if (isAccingo(moduleDoc)) return accingoNeedsReview(moduleDoc, runstate)
  for (const row of gradedAnswers(moduleDoc, runstate)) {
    if (row.index == null) continue
    if (row.options[row.index]?.correct !== true) return true
  }
  return false
}

export function reviewBreakdown(moduleDoc, runstate) {
  if (isAccingo(moduleDoc)) return accingoBreakdown(moduleDoc, runstate)
  const rows = []
  for (const key of orderedKeys(moduleDoc?.sections)) {
    const section = moduleDoc.sections[key]
    const checks = section?.checks?.length
      ? section.checks.map((check) => ({ ...check, answerKey: check.id }))
      : (section?.check ? [{ ...section.check, answerKey: key }] : [])
    for (const check of checks) {
      const index = runstate?.answers?.[check.answerKey]
      if (index == null) continue
      rows.push({
        prompt: check.prompt,
        correct: check.options?.[index]?.correct === true,
        poll: false,
      })
    }
  }
  return rows
}

export function sectionAdvanceError(moduleDoc, sectionKey, runstate) {
  if (isAccingo(moduleDoc)) return accingoBlocked(moduleDoc, sectionKey, runstate)
  const section = moduleDoc?.sections?.[sectionKey]
  if (!section) return 'unknown-section'
  const waiting = Array.isArray(section.checks) && section.checks.length
    ? section.checks.some((check) => runstate?.answers?.[check.id] == null)
    : Boolean(section.check) && runstate?.answers?.[sectionKey] == null
  return waiting ? 'check-required' : null
}

export function openModule(snapshot, moduleId, now) {
  const next = cloneSnapshot(snapshot)
  const prev = next.modules[moduleId]
  if (prev) {
    next.modules[moduleId] = { ...prev, lastOpenedAt: now }
    return { snapshot: next, created: false, publicEntry: next.modules[moduleId] }
  }
  const entry = freshEntry(now)
  next.modules[moduleId] = entry
  return { snapshot: next, created: true, publicEntry: entry }
}

export function openSeries(snapshot, seriesId, now) {
  const next = cloneSnapshot(snapshot)
  const prev = next.series[seriesId]
  if (prev) {
    next.series[seriesId] = { ...prev, lastOpenedAt: now }
    return { snapshot: next, created: false, publicEntry: next.series[seriesId] }
  }
  const entry = freshEntry(now)
  next.series[seriesId] = entry
  return { snapshot: next, created: true, publicEntry: entry }
}

function publicSlice(entry) {
  return {
    status: entry.status,
    progress: entry.progress,
    scoreRaw: entry.scoreRaw,
    scoreMin: entry.scoreMin,
    scoreMax: entry.scoreMax,
    scoreScaled: entry.scoreScaled,
    sectionIndex: entry.sectionIndex,
    retakeCount: entry.retakeCount,
    lastOpenedAt: entry.lastOpenedAt,
    lastProgressAt: entry.lastProgressAt,
    completedAt: entry.completedAt,
    source: entry.source,
  }
}

function sameStored(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function withSectionCursor(runstate, sectionIndex) {
  const index = Number.isFinite(sectionIndex) && sectionIndex >= 0 ? sectionIndex : 0
  const prevMax = Number(runstate?.maxSectionIndex)
  const maxSectionIndex = Math.max(
    Number.isFinite(prevMax) ? prevMax : 0,
    Number(runstate?.sectionIndex) || 0,
    index,
  )
  return { sectionIndex: index, maxSectionIndex }
}

export function acceptAcademyRecord(raw, activeType) {
  if (readAccingoModule(raw, raw?.state?.uuid || raw?.uuid || '')) return 'accingo'
  if (activeType === ACADEMY_MODULE_TYPE && raw && typeof raw === 'object') return 'native'
  return null
}

function accingoTarget(section, checkId) {
  const checks = section?.checks || []
  if (!checkId) {
    if (!section?.check?.fqn) return null
    return { key: section.check.fqn, check: section.check }
  }
  const quiz = checks.find((item) => item.fqn === checkId || item.id === checkId)
  if (quiz) return { key: quiz.fqn, check: quiz }
  const interaction = (section?.interactions || []).find((item) => item.fqn === checkId || item.id === checkId)
  if (interaction) return { key: interaction.fqn, check: null }
  return null
}

function accingoStoredValue(check, optionIndex, optionIndexes, value) {
  if (!check || check.kind !== 'choice') return value
  const count = check.options?.length || 0
  if (check.multi) {
    const indexes = Array.isArray(optionIndexes) ? optionIndexes : []
    if (!indexes.length || indexes.some((index) => !Number.isInteger(index) || index < 0 || index >= count)) return undefined
    return indexes
  }
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= count) return undefined
  return optionIndex
}

function answerAccingo({ snapshot, runstate, module, moduleId, sectionKey, optionIndex, optionIndexes, value, checkId, now }) {
  const section = module?.sections?.[sectionKey]
  const target = accingoTarget(section, checkId)
  if (!target) return { ok: false, error: 'no-check', snapshot, runstate }
  const stored = accingoStoredValue(target.check, optionIndex, optionIndexes, value)
  if (stored === undefined) return { ok: false, error: 'bad-option', snapshot, runstate }
  const prevAnswer = readStoredAnswer(runstate, target.key, target.check?.legacyKeys)
  if (sameStored(prevAnswer, stored)) {
    const current = cloneSnapshot(snapshot)
    return {
      ok: true,
      unchanged: true,
      snapshot: current,
      runstate,
      publicEntry: current.modules[moduleId] || null,
    }
  }
  const retakeCount = (runstate?.retakeCount || 0) + (prevAnswer == null ? 0 : 1)
  const checkedSections = { ...(runstate?.checkedSections || {}) }
  if (module?.correctnessFeedback === 'onDemand') delete checkedSections[sectionKey]
  const cursor = withSectionCursor(runstate, orderedKeys(module.sections).indexOf(sectionKey))
  const nextRun = {
    ...emptyRunstate(),
    ...runstate,
    answers: { ...(runstate?.answers || {}), [target.key]: stored },
    checkedSections,
    retakeCount,
    sectionIndex: cursor.sectionIndex,
    maxSectionIndex: cursor.maxSectionIndex,
  }
  const prev = cloneSnapshot(snapshot).modules[moduleId] || freshEntry(now)
  const entry = publicSlice({
    ...prev,
    ...scoreFields(module, nextRun),
    status: prev.status === 'completed' ? 'completed' : 'in-progress',
    progress: accingoProgress(module, nextRun),
    sectionIndex: cursor.sectionIndex,
    retakeCount,
    lastOpenedAt: prev.lastOpenedAt || now,
    lastProgressAt: now,
    completedAt: prev.status === 'completed' ? prev.completedAt : null,
    source: 'shell',
  })
  return {
    ok: true,
    snapshot: patchModule(snapshot, moduleId, entry),
    runstate: nextRun,
    publicEntry: entry,
  }
}

export function answerCheck({ snapshot, runstate, module, moduleId, sectionKey, optionIndex, optionIndexes, value, checkId, now }) {
  if (isAccingo(module)) {
    return answerAccingo({ snapshot, runstate, module, moduleId, sectionKey, optionIndex, optionIndexes, value, checkId, now })
  }
  const section = module?.sections?.[sectionKey]
  const listed = checkId ? (section?.checks || []).find((item) => item.id === checkId) : null
  if (checkId && !listed) return { ok: false, error: 'no-check', snapshot, runstate }
  if (!checkId && !section?.check) return { ok: false, error: 'no-check', snapshot, runstate }
  const answerKey = checkId || sectionKey
  const options = checkId ? listed.options : section.check.options
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= options.length) {
    return { ok: false, error: 'bad-option', snapshot, runstate }
  }
  const prevAnswer = runstate?.answers?.[answerKey]
  if (prevAnswer === optionIndex) {
    const current = cloneSnapshot(snapshot)
    return {
      ok: true,
      unchanged: true,
      snapshot: current,
      runstate,
      publicEntry: current.modules[moduleId] || null,
    }
  }
  const retakeCount = (runstate?.retakeCount || 0) + (prevAnswer == null ? 0 : 1)
  const nextRun = {
    ...emptyRunstate(),
    ...runstate,
    answers: { ...(runstate?.answers || {}), [answerKey]: optionIndex },
    retakeCount,
  }
  const prev = cloneSnapshot(snapshot).modules[moduleId] || freshEntry(now)
  const entry = publicSlice({
    ...prev,
    ...scoreFields(module, nextRun),
    status: prev.status === 'completed' ? 'completed' : 'in-progress',
    progress: prev.progress ?? 0,
    sectionIndex: orderedKeys(module.sections).indexOf(sectionKey),
    retakeCount,
    lastOpenedAt: prev.lastOpenedAt || now,
    lastProgressAt: now,
    completedAt: prev.status === 'completed' ? prev.completedAt : null,
    source: 'shell',
  })
  return {
    ok: true,
    snapshot: patchModule(snapshot, moduleId, entry),
    runstate: nextRun,
    publicEntry: entry,
  }
}

export function revealSection({ snapshot, runstate, module, moduleId, sectionKey, now }) {
  const current = cloneSnapshot(snapshot)
  const nextRun = {
    ...emptyRunstate(),
    ...runstate,
    checkedSections: { ...(runstate?.checkedSections || {}), [sectionKey]: true },
  }
  const prev = current.modules[moduleId] || freshEntry(now)
  return {
    ok: true,
    snapshot: current,
    runstate: nextRun,
    publicEntry: prev,
  }
}

export function continueSection({ snapshot, runstate, module, moduleId, sectionKey, now }) {
  const keys = orderedKeys(module?.sections)
  const index = keys.indexOf(sectionKey)
  if (index < 0) return { ok: false, error: 'unknown-section', snapshot, runstate }
  const blocked = sectionAdvanceError(module, sectionKey, runstate)
  if (blocked) return { ok: false, error: blocked, snapshot, runstate }
  const continued = { ...(runstate?.continued || {}), [sectionKey]: true }
  const doneCount = keys.filter((key) => continued[key]).length
  const fraction = keys.length ? doneCount / keys.length : 0
  const nextIndex = Math.min(index + 1, keys.length - 1)
  const prev = cloneSnapshot(snapshot).modules[moduleId] || freshEntry(now)
  const finishing = doneCount === keys.length
  const alreadyDone = prev.status === 'completed'
  const cursor = withSectionCursor(runstate, finishing || alreadyDone ? index : nextIndex)
  const entry = publicSlice({
    ...prev,
    ...scoreFields(module, { ...runstate, continued }),
    status: alreadyDone || finishing ? 'completed' : 'in-progress',
    progress: alreadyDone
      ? Math.max(prev.progress ?? 0, isAccingo(module) ? accingoProgress(module, { ...runstate, continued, sectionIndex: cursor.sectionIndex, maxSectionIndex: cursor.maxSectionIndex }) : fraction)
      : (isAccingo(module) ? accingoProgress(module, { ...runstate, continued, sectionIndex: cursor.sectionIndex, maxSectionIndex: cursor.maxSectionIndex }) : fraction),
    sectionIndex: cursor.sectionIndex,
    retakeCount: runstate?.retakeCount || 0,
    lastOpenedAt: prev.lastOpenedAt || now,
    lastProgressAt: now,
    completedAt: alreadyDone ? prev.completedAt : (finishing ? now : null),
    source: 'shell',
  })
  const nextRun = {
    ...emptyRunstate(),
    ...runstate,
    continued,
    sectionIndex: cursor.sectionIndex,
    maxSectionIndex: cursor.maxSectionIndex,
    retakeCount: runstate?.retakeCount || 0,
  }
  return {
    ok: true,
    snapshot: patchModule(snapshot, moduleId, entry),
    runstate: nextRun,
    publicEntry: entry,
  }
}

export function allSectionsContinued(module, runstate) {
  const keys = orderedKeys(module?.sections)
  if (!keys.length) return false
  return keys.every((key) => runstate?.continued?.[key] === true)
}

export function canRetagAcademyModule(meta, actorId) {
  return meta?.active_type === ACADEMY_MODULE_TYPE && canMutateAcademyDoc(meta, actorId)
}

export function submitModuleReflection({ snapshot, runstate, module, moduleId, text, optionIndex, now }) {
  if (!module?.reflection) return { ok: false, error: 'no-reflection', snapshot, runstate }
  if (!allSectionsContinued(module, runstate)) {
    return { ok: false, error: 'sections-incomplete', snapshot, runstate }
  }
  if (module.reflection.kind === 'text' && !String(text || '').trim()) {
    return { ok: false, error: 'empty-reflection', snapshot, runstate }
  }
  if (module.reflection.kind === 'choice') {
    const count = module.reflection.options.length
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= count) {
      return { ok: false, error: 'empty-reflection', snapshot, runstate }
    }
  }
  const prev = cloneSnapshot(snapshot).modules[moduleId] || freshEntry(now)
  const entry = publicSlice({
    ...prev,
    ...scoreFields(module, runstate || emptyRunstate()),
    status: 'completed',
    progress: 1,
    retakeCount: runstate?.retakeCount || prev.retakeCount || 0,
    lastOpenedAt: prev.lastOpenedAt || now,
    lastProgressAt: now,
    completedAt: prev.status === 'completed' ? prev.completedAt : now,
    source: 'shell',
  })
  const nextRun = {
    ...emptyRunstate(),
    ...runstate,
    reflectionText: module.reflection.kind === 'text' ? String(text) : '',
    reflectionOption: module.reflection.kind === 'choice' ? optionIndex : null,
    reflectionSubmitted: true,
  }
  return {
    ok: true,
    snapshot: patchModule(snapshot, moduleId, entry),
    runstate: nextRun,
    publicEntry: entry,
  }
}

export function seriesRatio(moduleIds, snapshot) {
  const ids = moduleIds || []
  if (!ids.length) return 0
  const done = ids.filter((id) => snapshot?.modules?.[id]?.status === 'completed').length
  return done / ids.length
}

export function refreshSeriesEntry({ snapshot, seriesId, moduleIds, hasReflection, now }) {
  const ratio = seriesRatio(moduleIds, snapshot)
  const prev = cloneSnapshot(snapshot).series[seriesId]
  if (!prev && ratio === 0) return { snapshot: cloneSnapshot(snapshot), publicEntry: null }
  const base = prev || freshEntry(now)
  const alreadyDone = base.status === 'completed'
  const autoDone = ratio === 1 && !hasReflection
  const entry = publicSlice({
    ...base,
    status: alreadyDone || autoDone ? 'completed' : 'in-progress',
    progress: ratio,
    scoreRaw: null,
    scoreMin: null,
    scoreMax: null,
    scoreScaled: null,
    sectionIndex: null,
    retakeCount: base.retakeCount || 0,
    lastOpenedAt: base.lastOpenedAt || now,
    lastProgressAt: now,
    completedAt: alreadyDone ? base.completedAt : (autoDone ? now : null),
    source: 'shell',
  })
  return { snapshot: patchSeries(snapshot, seriesId, entry), publicEntry: entry }
}

export function submitSeriesReflection({ snapshot, series, seriesId, moduleIds, text, optionIndex, now }) {
  const ratio = seriesRatio(moduleIds, snapshot)
  if (ratio !== 1) return { ok: false, error: 'series-incomplete', ratio, snapshot, runstate: null }
  if (series?.reflection?.kind === 'text' && !String(text || '').trim()) {
    return { ok: false, error: 'empty-reflection', ratio, snapshot, runstate: null }
  }
  if (series?.reflection?.kind === 'choice') {
    const count = series.reflection.options.length
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= count) {
      return { ok: false, error: 'empty-reflection', ratio, snapshot, runstate: null }
    }
  }
  const prev = cloneSnapshot(snapshot).series[seriesId] || freshEntry(now)
  const entry = publicSlice({
    ...prev,
    status: 'completed',
    progress: 1,
    scoreRaw: null,
    scoreMin: null,
    scoreMax: null,
    scoreScaled: null,
    sectionIndex: null,
    retakeCount: prev.retakeCount || 0,
    lastOpenedAt: prev.lastOpenedAt || now,
    lastProgressAt: now,
    completedAt: prev.status === 'completed' ? prev.completedAt : now,
    source: 'shell',
  })
  const runstate = {
    reflectionText: series?.reflection?.kind === 'text' ? String(text) : '',
    reflectionOption: series?.reflection?.kind === 'choice' ? optionIndex : null,
    reflectionSubmitted: true,
  }
  return {
    ok: true,
    ratio,
    snapshot: patchSeries(snapshot, seriesId, entry),
    runstate,
    publicEntry: entry,
  }
}

export function academyStatement(objectId, entry) {
  if (!isUuid(objectId) || !entry || typeof entry !== 'object') return null
  const status = entry.status === 'completed' ? 'completed' : 'in-progress'
  const verb = status === 'completed' ? ACADEMY_VERBS.completed : ACADEMY_VERBS.progressed
  return {
    verb: { id: verb },
    object: objectId,
    result: {
      completion: status === 'completed',
      success: null,
      score: {
        raw: entry.scoreRaw ?? null,
        min: entry.scoreMin ?? null,
        max: entry.scoreMax ?? null,
        scaled: entry.scoreScaled ?? null,
      },
      extensions: {
        [ACADEMY_EXT.schema]: ACADEMY_SCHEMA,
        [ACADEMY_EXT.status]: status,
        [ACADEMY_EXT.progress]: clamp01(entry.progress ?? 0),
        [ACADEMY_EXT.sectionIndex]: entry.sectionIndex ?? null,
        [ACADEMY_EXT.retakeCount]: entry.retakeCount ?? 0,
      },
    },
  }
}

export function matchesTagFilters(tags, filters) {
  const list = Array.isArray(tags) ? tags : []
  for (const [categoryId, selected] of Object.entries(filters || {})) {
    if (!Array.isArray(selected) || !selected.length) continue
    const mine = list.filter((tag) => tag.categoryId === categoryId).map((tag) => tag.tagId)
    if (!selected.some((id) => mine.includes(id))) return false
  }
  return true
}

export function joinAcademyCatalog({ records, filters, query, snapshot, lang }) {
  const list = Array.isArray(records) ? records : []
  const needle = String(query || '').trim().toLowerCase()
  const cards = []
  for (const record of list) {
    if (!record?.id || record.kind !== 'module') continue
    if (!matchesTagFilters(record.tags, filters)) continue
    const name = localizedText(record.doc?.name, lang)
    if (needle && !name.toLowerCase().includes(needle)) continue
    const snap = snapshot?.modules?.[record.id] || null
    const required = (record.tags || []).some((tag) => tag.required === true)
    cards.push({
      id: record.id,
      kind: 'module',
      name,
      description: localizedText(record.doc?.description, lang),
      cover: record.doc?.cover || '',
      durationMinutes: record.doc?.durationMinutes ?? null,
      moduleCount: null,
      tags: record.tags || [],
      required,
      isNew: !snap,
      progress: snap?.progress ?? 0,
      status: snap?.status || null,
      owner: record.owner || null,
    })
  }
  return cards
}
