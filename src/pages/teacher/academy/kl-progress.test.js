import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { openModule } from '../../../utils/teacher-academy.js'
import {
  KL_MODULE_DATA_VERSION,
  dataVersionFromModuleVersion,
  deriveKlSectionProgress,
  klActivityScope,
  klModuleWrite,
  mergeKlProgressEntry,
  projectAcademyKlProgress,
  readKlModuleSource,
} from './kl-progress.js'

const ID = '1906f56a-e4c2-4260-abc5-fd144c914001'
const NOW = 1_700_000_000_000
const LATER = NOW + 5_000

function sections(count, summaryAt = -1) {
  return Array.from({ length: count }, (_, index) => ({
    id: `section-${index}`,
    isSummary: index === summaryAt,
  }))
}

function moduleDoc(version, sectionList, appId = 'module') {
  return {
    name: 'Module',
    state: {
      appId,
      version,
      config: { sections: sectionList },
    },
  }
}

function activity(index) {
  return { state: { highestVisitedSectionIndex: index, activeSectionIndex: index, widgetState: {} } }
}

describe('KL activity scope', () => {
  it('maps manifest 0.1.0 onto activity/0.1/module', () => {
    assert.equal(KL_MODULE_DATA_VERSION, '0.1')
    assert.equal(dataVersionFromModuleVersion('0.1.0'), KL_MODULE_DATA_VERSION)
    const scope = klActivityScope(ID, '0.1.0', 'module')
    assert.equal(scope.mismatch, false)
    assert.equal(scope.dataVersion, '0.1')
    assert.equal(scope.configDataVersion, '0.1')
    assert.equal(scope.scope, `academy-kl-player/${ID}/activity/0.1/module/${ID}`)
  })

  it('keeps the manifest path when config major.minor differs', () => {
    const scope = klActivityScope(ID, '0.2.3', 'module')
    assert.equal(scope.mismatch, true)
    assert.equal(scope.dataVersion, KL_MODULE_DATA_VERSION)
    assert.equal(scope.configDataVersion, '0.2')
    assert.equal(scope.scope, `academy-kl-player/${ID}/activity/0.1/module/${ID}`)
    const later = klActivityScope(ID, '1.10.0')
    assert.equal(later.mismatch, true)
    assert.equal(later.configDataVersion, '1.10')
    assert.equal(later.scope, `academy-kl-player/${ID}/activity/0.1/module/${ID}`)
  })

  it('still watches the manifest path when config version has no major.minor', () => {
    for (const version of [undefined, null, '', '1', 'nope', 'v0.1.0']) {
      const scope = klActivityScope(ID, version)
      assert.equal(scope.scope, `academy-kl-player/${ID}/activity/0.1/module/${ID}`, String(version))
      assert.equal(scope.dataVersion, KL_MODULE_DATA_VERSION)
      assert.equal(scope.configDataVersion, null)
      assert.equal(scope.mismatch, true)
    }
  })
})

