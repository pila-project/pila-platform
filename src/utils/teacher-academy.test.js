import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readAccingoModule } from './accingo-module.js'
import {
  ACADEMY_EXT,
  ACADEMY_MODULE_TYPE,
  ACADEMY_SERIES_TYPE,
  ACADEMY_VERBS,
  academyPlayNamespace,
  academyStatement,
  acceptAcademyRecord,
  answerCheck,
  assertOwnAcademyWrite,
  canMutateAcademyDoc,
  canOpenAcademyRole,
  canRetagAcademyModule,
  continueSection,
  emptyRunstate,
  emptySnapshot,
  scoreFields,
  joinAcademyCatalog,
  needsReview,
  openModule,
  seriesRatio,
  submitModuleReflection,
  submitSeriesReflection,
  validateAcademyDocument,
} from './teacher-academy.js'

const MOD = '11111111-1111-4111-8111-111111111111'
const MOD_B = '22222222-2222-4222-8222-222222222222'
const SERIES = '33333333-3333-4333-8333-333333333333'
const RELATED = '44444444-4444-4444-8444-444444444444'

function lang(en) {
  return { en, th: `${en} TH` }
}

function check(prompt, correctIndex = 0) {
  return {
    prompt: lang(prompt),
    options: [
      { text: lang('Right'), correct: correctIndex === 0 },
      { text: lang('Wrong'), correct: correctIndex === 1 },
    ],
  }
}

function section(title, withCheck = true) {
  return {
    title: lang(title),
    blocks: [
      { type: 'heading', text: lang(title) },
      { type: 'paragraph', text: lang('Body') },
      { type: 'callout', kind: 'insight', text: lang('Insight') },
      { type: 'figure', url: 'https://cdn.example/figure.png', caption: lang('Figure') },
      { type: 'video', url: 'https://cdn.example/video.mp4', caption: lang('Video') },
    ],
    check: withCheck ? check(title) : null,
  }
}

function moduleDoc(overrides = {}) {
  return {
    name: lang('Differentiated Instruction'),
    description: lang('A module'),
    cover: 'https://cdn.example/cover.jpg',
    durationMinutes: 45,
    sections: { 0: section('One'), 1: section('Two') },
    downloads: [{ name: lang('Slides'), url: 'https://cdn.example/slides.pdf' }],
    related: [RELATED],
    tools: [{ name: lang('Math Item Builder'), url: 'https://create.example/math' }],
    reflection: { kind: 'text', prompt: lang('What will you try?') },
    ...overrides,
  }
}

