import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ACCINGO_ASSET_ORIGIN,
  accingoBlocked,
  accingoNeedsReview,
  accingoProgress,
  accingoScore,
  iframeAttributes,
  iframeSrc,
  isPublishedAccingoModule,
  prefixAccingoImage,
  quizStatus,
  readAccingoModule,
  readStoredAnswer,
} from './accingo-module.js'
import {
  DATAWISE_MODULE_ID,
  FEEDBACK_MODULE_ID,
  NODES_MODULE_ID,
  sampleEnvelope,
} from '../pages/teacher/academy/sample-modules.js'
import {
  answerCheck,
  continueSection,
  emptyRunstate,
  revealSection,
  emptySnapshot,
  needsReview,
  openModule,
  reviewBreakdown,
  sectionAdvanceError,
} from './teacher-academy.js'

describe('accingo module reader', () => {
  const datawise = readAccingoModule(sampleEnvelope(DATAWISE_MODULE_ID), DATAWISE_MODULE_ID)
  const feedback = readAccingoModule(sampleEnvelope(FEEDBACK_MODULE_ID), FEEDBACK_MODULE_ID)
  const nodes = readAccingoModule(sampleEnvelope(NODES_MODULE_ID), NODES_MODULE_ID)

  it('reads the published envelope and skips the summary page', () => {
    assert.equal(datawise.format, 'accingo')
    assert.equal(datawise.name.en, 'Using the PILA DATAWISE Customizers')
    assert.equal(datawise.name.th, 'การใช้ตัวปรับแต่ง PILA DATAWISE')
    assert.equal(Object.keys(datawise.sections).length, 5)
    assert.equal(datawise.durationMinutes, 15)
    assert.equal(datawise.correctnessFeedback, 'summaryOnly')
    assert.equal(datawise.sections['0'].check.options[1].correct, true)
    assert.equal(datawise.downloads.length, 1)
    assert.equal(datawise.downloads[0].name, 'Customizer checklist')
    assert.equal(datawise.reflection.kind, 'text')
    assert.equal(datawise.sections['0'].widgets.some((widget) => widget.type === 'multipleChoice'), false)
  })

  it('applies a Thai overlay onto the matching widget', () => {
    const intro = datawise.sections['0'].widgets.find((widget) => widget.id === 'intro')
    assert.match(intro.markdown.th, /ตัวปรับแต่ง/)
    assert.match(intro.markdown.en, /DATAWISE/)
  })

  it('keeps every scored question when a section has more than one', () => {
    assert.equal(feedback.sections['0'].check, null)
    assert.equal(feedback.sections['0'].checks.length, 4)
    assert.equal(nodes.sections['0'].check, null)
    assert.equal(nodes.sections['0'].checks.length, 1)
    assert.equal(nodes.sections['0'].checks[0].type, 'dropIntoPlace')
    assert.equal(nodes.sections['0'].widgets.some((widget) => widget.type === 'pairUp'), true)
    assert.equal(nodes.sections['0'].widgets.map((widget) => widget.type).join(','), 'feedbackLoop,causalChain,dropIntoPlace,pairUp')
  })

  it('rejects an empty Know Learning file', () => {
    assert.equal(readAccingoModule({ name: 'x', state: {} }, DATAWISE_MODULE_ID), null)
  })

  it('still completes from the lesson sections, not the summary', () => {
    const opened = openModule(emptySnapshot(), DATAWISE_MODULE_ID, 1)
    let run = emptyRunstate()
    let snapshot = opened.snapshot
    for (const key of Object.keys(datawise.sections)) {
      const section = datawise.sections[key]
      if (section.check) {
        run = { ...run, answers: { ...run.answers, [key]: 1 } }
      }
      for (const check of section.checks || []) {
        run = { ...run, answers: { ...run.answers, [check.id]: 0 } }
      }
      const step = continueSection({
        snapshot,
        runstate: run,
        module: datawise,
        moduleId: DATAWISE_MODULE_ID,
        sectionKey: key,
        now: 2,
      })
      assert.equal(step.ok, true)
      snapshot = step.snapshot
      run = step.runstate
    }
    assert.equal(snapshot.modules[DATAWISE_MODULE_ID].status, 'completed')
    assert.equal(snapshot.modules[DATAWISE_MODULE_ID].progress, 1)
  })

  it('does not prefix absolute sample images', () => {
    const columns = datawise.sections['0'].widgets.find((widget) => widget.type === 'columns')
    const image = columns.columns.flatMap((column) => column.widgets).find((widget) => widget.type === 'image')
    assert.equal(image.url.startsWith('https://'), true)
    assert.equal(image.url.includes(ACCINGO_ASSET_ORIGIN), false)
  })
})