describe('KL section progress', () => {
  it('reads raw config sections, including a summary the parser would drop', () => {
    const raw = moduleDoc('0.1.0', sections(3, 2))
    const source = readKlModuleSource(raw)
    assert.equal(source.version, '0.1.0')
    assert.equal(source.sections.length, 3)
    assert.equal(source.sections[2].isSummary, true)
  })

  it('counts config.sections and ignores translations', () => {
    const raw = {
      state: {
        appId: 'module',
        version: '0.1.0',
        config: {
          sections: sections(3),
          translations: {
            th: { sections: sections(5) },
            es: { sections: sections(8) },
          },
        },
      },
    }
    const source = readKlModuleSource(raw)
    assert.equal(source.sections.length, 3)
    const derived = deriveKlSectionProgress(source.sections, { highestVisitedSectionIndex: 1 })
    assert.equal(derived.sectionCount, 3)
    assert.equal(derived.progress, 0.5)
    assert.equal(derived.status, 'in-progress')
  })

  it('maps the highest visited index onto 0–1 progress', () => {
    const derived = deriveKlSectionProgress(sections(3), { highestVisitedSectionIndex: 1 })
    assert.equal(derived.ok, true)
    assert.equal(derived.sectionIndex, 1)
    assert.equal(derived.sectionCount, 3)
    assert.equal(derived.progress, 0.5)
    assert.equal(derived.status, 'in-progress')
  })

  it('completes on the last section', () => {
    const derived = deriveKlSectionProgress(sections(3), { highestVisitedSectionIndex: 2 })
    assert.equal(derived.completed, true)
    assert.equal(derived.progress, 1)
    assert.equal(derived.status, 'completed')
    assert.equal(deriveKlSectionProgress(sections(1), { highestVisitedSectionIndex: 0 }).status, 'completed')
  })

  it('completes when the visited section is a summary, before the last section', () => {
    const derived = deriveKlSectionProgress(sections(4, 1), { highestVisitedSectionIndex: 1 })
    assert.equal(derived.completed, true)
    assert.equal(derived.progress, 1)
    assert.equal(derived.sectionIndex, 1)
    assert.equal(derived.sectionCount, 4)
  })

  it('clamps a negative index and an index past the last section', () => {
    const low = deriveKlSectionProgress(sections(4), { highestVisitedSectionIndex: -3 })
    assert.equal(low.ok, true)
    assert.equal(low.sectionIndex, 0)
    assert.equal(low.progress, 0)
    assert.equal(low.status, 'in-progress')
    const high = deriveKlSectionProgress(sections(4), { highestVisitedSectionIndex: 99 })
    assert.equal(high.ok, true)
    assert.equal(high.sectionIndex, 3)
    assert.equal(high.progress, 1)
    assert.equal(high.status, 'completed')
  })

  it('ignores a missing or empty activity document', () => {
    const list = sections(3)
    assert.equal(deriveKlSectionProgress(list, null).reason, 'missing-doc')
    assert.equal(deriveKlSectionProgress(list, {}).reason, 'missing-doc')
    assert.equal(deriveKlSectionProgress(list, { widgetState: {} }).reason, 'missing-doc')
    assert.equal(deriveKlSectionProgress([], { highestVisitedSectionIndex: 0 }).reason, 'no-sections')
    assert.equal(deriveKlSectionProgress(null, activity(0).state).reason, 'no-sections')
  })
})