describe('academy contract', () => {
  it('accepts a module and a series in the agreed shape', () => {
    const moduleResult = validateAcademyDocument('module', moduleDoc())
    assert.equal(moduleResult.ok, true)
    assert.equal(moduleResult.value.schemaVersion, 1)
    assert.equal(moduleResult.value.sections['0'].check.options[0].correct, true)
    assert.equal(moduleResult.value.tools[0].url, 'https://create.example/math')

    const seriesResult = validateAcademyDocument('series', {
      name: lang('AI Literacy'),
      description: lang('A series'),
      cover: '',
      modules: { 0: { id: MOD }, 1: { id: MOD_B } },
      downloads: [],
      reflection: {
        kind: 'choice',
        prompt: lang('Which goal?'),
        options: [{ text: lang('A') }, { text: lang('B') }],
      },
    })
    assert.equal(seriesResult.ok, true)
    assert.deepEqual(
      Object.values(seriesResult.value.modules).map((entry) => entry.id),
      [MOD, MOD_B],
    )
  })

  it('rejects bad blocks, checks, and reflections', () => {
    const badBlock = validateAcademyDocument('module', moduleDoc({
      sections: {
        0: {
          title: lang('One'),
          blocks: [{ type: 'html', text: lang('nope') }],
          check: null,
        },
      },
      reflection: null,
    }))
    assert.equal(badBlock.ok, false)
    assert.ok(badBlock.errors.includes('block-type'))

    const twoCorrect = validateAcademyDocument('module', moduleDoc({
      sections: {
        0: {
          title: lang('One'),
          blocks: [],
          check: {
            prompt: lang('Q'),
            options: [
              { text: lang('A'), correct: true },
              { text: lang('B'), correct: true },
            ],
          },
        },
      },
    }))
    assert.equal(twoCorrect.ok, false)
    assert.ok(twoCorrect.errors.includes('check-correct'))

    const oneOption = validateAcademyDocument('module', moduleDoc({
      sections: {
        0: {
          title: lang('One'),
          blocks: [],
          check: { prompt: lang('Q'), options: [{ text: lang('A'), correct: true }] },
        },
      },
    }))
    assert.equal(oneOption.ok, false)
    assert.ok(oneOption.errors.includes('check-options'))

    const badReflection = validateAcademyDocument('module', moduleDoc({
      reflection: { kind: 'essay', prompt: lang('Nope') },
    }))
    assert.equal(badReflection.ok, false)
    assert.ok(badReflection.errors.includes('reflection-kind'))

    const shortChoice = validateAcademyDocument('series', {
      name: lang('Series'),
      description: { en: '' },
      cover: '',
      modules: { 0: { id: MOD }, 1: { id: MOD } },
      reflection: { kind: 'choice', prompt: lang('Q'), options: [{ text: lang('Only') }] },
    })
    assert.equal(shortChoice.ok, false)
    assert.ok(shortChoice.errors.includes('series-duplicate'))
    assert.ok(shortChoice.errors.includes('reflection-options'))

    const noEnglish = validateAcademyDocument('module', moduleDoc({ name: { th: 'เท่านั้น' } }))
    assert.equal(noEnglish.ok, false)
    assert.ok(noEnglish.errors.includes('name'))

    assert.equal(ACADEMY_MODULE_TYPE.includes('assignment'), false)
    assert.equal(ACADEMY_SERIES_TYPE.includes('assignment'), false)
  })
})

describe('academy catalog join', () => {
  const catA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const catB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  const tag1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  const tag2 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  const tag3 = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

  const records = [
    {
      id: SERIES,
      kind: 'series',
      owner: 'teacher-1',
      doc: { name: lang('AI Literacy Fundamentals'), description: lang('Series'), modules: { 0: { id: MOD } } },
      tags: [{ categoryId: catA, tagId: tag1 }],
    },
    {
      id: MOD,
      kind: 'module',
      owner: 'teacher-1',
      doc: { name: lang('Hidden child'), description: lang(''), durationMinutes: 10 },
      tags: [{ categoryId: catA, tagId: tag1 }],
    },
    {
      id: MOD_B,
      kind: 'module',
      owner: 'teacher-2',
      doc: { name: lang('Data-Driven Decision Making'), description: lang('Standalone'), durationMinutes: 45 },
      tags: [
        { categoryId: catA, tagId: tag1 },
        { categoryId: catB, tagId: tag2, required: true },
      ],
    },
    {
      id: RELATED,
      kind: 'module',
      owner: 'teacher-2',
      doc: { name: lang('Science lab report'), description: lang('Other'), durationMinutes: 15 },
      tags: [{ categoryId: catA, tagId: tag3 }],
    },
  ]

  it('lists modules only, ORs within a category, ANDs across, and searches titles', () => {
    const orWithin = joinAcademyCatalog({
      records,
      filters: { [catA]: [tag1, tag3] },
      query: '',
      snapshot: emptySnapshot(),
      lang: 'en',
    })
    assert.deepEqual(orWithin.map((card) => card.id).sort(), [MOD, MOD_B, RELATED].sort())
    assert.equal(orWithin.some((card) => card.id === SERIES), false)

    const andAcross = joinAcademyCatalog({
      records,
      filters: { [catA]: [tag1], [catB]: [tag2] },
      query: '',
      snapshot: emptySnapshot(),
      lang: 'en',
    })
    assert.deepEqual(andAcross.map((card) => card.id), [MOD_B])

    const searched = joinAcademyCatalog({
      records,
      filters: {},
      query: 'science lab',
      snapshot: emptySnapshot(),
      lang: 'en',
    })
    assert.deepEqual(searched.map((card) => card.id), [RELATED])

    const thai = joinAcademyCatalog({
      records,
      filters: {},
      query: 'report th',
      snapshot: emptySnapshot(),
      lang: 'th',
    })
    assert.deepEqual(thai.map((card) => card.id), [RELATED])
  })

  it('marks New from a missing snapshot entry and Required from the tag', () => {
    const snapshot = emptySnapshot()
    snapshot.modules[RELATED] = { status: 'in-progress', progress: 0.5 }
    const cards = joinAcademyCatalog({ records, filters: {}, query: '', snapshot, lang: 'en' })
    const standalone = cards.find((card) => card.id === MOD_B)
    const started = cards.find((card) => card.id === RELATED)
    assert.equal(standalone.isNew, true)
    assert.equal(standalone.required, true)
    assert.equal(started.isNew, false)
    assert.equal(started.required, false)
    assert.equal(started.progress, 0.5)
  })
})

