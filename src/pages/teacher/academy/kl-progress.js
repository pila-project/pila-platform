/**
 * Project a Know Learning module activity document into academy-progress:v1.
 *
 * Nikki's getModuleProgress (instructionCompletion.ts) weights non-summary
 * sections by estimated minutes and half-credits answered quizzes on the
 * current section. That needs her widget tree, so it is not portable here.
 * Progress is highestVisitedSectionIndex against the raw config sections,
 * including sections with isSummary. readAccingoModule drops those, so the
 * parsed lesson is the wrong count.
 *
 * Reaching a section with isSummary, or the last section, is complete.
 * A later projection never clears completed or lowers progress.
 *
 * Her player writes activity/{major.minor} from the running manifest, not
 * from the published config. module.version is 0.1.0 in
 * accingo/pila-teacher-academy-published src/APP_MANIFESTS.ts, and getDataVersion in
 * accingo/pila-teacher-academy-published src/utils.ts drops the patch, so the document is
 * activity/0.1/…. KL_MODULE_DATA_VERSION is that path. A different
 * config major.minor is reported as a mismatch; the watch stays on the
 * manifest path, which is the document she writes.
 *
 * Academy has no module retake or restart control. The review line about
 * retaking questions is the shell player, which KL mode does not mount.
 * Nothing here clears her activity document.
 */

export const KL_PROGRESS_WRITE_DELAY_MS = 1500

/**
 * activity/{major.minor} her layout opens. Matches module.version 0.1.0 in
 * accingo/pila-teacher-academy-published src/APP_MANIFESTS.ts via getDataVersion
 * (accingo/pila-teacher-academy-published src/utils.ts), which keeps major.minor only.
 */
export const KL_MODULE_DATA_VERSION = '0.1'

export function dataVersionFromModuleVersion(version) {
  if (typeof version !== 'string') return null
  const parts = version.trim().split('.')
  if (parts.length < 2) return null
  const major = parts[0]
  const minor = parts[1]
  if (!/^\d+$/.test(major) || !/^\d+$/.test(minor)) return null
  return `${major}.${minor}`
}

export function klActivityScope(moduleId, version, appId = 'module') {
  const configDataVersion = dataVersionFromModuleVersion(version)
  const segment = typeof appId === 'string' && /^[A-Za-z0-9_-]+$/.test(appId) ? appId : 'module'
  const dataVersion = KL_MODULE_DATA_VERSION
  return {
    scope: `academy-kl-player/${moduleId}/activity/${dataVersion}/${segment}/${moduleId}`,
    dataVersion,
    configDataVersion,
    appId: segment,
    mismatch: configDataVersion !== dataVersion,
  }
}

/** Active KL module document: { name, picture, state: { version, appId, config } }. */
export function readKlModuleSource(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { version: null, appId: null, sections: [] }
  }
  const nested = raw.state
  const published = nested && typeof nested === 'object' && !Array.isArray(nested)
    && (nested.config || nested.version || nested.appId)
    ? nested
    : raw
  const config = published.config && typeof published.config === 'object' && !Array.isArray(published.config)
    ? published.config
    : published
  return {
    version: typeof published.version === 'string' ? published.version : null,
    appId: typeof published.appId === 'string' ? published.appId : null,
    sections: Array.isArray(config.sections) ? config.sections : [],
  }
}

export function deriveKlSectionProgress(sections, activity) {
  if (!Array.isArray(sections) || sections.length === 0) {
    return { ok: false, reason: 'no-sections' }
  }
  if (!activity || typeof activity !== 'object' || Array.isArray(activity)) {
    return { ok: false, reason: 'missing-doc' }
  }
  const rawIndex = activity.highestVisitedSectionIndex
  if (typeof rawIndex !== 'number' || !Number.isFinite(rawIndex)) {
    return { ok: false, reason: 'missing-doc' }
  }
  const sectionCount = sections.length
  const sectionIndex = Math.min(Math.max(0, Math.floor(rawIndex)), sectionCount - 1)
  const current = sections[sectionIndex]
  const completed = current?.isSummary === true || sectionIndex === sectionCount - 1
  const progress = completed ? 1 : sectionIndex / (sectionCount - 1)
  return {
    ok: true,
    sectionIndex,
    sectionCount,
    progress,
    status: completed ? 'completed' : 'in-progress',
    completed,
  }
}