describe('KL snapshot projection', () => {
  it('writes the snapshot fields the library already reads', () => {
    const projected = projectAcademyKlProgress({
      snapshot: { schemaVersion: 1, modules: {}, series: { 'series-1': { status: 'in-progress', progress: 0 } } },
      moduleId: ID,
      moduleDoc: moduleDoc('0.1.0', sections(4)),
      activityDoc: activity(1),
      now: NOW,
    })
    assert.equal(projected.ok, true)
    assert.equal(projected.unchanged, false)
    assert.equal(projected.scope, `academy-kl-player/${ID}/activity/0.1/module/${ID}`)
    assert.deepEqual(projected.entry, {
      status: 'in-progress',
      progress: 1 / 3,
      scoreRaw: null,
      scoreMin: null,
      scoreMax: null,
      scoreScaled: null,
      sectionIndex: 1,
      retakeCount: 0,
      lastOpenedAt: NOW,
      lastProgressAt: NOW,
      completedAt: null,
      source: 'kl-player',
    })
    assert.equal(projected.snapshot.series['series-1'].status, 'in-progress')
    assert.equal(projected.snapshot.modules[ID], projected.entry)
  })

  it('keeps a completed status and a higher progress', () => {
    const previous = {
      status: 'completed',
      progress: 1,
      scoreRaw: 2,
      scoreMin: 0,
      scoreMax: 3,
      scoreScaled: 2 / 3,
      sectionIndex: 3,
      retakeCount: 2,
      lastOpenedAt: NOW,
      lastProgressAt: NOW,
      completedAt: NOW,
      source: 'shell',
    }
    const projected = projectAcademyKlProgress({
      snapshot: { schemaVersion: 1, modules: { [ID]: previous }, series: {} },
      moduleId: ID,
      moduleDoc: moduleDoc('0.1.0', sections(4, 3)),
      activityDoc: activity(0),
      now: LATER,
    })
    assert.equal(projected.unchanged, true)
    assert.equal(projected.entry.status, 'completed')
    assert.equal(projected.entry.progress, 1)
    assert.equal(projected.entry.completedAt, NOW)
    assert.equal(projected.entry.sectionIndex, 3)
    assert.equal(projected.entry.retakeCount, 2)
    assert.equal(projected.entry.scoreScaled, 2 / 3)
    assert.equal(projected.entry.source, 'shell')
    assert.equal(projected.snapshot.modules[ID], previous)

    const partial = mergeKlProgressEntry(
      { status: 'in-progress', progress: 0.8, sectionIndex: 2, completedAt: null, source: 'shell', retakeCount: 1 },
      { progress: 0.25, status: 'in-progress', sectionIndex: 1 },
      LATER,
    )
    assert.equal(partial.changed, false)
    assert.equal(partial.entry.progress, 0.8)
    assert.equal(partial.entry.sectionIndex, 2)
    assert.equal(partial.entry.status, 'in-progress')
    assert.equal(partial.entry.retakeCount, 1)
  })

  it('does not write when the activity doc is missing or empty', () => {
    const previous = { status: 'in-progress', progress: 0.4, sectionIndex: 1, completedAt: null }
    const snapshot = { schemaVersion: 1, modules: { [ID]: previous }, series: {} }
    for (const activityDoc of [null, {}, { state: {} }, { state: { widgetState: {} } }]) {
      const projected = projectAcademyKlProgress({
        snapshot,
        moduleId: ID,
        moduleDoc: moduleDoc('0.1.0', sections(3)),
        activityDoc,
        now: LATER,
      })
      assert.equal(projected.ok, false)
      assert.equal(projected.reason, 'missing-doc')
      assert.equal(projected.snapshot, snapshot)
    }
  })

  it('projects on the manifest path when config major.minor differs or is unreadable', () => {
    const derived = projectAcademyKlProgress({
      snapshot: { schemaVersion: 1, modules: {}, series: {} },
      moduleId: ID,
      moduleDoc: moduleDoc('0.2.0', sections(2)),
      activityDoc: activity(1),
      now: NOW,
    })
    assert.equal(derived.ok, true)
    assert.equal(derived.mismatch, true)
    assert.equal(derived.dataVersion, KL_MODULE_DATA_VERSION)
    assert.equal(derived.configDataVersion, '0.2')
    assert.equal(derived.scope, `academy-kl-player/${ID}/activity/0.1/module/${ID}`)
    assert.equal(derived.entry.status, 'completed')
    assert.equal(derived.entry.progress, 1)

    const unreadable = projectAcademyKlProgress({
      snapshot: { schemaVersion: 1, modules: { [ID]: { status: 'in-progress', progress: 0.2 } }, series: {} },
      moduleId: ID,
      moduleDoc: moduleDoc('1', sections(2)),
      activityDoc: activity(1),
      now: NOW,
    })
    assert.equal(unreadable.ok, true)
    assert.equal(unreadable.mismatch, true)
    assert.equal(unreadable.configDataVersion, null)
    assert.equal(unreadable.scope, `academy-kl-player/${ID}/activity/0.1/module/${ID}`)
    assert.equal(unreadable.entry.status, 'completed')
  })

  it('reads the player payload from activityDoc.state', () => {
    const envelope = projectAcademyKlProgress({
      snapshot: { schemaVersion: 1, modules: {}, series: {} },
      moduleId: ID,
      moduleDoc: moduleDoc('0.1.0', sections(4)),
      activityDoc: {
        state: {
          highestVisitedSectionIndex: 1,
          activeSectionIndex: 0,
          widgetState: { answer: 'hidden' },
          studentId: 'student-1',
          studentName: 'A Teacher',
        },
      },
      now: NOW,
    })
    assert.equal(envelope.ok, true)
    assert.equal(envelope.entry.sectionIndex, 1)
    assert.equal(envelope.entry.progress, 1 / 3)
    assert.equal(envelope.entry.status, 'in-progress')
    assert.equal(Object.hasOwn(envelope.entry, 'studentId'), false)
    assert.equal(Object.hasOwn(envelope.entry, 'widgetState'), false)

    const rootIndex = projectAcademyKlProgress({
      snapshot: { schemaVersion: 1, modules: {}, series: {} },
      moduleId: ID,
      moduleDoc: moduleDoc('0.1.0', sections(4)),
      activityDoc: { highestVisitedSectionIndex: 1 },
      now: NOW,
    })
    assert.equal(rootIndex.ok, false)
    assert.equal(rootIndex.reason, 'missing-doc')
  })

  it('sets completedAt once and leaves it on the next completed projection', () => {
    const first = mergeKlProgressEntry(
      { status: 'in-progress', progress: 0.5, sectionIndex: 1, completedAt: null, source: 'kl-player', retakeCount: 0 },
      { progress: 1, status: 'completed', sectionIndex: 2 },
      NOW,
    )
    assert.equal(first.changed, true)
    assert.equal(first.entry.status, 'completed')
    assert.equal(first.entry.completedAt, NOW)

    const second = mergeKlProgressEntry(
      first.entry,
      { progress: 1, status: 'completed', sectionIndex: 2 },
      LATER,
    )
    assert.equal(second.changed, false)
    assert.equal(second.entry.completedAt, NOW)
    assert.equal(second.entry.source, 'kl-player')
    assert.equal(second.entry.lastProgressAt, NOW)
  })

  it('writes index 0 from an openModule stub without completing when more sections remain', () => {
    const opened = openModule({ schemaVersion: 1, modules: {}, series: {} }, ID, NOW)
    const stub = opened.snapshot.modules[ID]
    assert.equal(stub.sectionIndex, null)
    assert.equal(stub.source, 'shell')
    assert.equal(stub.status, 'in-progress')

    const projected = projectAcademyKlProgress({
      snapshot: opened.snapshot,
      moduleId: ID,
      moduleDoc: moduleDoc('0.1.0', sections(4)),
      activityDoc: activity(0),
      now: LATER,
    })
    assert.equal(projected.ok, true)
    assert.equal(projected.unchanged, false)
    assert.equal(projected.entry.sectionIndex, 0)
    assert.equal(projected.entry.status, 'in-progress')
    assert.equal(projected.entry.progress, 0)
    assert.equal(projected.entry.completedAt, null)
    assert.equal(projected.entry.source, 'kl-player')
  })

  it('merges a stale derived value into the fresh entry without downgrading or rewriting other modules', () => {
    const other = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
    const fresh = {
      schemaVersion: 1,
      modules: {
        [ID]: {
          status: 'in-progress',
          progress: 0.9,
          sectionIndex: 3,
          completedAt: null,
          source: 'shell',
          retakeCount: 1,
          scoreScaled: 0.5,
          lastOpenedAt: NOW,
          lastProgressAt: NOW,
        },
        [other]: {
          status: 'completed',
          progress: 1,
          sectionIndex: 4,
          completedAt: NOW,
          source: 'shell',
        },
      },
      series: { 'series-1': { status: 'in-progress', progress: 0.4 } },
    }
    const write = klModuleWrite(
      fresh,
      ID,
      { progress: 0.25, status: 'in-progress', sectionIndex: 1 },
      LATER,
    )
    assert.equal(write.changed, false)
    assert.equal(write.entry.progress, 0.9)
    assert.equal(write.entry.sectionIndex, 3)
    assert.equal(write.entry.status, 'in-progress')
    assert.equal(write.entry.source, 'shell')
    assert.equal(write.entry.scoreScaled, 0.5)
    assert.equal(write.entry.retakeCount, 1)
    assert.deepEqual(Object.keys(write.snapshot.modules), [ID])
    assert.equal(write.snapshot.modules[other], undefined)
    assert.deepEqual(write.snapshot.series, {})
  })
})