describe('academy progress', () => {
  const validated = validateAcademyDocument('module', moduleDoc()).value
  const noReflection = validateAcademyDocument('module', moduleDoc({ reflection: null })).value
  const now = 1_700_000_000_000

  it('opens at progress 0 and does not invent a percent', () => {
    const opened = openModule(emptySnapshot(), MOD, now)
    assert.equal(opened.created, true)
    assert.equal(opened.publicEntry.status, 'in-progress')
    assert.equal(opened.publicEntry.progress, 0)
    assert.equal(opened.publicEntry.scoreScaled, null)
    assert.equal(opened.publicEntry.sectionIndex, null)
  })

  it('blocks continue until a check is answered, then advances a wrong answer', () => {
    const opened = openModule(emptySnapshot(), MOD, now)
    const blocked = continueSection({
      snapshot: opened.snapshot,
      runstate: emptyRunstate(),
      module: validated,
      moduleId: MOD,
      sectionKey: '0',
      now,
    })
    assert.equal(blocked.ok, false)
    assert.equal(blocked.error, 'check-required')

    const answered = answerCheck({
      snapshot: opened.snapshot,
      runstate: emptyRunstate(),
      module: validated,
      moduleId: MOD,
      sectionKey: '0',
      optionIndex: 1,
      now,
    })
    assert.equal(answered.ok, true)
    assert.equal(answered.publicEntry.scoreScaled, 0)
    const moved = continueSection({
      snapshot: answered.snapshot,
      runstate: answered.runstate,
      module: validated,
      moduleId: MOD,
      sectionKey: '0',
      now,
    })
    assert.equal(moved.ok, true)
    assert.equal(moved.runstate.continued['0'], true)
    assert.equal(moved.runstate.sectionIndex, 1)
    assert.equal(moved.publicEntry.progress, 0.5)
    assert.equal(moved.publicEntry.status, 'in-progress')
  })

  it('does not complete a module from a reflection before every section is continued', () => {
    const opened = openModule(emptySnapshot(), MOD, now)
    const early = submitModuleReflection({
      snapshot: opened.snapshot,
      runstate: emptyRunstate(),
      module: validated,
      moduleId: MOD,
      text: 'too soon',
      now,
    })
    assert.equal(early.ok, false)
    assert.equal(early.error, 'sections-incomplete')
    assert.equal(early.snapshot.modules[MOD].status, 'in-progress')
    assert.equal(early.snapshot.modules[MOD].progress, 0)
    assert.equal(early.snapshot.modules[MOD].completedAt, null)
    assert.equal(early.runstate.reflectionSubmitted, false)
    assert.equal(JSON.stringify(early.snapshot).includes('too soon'), false)
  })

  it('completes a module by reflection, keeping the answer text off the snapshot', () => {
    let snapshot = openModule(emptySnapshot(), MOD, now).snapshot
    let runstate = emptyRunstate()
    for (const key of ['0', '1']) {
      const answered = answerCheck({
        snapshot, runstate, module: validated, moduleId: MOD, sectionKey: key, optionIndex: 0, now,
      })
      snapshot = answered.snapshot
      runstate = answered.runstate
      const moved = continueSection({
        snapshot, runstate, module: validated, moduleId: MOD, sectionKey: key, now,
      })
      snapshot = moved.snapshot
      runstate = moved.runstate
    }
    assert.equal(snapshot.modules[MOD].status, 'completed')
    assert.equal(snapshot.modules[MOD].progress, 1)
    const secret = 'SECRET_REFLECTION_TEXT'
    const submitted = submitModuleReflection({
      snapshot, runstate, module: validated, moduleId: MOD, text: secret, now,
    })
    assert.equal(submitted.ok, true)
    assert.equal(submitted.publicEntry.status, 'completed')
    assert.equal(submitted.publicEntry.progress, 1)
    assert.equal(JSON.stringify(submitted.snapshot).includes(secret), false)
    assert.equal(submitted.runstate.reflectionText, secret)
    assert.equal(needsReview(validated, submitted.runstate), false)
  })

  it('completes a module on the last section when it has no reflection', () => {
    let snapshot = openModule(emptySnapshot(), MOD, now).snapshot
    let runstate = emptyRunstate()
    let last
    for (const key of ['0', '1']) {
      const answered = answerCheck({
        snapshot, runstate, module: noReflection, moduleId: MOD, sectionKey: key, optionIndex: 0, now,
      })
      last = continueSection({
        snapshot: answered.snapshot,
        runstate: answered.runstate,
        module: noReflection,
        moduleId: MOD,
        sectionKey: key,
        now,
      })
      snapshot = last.snapshot
      runstate = last.runstate
    }
    assert.equal(last.publicEntry.status, 'completed')
    assert.equal(last.publicEntry.completedAt, now)
    assert.equal(last.publicEntry.progress, 1)
  })

  it('lets a retake lower the score without clearing completion', () => {
    let snapshot = openModule(emptySnapshot(), MOD, now).snapshot
    let runstate = emptyRunstate()
    for (const key of ['0', '1']) {
      const answered = answerCheck({
        snapshot, runstate, module: noReflection, moduleId: MOD, sectionKey: key, optionIndex: 0, now,
      })
      const moved = continueSection({
        snapshot: answered.snapshot,
        runstate: answered.runstate,
        module: noReflection,
        moduleId: MOD,
        sectionKey: key,
        now,
      })
      snapshot = moved.snapshot
      runstate = moved.runstate
    }
    assert.equal(snapshot.modules[MOD].status, 'completed')
    assert.equal(snapshot.modules[MOD].scoreScaled, 1)
    const retake = answerCheck({
      snapshot,
      runstate,
      module: noReflection,
      moduleId: MOD,
      sectionKey: '0',
      optionIndex: 1,
      now: now + 5,
    })
    assert.equal(retake.publicEntry.status, 'completed')
    assert.equal(retake.publicEntry.completedAt, now)
    assert.equal(retake.publicEntry.scoreScaled, 0.5)
    assert.equal(retake.publicEntry.retakeCount, 1)
    assert.equal(needsReview(noReflection, retake.runstate), true)
  })

  it('scores one point per native check and rates only Accingo quizzes', () => {
    const native = validateAcademyDocument('module', moduleDoc({
      sections: {
        0: {
          title: lang('One'),
          blocks: [{ type: 'figure', url: 'https://cdn.example/images/figure.png', caption: lang('Figure') }],
          check: { ...check('One'), rate: 4 },
        },
        1: {
          title: lang('Two'),
          blocks: [],
          check: { ...check('Two'), rate: 9 },
        },
      },
    })).value
    assert.equal(native.sections['0'].blocks[0].url, 'https://cdn.example/images/figure.png')
    assert.equal(native.sections['0'].check.rate, undefined)
    let snapshot = openModule(emptySnapshot(), MOD, now).snapshot
    let runstate = emptyRunstate()
    for (const key of ['0', '1']) {
      const answered = answerCheck({
        snapshot, runstate, module: native, moduleId: MOD, sectionKey: key, optionIndex: 0, now,
      })
      snapshot = answered.snapshot
      runstate = answered.runstate
    }
    assert.equal(snapshot.modules[MOD].scoreRaw, 2)
    assert.equal(snapshot.modules[MOD].scoreMax, 2)
    assert.equal(snapshot.modules[MOD].scoreScaled, 1)
    assert.deepEqual(scoreFields(native, runstate), {
      scoreRaw: 2, scoreMin: 0, scoreMax: 2, scoreScaled: 1,
    })

    const accingo = readAccingoModule({
      config: {
        sections: [{
          id: 's',
          estimatedMinutes: 2,
          columns: [{
            id: 'c',
            width: 12,
            widgets: [
              {
                id: 'poll',
                type: 'multipleChoice',
                props: {
                  question: 'Poll',
                  correctAnswer: null,
                  rate: 0,
                  feedback: 'Thanks',
                  options: [{ id: 'a', displayName: 'A' }, { id: 'b', displayName: 'B' }],
                },
              },
              {
                id: 'graded',
                type: 'multipleChoice',
                props: {
                  question: 'Graded',
                  correctAnswer: 'a',
                  rate: 3,
                  options: [{ id: 'a', displayName: 'A' }, { id: 'b', displayName: 'B' }],
                },
              },
            ],
          }],
        }],
      },
    }, 'accingo-rate')
    const graded = accingo.sections['0'].checks.find((item) => item.id === 'graded')
    const poll = accingo.sections['0'].checks.find((item) => item.id === 'poll')
    const fields = scoreFields(accingo, { answers: { [graded.fqn]: 0, [poll.fqn]: 1 } })
    assert.equal(fields.scoreRaw, 3)
    assert.equal(fields.scoreMax, 3)
    assert.equal(fields.scoreScaled, 1)
    assert.equal(needsReview(accingo, { answers: { [poll.fqn]: 1 } }), false)
  })

  it('keeps a native academy module and skips a tagged non-module', () => {
    const native = validateAcademyDocument('module', moduleDoc()).value
    assert.equal(acceptAcademyRecord(native, ACADEMY_MODULE_TYPE), 'native')
    assert.equal(acceptAcademyRecord({}, null), null)
    assert.equal(acceptAcademyRecord({ state: {} }, null), null)
    assert.equal(acceptAcademyRecord({
      name: 'Generative AI (I)',
      state: { appId: 'embed' },
    }, null), null)
    assert.equal(native.sections['0'].check.options.length, 2)
  })

  it('submits a series reflection only when every module is complete', () => {
    const series = validateAcademyDocument('series', {
      name: lang('AI Literacy'),
      description: lang(''),
      cover: '',
      modules: { 0: { id: MOD }, 1: { id: MOD_B } },
      reflection: { kind: 'text', prompt: lang('Final') },
    }).value
    const half = emptySnapshot()
    half.modules[MOD] = { status: 'completed', progress: 1 }
    assert.equal(seriesRatio([MOD, MOD_B], half), 0.5)
    const early = submitSeriesReflection({
      snapshot: half,
      series,
      seriesId: SERIES,
      moduleIds: [MOD, MOD_B],
      text: 'too soon',
      now,
    })
    assert.equal(early.ok, false)
    assert.equal(early.error, 'series-incomplete')

    const done = emptySnapshot()
    done.modules[MOD] = { status: 'completed', progress: 1 }
    done.modules[MOD_B] = { status: 'completed', progress: 1 }
    const secret = 'SERIES_SECRET_NOTE'
    const submitted = submitSeriesReflection({
      snapshot: done,
      series,
      seriesId: SERIES,
      moduleIds: [MOD, MOD_B],
      text: secret,
      now,
    })
    assert.equal(submitted.ok, true)
    assert.equal(submitted.publicEntry.status, 'completed')
    assert.equal(submitted.publicEntry.progress, 1)
    assert.equal(JSON.stringify(submitted.snapshot).includes(secret), false)
    assert.equal(submitted.runstate.reflectionText, secret)
  })
})