const ARTIFACT_ID = '9ad98460-b26a-11f1-9915-57af69fcf0fe'

function choice(id, correctAnswer, props = {}) {
  return {
    id,
    type: 'multipleChoice',
    props: {
      question: props.question || id,
      correctAnswer,
      options: props.options || [
        { id: 'a', displayName: 'A' },
        { id: 'b', displayName: 'B' },
        { id: 'c', displayName: 'C' },
      ],
      ...props,
    },
  }
}

function column(id, width, widgets) {
  return { id, width, widgets }
}

function lesson(id, minutes, columns, extra = {}) {
  return { id, estimatedMinutes: minutes, columns, ...extra }
}

function publish(sections, extra = {}) {
  return readAccingoModule({
    name: 'Fixture',
    config: {
      title: 'Fixture',
      correctnessFeedback: 'summaryOnly',
      defaultLanguage: 'en',
      sections,
      ...extra,
    },
  }, 'fixture')
}

describe('accingo live DATAWISE shape', () => {
  const live = publish([
    lesson('section_1', 2, [
      column('col_1_0', 8, [
        {
          id: 'columns_1',
          type: 'columns',
          props: {
            columns: [
              column('columns_1_col_0', 8, [
                { id: 'markdown_1', type: 'markdown', props: { markdown: 'Why customize', header: 'Why' } },
              ]),
              column('columns_1_col_1', 4, [
                { id: 'image_1', type: 'image', props: { url: '/images/mascot-right-variant2.png', alt: 'Mascot' } },
              ]),
            ],
          },
        },
        { id: 'alert_1', type: 'alert', props: { level: 'info', title: 'Note', description: 'Info' } },
        { id: 'tip_1', type: 'alert', props: { level: 'warning', title: 'Tip', description: 'Careful' } },
      ]),
      column('col_1_1', 4, [
        choice('multipleChoice_1', null, {
          question: 'Ready?',
          rate: 0,
          feedback: 'Thanks for answering.',
          badge: 'Q1',
          options: [
            { id: 'a', displayName: 'Yes' },
            { id: 'b', displayName: 'No' },
          ],
        }),
      ]),
    ]),
    lesson('section_5', 2, [
      column('empty_a', 3, []),
      column('col_quiz', 6, [
        choice('multipleChoice_2', 'b', {
          question: 'Which constraint?',
          rate: 1,
          successFeedback: 'Yes',
          failureFeedback: 'Not that one',
          options: [
            { id: 'a', displayName: 'Grade' },
            { id: 'b', displayName: 'Constraint' },
          ],
        }),
      ]),
      column('empty_b', 3, []),
    ]),
    lesson('section_open', undefined, [
      column('col', 12, [
        { id: 'md', type: 'markdown', props: { markdown: 'Minutes were omitted.' } },
      ]),
    ]),
    lesson('summary_notes', 4, [
      column('col', 12, [
        { id: 'md', type: 'markdown', props: { markdown: 'This id is not a summary flag.' } },
      ]),
    ]),
    lesson('section_summary', 9, [
      column('col', 12, [
        { id: 'mark', type: 'image', props: { url: '/images/target.svg' } },
        { id: 'score', type: 'score', props: {} },
        { id: 'time', type: 'timeSpent', props: {} },
        { id: 'status', type: 'status', props: {} },
      ]),
    ], { isSummary: true }),
  ], {
    artifacts: [ARTIFACT_ID],
    translations: {
      th: {
        sections: {
          section_1: {
            columns: {
              col_1_1: {
                widgets: {
                  multipleChoice_1: { props: { question: 'พร้อมไหม' } },
                },
              },
            },
          },
        },
      },
    },
  })

  it('keeps the sidebar poll beside content and the lone quiz inline', () => {
    assert.equal(Object.keys(live.sections).length, 4)
    assert.equal(live.sections['0'].check.fqn, 'section_1:col_1_1:multipleChoice_1')
    assert.equal(live.sections['0'].check.hasCorrect, false)
    assert.equal(live.sections['0'].check.rate, 0)
    assert.equal(live.sections['0'].check.badge, 'Q1')
    assert.equal(live.sections['0'].widgets.some((widget) => widget.type === 'multipleChoice'), false)
    assert.equal(live.sections['1'].check, null)
    assert.equal(live.sections['1'].checks[0].id, 'multipleChoice_2')
    assert.equal(live.sections['1'].widgets.some((widget) => widget.id === 'multipleChoice_2'), true)
    assert.equal(live.sections['3'].id, 'summary_notes')
    assert.equal(live.durationMinutes, 10)
    assert.equal(live.sections['2'].estimatedMinutes, 2)
  })

  it('prefixes only root-relative Accingo image paths', () => {
    const nested = live.sections['0'].widgets.find((widget) => widget.type === 'columns')
    const image = nested.columns.flatMap((column) => column.widgets).find((widget) => widget.type === 'image')
    assert.equal(image.url, `${ACCINGO_ASSET_ORIGIN}/images/mascot-right-variant2.png`)
    assert.equal(prefixAccingoImage('https://cdn.example/images/figure.png'), 'https://cdn.example/images/figure.png')
    assert.equal(prefixAccingoImage('/files/local.png'), '/files/local.png')
    const info = live.sections['0'].widgets.find((widget) => widget.id === 'alert_1')
    const warning = live.sections['0'].widgets.find((widget) => widget.id === 'tip_1')
    assert.equal(info.kind, 'insight')
    assert.equal(warning.kind, 'tip')
    assert.equal(live.sections['0'].check.prompt.th, 'พร้อมไหม')
  })

  it('does not let a rate of 0 raise the score, and never marks a poll incorrect', () => {
    const poll = live.sections['0'].check
    assert.equal(quizStatus(poll, 0), 'completed')
    assert.equal(quizStatus(poll, null), 'unanswered')
    const opened = openModule(emptySnapshot(), 'fixture', 1)
    const answered = answerCheck({
      snapshot: opened.snapshot,
      runstate: emptyRunstate(),
      module: live,
      moduleId: 'fixture',
      sectionKey: '0',
      optionIndex: 0,
      now: 2,
    })
    assert.equal(answered.runstate.answers[poll.fqn], 0)
    assert.equal(answered.runstate.answers[poll.id], undefined)
    assert.equal(answered.publicEntry.scoreMax, 1)
    assert.equal(answered.publicEntry.scoreRaw, 0)
    assert.equal(needsReview(live, answered.runstate), false)
    const row = reviewBreakdown(live, answered.runstate)[0]
    assert.equal(row.poll, true)
    assert.equal(row.correct, false)
    const rated = live.sections['1'].checks[0]
    const wrong = { answers: { [rated.id]: 0 } }
    const right = { answers: { [rated.id]: 1 } }
    assert.equal(readStoredAnswer(wrong, rated.fqn, rated.legacyKeys), 0)
    assert.equal(accingoScore(live, wrong).scoreRaw, 0)
    assert.equal(accingoScore(live, right).scoreRaw, 1)
    assert.equal(accingoScore(live, right).scoreMax, 1)
    assert.equal(accingoNeedsReview(live, wrong), true)
    assert.equal(accingoNeedsReview(live, right), false)
  })
})