function blankEntry(now) {
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
    source: 'kl-player',
  }
}

export function mergeKlProgressEntry(previous, derived, now) {
  const prev = previous && typeof previous === 'object' ? previous : null
  const prevProgress = Number(prev?.progress)
  const progress = Math.max(Number.isFinite(prevProgress) ? prevProgress : 0, derived.progress)
  const status = prev?.status === 'completed' || derived.status === 'completed'
    ? 'completed'
    : 'in-progress'
  const prevSection = Number(prev?.sectionIndex)
  const derivedSection = Number(derived.sectionIndex)
  const sectionCandidates = []
  if (Number.isFinite(prevSection) && prevSection >= 0) sectionCandidates.push(prevSection)
  if (Number.isFinite(derivedSection) && derivedSection >= 0) sectionCandidates.push(derivedSection)
  const sectionIndex = sectionCandidates.length ? Math.max(...sectionCandidates) : null
  const completedAt = status === 'completed'
    ? (prev?.status === 'completed' && prev.completedAt != null ? prev.completedAt : now)
    : null
  const changed = !prev
    || prev.status !== status
    || Number(prev.progress) !== progress
    || (prev.sectionIndex ?? null) !== sectionIndex
    || (prev.completedAt ?? null) !== completedAt
  const entry = {
    ...blankEntry(now),
    ...(prev || {}),
    status,
    progress,
    sectionIndex,
    retakeCount: prev?.retakeCount || 0,
    lastOpenedAt: prev?.lastOpenedAt || now,
    lastProgressAt: changed ? now : (prev?.lastProgressAt ?? null),
    completedAt,
    source: !changed && prev?.source ? prev.source : 'kl-player',
  }
  return { entry, changed }
}

/**
 * Merge derived progress into the entry just loaded for this module.
 * The returned snapshot has only that module, so saveSnapshot cannot
 * write a stale copy of every other module.
 */
export function klModuleWrite(freshSnapshot, moduleId, derived, now) {
  const merged = mergeKlProgressEntry(freshSnapshot?.modules?.[moduleId], derived, now)
  return {
    entry: merged.entry,
    changed: merged.changed,
    snapshot: {
      schemaVersion: 1,
      modules: { [moduleId]: merged.entry },
      series: {},
    },
  }
}

/**
 * activityDoc is the watched active document. The player payload is activityDoc.state.
 * moduleDoc is Agent.state(moduleId): config and version live on moduleDoc.state.
 */
export function projectAcademyKlProgress({ snapshot, moduleId, moduleDoc, activityDoc, now }) {
  const source = readKlModuleSource(moduleDoc)
  const scope = klActivityScope(moduleId, source.version, source.appId || 'module')
  const activity = activityDoc && typeof activityDoc === 'object' ? activityDoc.state : undefined
  const derived = deriveKlSectionProgress(source.sections, activity)
  if (!derived.ok) {
    return {
      ok: false,
      reason: derived.reason,
      version: source.version,
      dataVersion: scope.dataVersion,
      configDataVersion: scope.configDataVersion,
      scope: scope.scope,
      mismatch: scope.mismatch,
      snapshot,
      derived: null,
    }
  }
  const previous = snapshot?.modules?.[moduleId]
  const { entry, changed } = mergeKlProgressEntry(previous, derived, now)
  const base = {
    ok: true,
    unchanged: !changed,
    entry,
    scope: scope.scope,
    dataVersion: scope.dataVersion,
    configDataVersion: scope.configDataVersion,
    mismatch: scope.mismatch,
    derived,
    version: source.version,
  }
  if (!changed) return { ...base, snapshot }
  return {
    ...base,
    snapshot: {
      schemaVersion: snapshot?.schemaVersion || 1,
      modules: { ...(snapshot?.modules || {}), [moduleId]: entry },
      series: { ...(snapshot?.series || {}) },
    },
  }
}