describe('academy statements and access', () => {
  it('publishes only the two IRI verbs and the public fields', () => {
    const secretAnswer = 'SECRET_ANSWER'
    const secretNote = 'SECRET_REFLECTION'
    const progressed = academyStatement(MOD, {
      status: 'in-progress',
      progress: 0.5,
      scoreRaw: 1,
      scoreMin: 0,
      scoreMax: 2,
      scoreScaled: 0.5,
      sectionIndex: 1,
      retakeCount: 2,
      reflectionText: secretNote,
      answers: { 0: secretAnswer },
    })
    assert.equal(progressed.verb.id, ACADEMY_VERBS.progressed)
    assert.equal(progressed.result.completion, false)
    assert.equal(progressed.result.extensions[ACADEMY_EXT.schema], 1)
    assert.equal(progressed.result.extensions[ACADEMY_EXT.status], 'in-progress')
    assert.equal(progressed.result.extensions[ACADEMY_EXT.progress], 0.5)
    assert.equal(progressed.result.extensions[ACADEMY_EXT.sectionIndex], 1)
    assert.equal(progressed.result.extensions[ACADEMY_EXT.retakeCount], 2)
    assert.equal(progressed.result.score.scaled, 0.5)
    const body = JSON.stringify(progressed)
    assert.equal(body.includes(secretAnswer), false)
    assert.equal(body.includes(secretNote), false)
    assert.equal(body.includes('answers'), false)
    assert.equal(body.includes('reflection'), false)

    const completed = academyStatement(MOD, { status: 'completed', progress: 1, sectionIndex: 1, retakeCount: 0 })
    assert.equal(completed.verb.id, ACADEMY_VERBS.completed)
    assert.equal(completed.result.completion, true)
    assert.equal(academyStatement('not-a-uuid', { status: 'completed' }), null)
    assert.equal(academyStatement('preview', { status: 'completed' }), null)
  })

  it('keeps play off assignment and preview scopes, and off other teachers', () => {
    assert.equal(academyPlayNamespace(MOD), `academy-progress:v1:${MOD}`)
    assert.notEqual(academyPlayNamespace(MOD), MOD)
    assert.notEqual(academyPlayNamespace(MOD), 'preview')
    assert.throws(() => academyPlayNamespace('preview'))

    assert.equal(canOpenAcademyRole('teacher'), true)
    assert.equal(canOpenAcademyRole('admin'), true)
    assert.equal(canOpenAcademyRole('student'), false)
    assert.equal(canOpenAcademyRole('trainer'), false)

    assert.equal(assertOwnAcademyWrite({
      actorId: 'teacher-1',
      targetUserId: 'teacher-1',
      scope: 'academy-progress:v1',
    }).ok, true)
    assert.equal(assertOwnAcademyWrite({
      actorId: 'teacher-1',
      targetUserId: 'teacher-2',
      scope: `academy-progress:v1:${MOD}`,
    }).ok, false)
    assert.equal(assertOwnAcademyWrite({
      actorId: 'teacher-1',
      targetUserId: 'teacher-1',
      scope: MOD,
    }).ok, false)
    assert.equal(assertOwnAcademyWrite({
      actorId: 'teacher-1',
      targetUserId: 'teacher-1',
      scope: 'preview',
    }).ok, false)
    assert.equal(canMutateAcademyDoc({ owner: 'teacher-1' }, 'teacher-1'), true)
    assert.equal(canMutateAcademyDoc({ owner: 'teacher-1' }, 'teacher-2'), false)
    assert.equal(canMutateAcademyDoc(null, 'teacher-1'), false)
    assert.equal(canRetagAcademyModule({
      active_type: 'application/json;type=academy_module',
      owner: 'teacher-1',
    }, 'teacher-1'), true)
    assert.equal(canRetagAcademyModule({
      active_type: 'application/json;type=academy_module',
      owner: 'teacher-2',
    }, 'teacher-1'), false)
    assert.equal(canRetagAcademyModule({
      active_type: 'application/json;type=academy_series',
      owner: 'teacher-1',
    }, 'teacher-1'), false)
    assert.equal(canRetagAcademyModule({ active_type: 'application/json', owner: 'teacher-1' }, 'teacher-1'), false)
    assert.equal(canRetagAcademyModule(null, 'teacher-1'), false)
  })
})