describe('accingo quizzes, gates, and minutes', () => {
  it('ignores alerts when deciding whether a poll section can continue', () => {
    const doc = publish([
      lesson('section_1', 2, [
        column('col', 12, [
          { id: 'alert_info', type: 'alert', props: { level: 'info', title: 'Note', description: 'Info' } },
          { id: 'alert_warn', type: 'alert', props: { level: 'warning', title: 'Tip', description: 'Careful' } },
          choice('multipleChoice_1', null, {
            question: 'Ready?',
            rate: 0,
            feedback: 'Thanks for answering.',
            options: [
              { id: 'a', displayName: 'Yes' },
              { id: 'b', displayName: 'No' },
            ],
          }),
        ]),
      ]),
    ])
    const poll = doc.sections['0'].checks[0]
    assert.equal(doc.sections['0'].checks.length, 1)
    assert.equal(poll.type, 'multipleChoice')
    assert.equal(poll.hasCorrect, false)
    assert.equal(poll.rate, 0)
    assert.equal(accingoBlocked(doc, '0', emptyRunstate()), 'check-required')
    const waiting = continueSection({
      snapshot: emptySnapshot(),
      runstate: emptyRunstate(),
      module: doc,
      moduleId: 'fixture',
      sectionKey: '0',
      now: 1,
    })
    assert.equal(waiting.ok, false)
    assert.equal(waiting.error, 'check-required')
    const answered = { ...emptyRunstate(), answers: { [poll.fqn]: 0 } }
    assert.equal(accingoBlocked(doc, '0', answered), null)
    const moved = continueSection({
      snapshot: emptySnapshot(),
      runstate: answered,
      module: doc,
      moduleId: 'fixture',
      sectionKey: '0',
      now: 2,
    })
    assert.equal(moved.ok, true)
  })

  it('matches a multi-select answer only when the selected set is exact', () => {
    const doc = publish([
      lesson('s', 2, [
        column('c', 12, [
          choice('multi', ['a', 'c'], { rate: 2 }),
        ]),
      ]),
    ])
    const quiz = doc.sections['0'].checks[0]
    assert.equal(quiz.multi, true)
    assert.equal(quizStatus(quiz, [0, 2]), 'completed')
    assert.equal(quizStatus(quiz, [2, 0]), 'completed')
    assert.equal(quizStatus(quiz, [0, 1]), 'incorrect')
    assert.equal(quizStatus(quiz, [0]), 'incorrect')
    assert.equal(quizStatus(quiz, [0, 1, 2]), 'incorrect')
    const saved = answerCheck({
      snapshot: emptySnapshot(),
      runstate: emptyRunstate(),
      module: doc,
      moduleId: 'fixture',
      sectionKey: '0',
      checkId: quiz.fqn,
      optionIndexes: [0, 2],
      now: 3,
    })
    assert.deepEqual(saved.runstate.answers[quiz.fqn], [0, 2])
    assert.equal(saved.publicEntry.scoreRaw, 2)
    assert.equal(saved.publicEntry.scoreMax, 2)
  })

  it('reads likert, pairs, blanks, placements, and artifact ids', () => {
    const doc = publish([
      lesson('s', 2, [
        column('main', 8, [
          { id: 'scale', type: 'likert', props: { question: 'How sure?', rate: 1 } },
          {
            id: 'pairs',
            type: 'pairUp',
            props: {
              prompt: 'Pair them',
              leftItems: [{ id: 'l', label: 'Left' }],
              rightItems: [{ id: 'r', label: 'Right' }],
              correctAnswer: [{ leftId: 'l', rightId: 'r' }],
              requireInteraction: true,
            },
          },
          {
            id: 'blank',
            type: 'fillInTheBlank',
            props: {
              question: 'The [gap] is [pick].',
              rate: 1,
              blanks: [
                { id: 'gap', inputType: 'text' },
                {
                  id: 'pick',
                  inputType: 'dropdown',
                  correctAnswer: 'b',
                  options: [{ id: 'a', displayName: 'No' }, { id: 'b', displayName: 'Yes' }],
                },
              ],
            },
          },
        ]),
        column('side', 4, [
          {
            id: 'drop',
            type: 'dropIntoPlace',
            props: {
              question: 'Place each card.',
              rate: 1,
              items: [{ id: 'card0', title: 'First' }, { id: 'card1', title: 'Second' }],
              correctAnswer: [{ leftId: '0', rightId: '1' }, { leftId: '1', rightId: '0' }],
            },
          },
        ]),
      ]),
      lesson('files', 2, [
        column('c', 12, [
          {
            id: 'files',
            type: 'artifacts',
            props: {
              items: [
                { id: ARTIFACT_ID, name: 'Checklist', url: 'https://cdn.example/list.pdf' },
                { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Notes', url: '' },
              ],
            },
          },
        ]),
      ]),
    ], { artifacts: [ARTIFACT_ID] })
    const checks = doc.sections['0'].checks
    const scale = checks.find((check) => check.type === 'likertScale')
    const blank = checks.find((check) => check.type === 'fillInTheBlank')
    const drop = checks.find((check) => check.type === 'dropIntoPlace')
    const pairs = doc.sections['0'].widgets.find((widget) => widget.type === 'pairUp')
    assert.equal(scale.min, 1)
    assert.equal(scale.max, 5)
    assert.equal(quizStatus(scale, 4), 'completed')
    assert.equal(pairs.leftItems[0].id, 'l')
    assert.equal(pairs.rightItems[0].id, 'r')
    assert.equal(blank.blanks.length, 2)
    assert.equal(quizStatus(blank, { gap: 'answer', pick: 'a' }), 'incorrect')
    assert.equal(quizStatus(blank, { gap: 'answer', pick: 'b' }), 'completed')
    assert.equal(quizStatus(blank, { gap: 'answer' }), 'unanswered')
    assert.equal(drop.kind, 'place')
    assert.equal(quizStatus(drop, { 0: 1 }), 'unanswered')
    assert.equal(quizStatus(drop, { 0: 0, 1: 1 }), 'incorrect')
    assert.equal(quizStatus(drop, { 0: 1, 1: 0 }), 'completed')
    assert.equal(doc.downloads.length, 2)
    assert.equal(doc.downloads[0].id, ARTIFACT_ID)
    assert.equal(doc.downloads[1].name, 'Notes')
    assert.equal(doc.sections['0'].check.fqn, 's:side:drop')
  })

  it('weights progress by minutes and gates continue per section', () => {
    const doc = publish([
      lesson('first', 2, [
        column('c', 12, [
          choice('q1', 'a', { rate: 1, options: [{ id: 'a', displayName: 'A' }, { id: 'b', displayName: 'B' }] }),
          {
            id: 'list',
            type: 'checklist',
            props: {
              title: 'Do both',
              requireInteraction: true,
              items: [{ id: 'one', displayName: 'One' }, { id: 'two', displayName: 'Two' }],
            },
          },
        ]),
      ]),
      lesson('second', 4, [
        column('c', 12, [
          choice('q2', 'a', { rate: 1, optional: true }),
          { id: 'note', type: 'shortAnswer', props: { question: 'Why?', rate: 0 } },
          {
            id: 'cards',
            type: 'flipCard',
            props: {
              requireInteraction: true,
              items: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }],
            },
          },
        ]),
      ], { label: 'Practice', nextLabel: 'Finish', previousLabel: 'Back' }),
    ], { correctnessFeedback: 'onDemand' })
    const first = doc.sections['0'].checks[0]
    const secondNote = doc.sections['1'].checks.find((check) => check.type === 'shortAnswer')
    assert.equal(doc.sections['1'].label, 'Practice')
    assert.equal(doc.sections['1'].nextLabel, 'Finish')
    assert.equal(sectionAdvanceError(doc, '0', emptyRunstate()), 'check-required')
    let run = {
      ...emptyRunstate(),
      answers: { [first.fqn]: 0 },
    }
    assert.equal(accingoBlocked(doc, '0', run), 'interaction-required')
    run = { ...run, answers: { ...run.answers, [doc.sections['0'].interactions[0].fqn]: ['one', 'two'] } }
    assert.equal(accingoBlocked(doc, '0', run), 'reveal-required')
    run = { ...run, checkedSections: { 0: true } }
    assert.equal(accingoBlocked(doc, '0', run), null)
    assert.equal(accingoBlocked(doc, '1', { ...run, checkedSections: { 0: true } }), 'check-required')
    const opened = openModule(emptySnapshot(), 'fixture', 1)
    const moved = continueSection({
      snapshot: opened.snapshot,
      runstate: run,
      module: doc,
      moduleId: 'fixture',
      sectionKey: '0',
      now: 4,
    })
    assert.equal(moved.ok, true)
    assert.ok(Math.abs(moved.publicEntry.progress - (2 / 6)) < 1e-9)
    const noted = answerCheck({
      snapshot: moved.snapshot,
      runstate: moved.runstate,
      module: doc,
      moduleId: 'fixture',
      sectionKey: '1',
      checkId: secondNote.fqn,
      value: '  because  ',
      now: 5,
    })
    assert.equal(quizStatus(secondNote, noted.runstate.answers[secondNote.fqn]), 'completed')
    assert.equal(accingoBlocked(doc, '1', noted.runstate), 'interaction-required')
    const flipped = {
      ...noted.runstate,
      answers: {
        ...noted.runstate.answers,
        [doc.sections['1'].interactions[0].fqn]: { flipped: 1 },
      },
    }
    assert.equal(accingoBlocked(doc, '1', flipped), 'reveal-required')
    assert.equal(accingoBlocked(doc, '0', flipped), null)
    const revealed = { ...flipped, checkedSections: { ...flipped.checkedSections, 1: true } }
    assert.equal(accingoBlocked(doc, '1', revealed), null)
    const done = continueSection({
      snapshot: noted.snapshot,
      runstate: revealed,
      module: doc,
      moduleId: 'fixture',
      sectionKey: '1',
      now: 6,
    })
    assert.equal(done.publicEntry.progress, 1)
    assert.equal(done.publicEntry.scoreRaw, 1)
    assert.equal(done.publicEntry.scoreMax, 2)
  })

  it('substitutes only en and th into an iframe language token', () => {
    const url = 'https://datawise.accingo.co/runoff/customizer/schoolyard_runoff?language={language}'
    const doc = publish([
      lesson('frame', 2, [
        column('c', 8, [
          {
            id: 'frame',
            type: 'iframe',
            props: {
              url,
              caption: 'Schoolyard runoff',
              attributes: [
                { key: 'src', value: 'https://evil.example' },
                { key: 'onload', value: 'alert(1)' },
                { key: 'allow', value: 'fullscreen' },
                { key: 'allowfullscreen', value: 'true' },
                { key: 'Width', value: '640' },
                { key: 'frameborder', value: '0' },
                { key: 'referrerpolicy', value: 'no-referrer' },
              ],
            },
          },
        ]),
        column('side', 4, [
          { id: 'slide', type: 'carousel', props: { items: [{ id: 'item_1', title: 'One' }] } },
        ]),
      ]),
    ])
    const frame = doc.sections['0'].widgets[0].columns.flatMap((column) => column.widgets).find((widget) => widget.type === 'iframe')
    assert.equal(frame.caption, 'Schoolyard runoff')
    assert.equal(iframeSrc(frame.url, 'th'), url.replace('{language}', 'th'))
    assert.equal(iframeSrc(frame.url, 'en-US'), url.replace('{language}', 'en'))
    assert.equal(iframeSrc(frame.url, 'fr'), url)
    assert.equal(iframeSrc(frame.url, ''), url)
    assert.deepEqual(iframeAttributes(frame.attributes), {
      allow: 'fullscreen',
      allowfullscreen: true,
      width: '640',
      frameborder: '0',
      referrerpolicy: 'no-referrer',
    })
    assert.equal(doc.sections['0'].widgets[0].type, 'columns')
  })

  it('rejects iframe urls that are not http(s) or a single-slash path', () => {
    const url = 'https://datawise.accingo.co/runoff?language={language}'
    assert.equal(iframeSrc(url, 'th'), 'https://datawise.accingo.co/runoff?language=th')
    assert.equal(iframeSrc('/images/embed.html', 'en'), '/images/embed.html')
    assert.equal(iframeSrc('javascript:alert(1)', 'en'), '')
    assert.equal(iframeSrc('data:text/html,hi', 'en'), '')
    assert.equal(iframeSrc('//evil.example/embed', 'en'), '')
    assert.equal(iframeSrc('javascript:alert({language})', 'th'), '')
  })

  it('clears the onDemand check when the saved answer changes', () => {
    const doc = publish([
      lesson('s', 2, [
        column('c', 12, [
          choice('q', 'a', {
            rate: 1,
            options: [{ id: 'a', displayName: 'A' }, { id: 'b', displayName: 'B' }],
          }),
        ]),
      ]),
    ], { correctnessFeedback: 'onDemand' })
    const quiz = doc.sections['0'].checks[0]
    const saved = answerCheck({
      snapshot: emptySnapshot(),
      runstate: emptyRunstate(),
      module: doc,
      moduleId: 'fixture',
      sectionKey: '0',
      checkId: quiz.fqn,
      optionIndex: 0,
      now: 1,
    })
    const revealed = revealSection({
      snapshot: saved.snapshot,
      runstate: saved.runstate,
      module: doc,
      moduleId: 'fixture',
      sectionKey: '0',
      now: 2,
    })
    assert.equal(revealed.runstate.checkedSections['0'], true)
    const same = answerCheck({
      snapshot: revealed.snapshot,
      runstate: revealed.runstate,
      module: doc,
      moduleId: 'fixture',
      sectionKey: '0',
      checkId: quiz.fqn,
      optionIndex: 0,
      now: 3,
    })
    assert.equal(same.unchanged, true)
    assert.equal(same.runstate.checkedSections['0'], true)
    const changed = answerCheck({
      snapshot: revealed.snapshot,
      runstate: revealed.runstate,
      module: doc,
      moduleId: 'fixture',
      sectionKey: '0',
      checkId: quiz.fqn,
      optionIndex: 1,
      now: 4,
    })
    assert.equal(changed.runstate.checkedSections['0'], undefined)
  })

  it('does not lower progress when the open section moves backward', () => {
    const options = [{ id: 'a', displayName: 'A' }, { id: 'b', displayName: 'B' }]
    const doc = publish([
      lesson('first', 2, [column('c', 12, [choice('q1', 'a', { rate: 1, options })])]),
      lesson('second', 4, [column('c', 12, [choice('q2', 'a', { rate: 1, options })])]),
    ])
    const quiz = doc.sections['0'].checks[0]
    const saved = answerCheck({
      snapshot: emptySnapshot(),
      runstate: emptyRunstate(),
      module: doc,
      moduleId: 'fixture',
      sectionKey: '0',
      checkId: quiz.fqn,
      optionIndex: 0,
      now: 1,
    })
    const moved = continueSection({
      snapshot: saved.snapshot,
      runstate: saved.runstate,
      module: doc,
      moduleId: 'fixture',
      sectionKey: '0',
      now: 2,
    })
    assert.equal(moved.ok, true)
    assert.ok(moved.runstate.maxSectionIndex >= 1)
    const forward = accingoProgress(doc, moved.runstate)
    const back = accingoProgress(doc, { ...moved.runstate, sectionIndex: 0 })
    assert.equal(back, forward)
    assert.equal(back, moved.publicEntry.progress)
  })
})

describe('published module guard', () => {
  it('skips empty records and non-module records, and keeps DATAWISE', () => {
    assert.equal(isPublishedAccingoModule({}), false)
    assert.equal(readAccingoModule({}, 'empty'), null)
    assert.equal(isPublishedAccingoModule({ state: {} }), false)
    assert.equal(readAccingoModule({ state: {} }, 'empty-state'), null)
    const embed = {
      name: 'Generative AI (I)',
      state: {
        appId: 'embed',
        config: {
          sections: [{ id: 's', columns: [{ id: 'c', width: 12, widgets: [] }] }],
        },
      },
    }
    assert.equal(isPublishedAccingoModule(embed), false)
    assert.equal(readAccingoModule(embed, 'embed'), null)
    assert.equal(isPublishedAccingoModule({ name: 'No sections' }), false)
    const datawise = readAccingoModule(sampleEnvelope(DATAWISE_MODULE_ID), DATAWISE_MODULE_ID)
    assert.equal(datawise.format, 'accingo')
    assert.equal(datawise.id, DATAWISE_MODULE_ID)
  })
})
