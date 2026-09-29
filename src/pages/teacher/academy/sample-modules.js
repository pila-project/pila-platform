/**
 * Stand-in copies of the three modules Nikki has published.
 * Shape matches Agent.state(id): { name, picture, state.config }.
 * The library uses these until a catalog tag returns the live ids.
 * Bodies are short so the screens can be tried; publish replaces them.
 */
const COVER = 'https://fastly.picsum.photos/id/237/200/300.jpg?hmac=TmmQSbShHz9CdQm0NkEjx1Dyh_Y984R9LpNrpvH2D_U'

export const DATAWISE_MODULE_ID = 'f62f39f0-645b-4919-8b2f-be0d16b1609a'
export const NODES_MODULE_ID = '8921746c-99a7-4cd7-ae7f-b2dbce91dcc0'
export const FEEDBACK_MODULE_ID = 'f71526c7-f489-48a5-ae69-6fb6f3bb8549'

export const SAMPLE_MODULE_IDS = [DATAWISE_MODULE_ID, NODES_MODULE_ID, FEEDBACK_MODULE_ID]

function widget(id, type, props) {
  return { id, type, props }
}

function column(id, width, widgets) {
  return { id, width, widgets }
}

function section(id, minutes, columns) {
  return { id, estimatedMinutes: minutes, columns }
}

function choice(id, question, correctId, options) {
  return widget(id, 'multipleChoice', {
    question,
    correctAnswer: correctId,
    options: options.map(([optionId, displayName]) => ({ id: optionId, displayName })),
  })
}

function envelope(id, name, config) {
  return {
    name,
    picture: COVER,
    state: {
      uuid: id,
      appId: 'pila-teacher-academy',
      picture: COVER,
      name,
      version: '0.1.0',
      config,
    },
  }
}

const datawise = envelope(DATAWISE_MODULE_ID, 'Using the PILA DATAWISE Customizers', {
  title: 'Using the PILA DATAWISE Customizers',
  correctnessFeedback: 'summaryOnly',
  defaultLanguage: 'en',
  translations: {
    th: {
      title: 'การใช้ตัวปรับแต่ง PILA DATAWISE',
      sections: {
        section_1: {
          columns: {
            col_main: {
              widgets: {
                intro: {
                  markdown: '## ตัวปรับแต่ง DATAWISE\n\nโมดูลนี้แสดงวิธีปรับกิจกรรมหลังจากเห็นหลักฐานการเรียนของนักเรียน',
                },
              },
            },
          },
        },
      },
    },
  },
  sections: [
    section('section_1', 2, [
      column('col_main', 8, [
        widget('intro', 'markdown', {
          markdown: '## DATAWISE customizers\n\nAdjust a DATAWISE activity after the dashboard shows what the class did.',
        }),
        widget('layout', 'columns', {
          columns: [
            column('col_text', 6, [
              widget('body', 'markdown', {
                markdown: 'Change one constraint, then assign the new version. The goal is a better next activity, not a new score.',
              }),
            ]),
            column('col_image', 6, [
              widget('shot', 'image', { url: COVER, alt: 'Customizer preview' }),
            ]),
          ],
        }),
        widget('insight', 'alert', {
          title: 'Key Insights',
          description: 'Change the activity only after the evidence says what students need next.',
          level: 'info',
        }),
      ]),
      column('col_check', 4, [
        choice('q1', 'When should you publish a new customizer version?', 'b', [
          ['a', 'Before any student has opened the activity'],
          ['b', 'After evidence shows what the class needs next'],
          ['c', 'Only when the cover image changes'],
        ]),
      ]),
    ]),
    section('section_2', 3, [
      column('col', 12, [
        widget('md', 'markdown', {
          markdown: '## What the dashboard shows\n\nStudents are grouped by the strategy they used, not only by a score.',
        }),
        widget('acc', 'accordion', {
          items: [
            { id: 'item_1', title: 'Constraints', widgets: [widget('a', 'markdown', { markdown: 'Tighten a constraint when the task is too open.' })] },
            { id: 'item_2', title: 'Hints', widgets: [widget('b', 'markdown', { markdown: 'Add a hint when a group is stuck on the same step.' })] },
          ],
        }),
      ]),
    ]),
    section('section_3', 3, [
      column('col', 12, [
        widget('md', 'markdown', { markdown: '## The activity students open\n\nUse the frame to see the activity from the student side.' }),
        widget('frame', 'iframe', { url: 'https://pila-teacher-academy.accingo.co/module', title: 'Teacher Academy module' }),
      ]),
    ]),
    section('section_4', 5, [
      column('col', 12, [
        widget('frame', 'iframe', {
          url: 'https://pila-teacher-academy.accingo.co/module/customizer/module?language=en',
          title: 'Module customizer',
        }),
        widget('carousel', 'carousel', {
          header: 'What you can change',
          items: [
            { id: 'item_1', widgets: [widget('c1', 'markdown', { markdown: '**Constraints.** Narrow the task for one group.' })] },
            { id: 'item_2', widgets: [widget('c2', 'markdown', { markdown: '**Feedback.** Choose a summary or an immediate result.' })] },
          ],
        }),
      ]),
    ]),
    section('section_5', 2, [
      column('col', 12, [
        choice('q2', 'Which change belongs in the customizer?', 'a', [
          ['a', 'A new constraint for the next attempt'],
          ['b', 'A grade in the class gradebook'],
        ]),
      ]),
    ]),
    section('section_summary', null, [
      column('col', 12, [
        widget('lead', 'markdown', { markdown: '### Module Review\n\nReview your results below.' }),
        widget('files', 'artifacts', {
          items: [{
            id: '9ad98460-b26a-11f1-9915-57af69fcf0fe',
            name: 'Customizer checklist',
            type: 'application/pdf',
            size: '120 KB',
            url: COVER,
          }],
        }),
        widget('breakdown', 'questionBreakdown', {}),
        widget('next', 'shortAnswer', {
          question: 'What will you change in the next activity?',
          caption: 'Optional. Only you see this when you review the module.',
        }),
      ]),
    ]),
  ],
})

const nodes = envelope(NODES_MODULE_ID, 'Nodes & Edges Widgets Showcase', {
  title: 'Nodes & Edges Widgets Showcase',
  correctnessFeedback: 'immediate',
  defaultLanguage: 'en',
  sections: [
    section('section_1', 5, [
      column('col', 12, [
        widget('loop', 'feedbackLoop', {
          title: 'Formative assessment loop',
          items: [
            { id: 'item_1', title: 'Clarify goals', widgets: [widget('m1', 'markdown', { markdown: 'Students need to know the learning intention first.' })] },
            { id: 'item_2', title: 'Generate', widgets: [widget('m2', 'markdown', { markdown: 'The activity makes the strategy visible.' })] },
            { id: 'item_3', title: 'Interpret', widgets: [widget('m3', 'markdown', { markdown: 'Compare the evidence with the goal.' })] },
            { id: 'item_4', title: 'Use', widgets: [widget('m4', 'markdown', { markdown: 'Change the next step from what the evidence shows.' })] },
          ],
        }),
        widget('chain', 'causalChain', {
          prompt: 'Put the cause before the effect.',
          items: [
            { id: 'step_1', title: 'Students see the goal' },
            { id: 'step_2', title: 'They try a strategy' },
            { id: 'step_3', title: 'The teacher adapts the next task' },
          ],
        }),
        widget('drop', 'dropIntoPlace', {
          prompt: 'Match each action to a stage.',
          items: [
            { id: 'card_1', title: 'Write the learning intention' },
            { id: 'card_2', title: 'Ask what the pattern shows' },
          ],
        }),
        widget('pairs', 'pairUp', {
          prompt: 'Pair the teacher move with the evidence.',
          items: [
            { id: 'left_1', title: 'Compact garden layouts' },
            { id: 'right_1', title: 'Students are using area efficiently' },
          ],
        }),
      ]),
    ]),
  ],
})

const feedback = envelope(FEEDBACK_MODULE_ID, 'Feedback TEST', {
  title: 'Feedback Examples',
  correctnessFeedback: 'immediate',
  defaultLanguage: 'en',
  sections: [
    section('section_1', null, [
      column('col', 12, [
        choice('q1', 'Which moment is formative?', 'b', [
          ['a', 'A test is filed and the class moves on'],
          ['b', 'The teacher changes the next step from what they saw'],
        ]),
        choice('q2', 'What should an activity generate?', 'a', [
          ['a', 'Evidence of how students are thinking'],
          ['b', 'A single grade for the gradebook'],
        ]),
        choice('q3', 'When is feedback useful?', 'b', [
          ['a', 'Two weeks after the work is finished'],
          ['b', 'While students can still use it'],
        ]),
        widget('tf1', 'trueFalse', {
          question: 'Technology by itself makes assessment formative.',
          correctAnswer: false,
        }),
      ]),
    ]),
    section('section_2', null, [
      column('col', 12, [
        choice('q4', 'A good hint does what?', 'a', [
          ['a', 'Points at the next step without giving the answer'],
          ['b', 'Replaces the student\'s attempt'],
        ]),
        choice('q5', 'Who is the reflection for?', 'a', [
          ['a', 'The teacher reviewing their own module'],
          ['b', 'The class gradebook'],
        ]),
        choice('q6', 'An empty correct answer means what?', 'b', [
          ['a', 'The question is broken'],
          ['b', 'The question is a poll and is not scored'],
        ]),
      ]),
    ]),
    section('section_3', null, [
      column('col', 12, [
        widget('d1', 'dropIntoPlace', { prompt: 'Place each move.', items: [{ id: 'a', title: 'Clarify' }, { id: 'b', title: 'Use' }] }),
        widget('d2', 'dropIntoPlace', { prompt: 'Place each piece of evidence.', items: [{ id: 'a', title: 'Strategy' }, { id: 'b', title: 'Score only' }] }),
        widget('d3', 'dropIntoPlace', { prompt: 'Place each response.', items: [{ id: 'a', title: 'Next step' }, { id: 'b', title: 'Praise only' }] }),
      ]),
    ]),
    section('section_4', null, [
      column('col', 12, [
        widget('acc', 'accordion', {
          items: [
            { id: 'item_1', title: 'Immediate feedback', widgets: [widget('m', 'markdown', { markdown: 'Show the result while the attempt is still on screen.' })] },
            { id: 'item_2', title: 'Summary feedback', widgets: [widget('m2', 'markdown', { markdown: 'Hold the result for the module review.' })] },
          ],
        }),
      ]),
    ]),
    section('section_5', null, [
      column('col', 12, [
        widget('chain', 'causalChain', {
          prompt: 'Order this feedback loop.',
          items: [
            { id: 's1', title: 'Notice a pattern' },
            { id: 's2', title: 'Decide the next task' },
          ],
        }),
      ]),
    ]),
    section('section_6', null, [
      column('col', 12, [
        widget('drop', 'dropIntoPlace', { prompt: 'One more placement.', items: [{ id: 'a', title: 'Evidence' }] }),
      ]),
    ]),
    section('section_7', null, [
      column('col', 12, [
        widget('pairs', 'pairUp', { prompt: 'Pair these.', items: [{ id: 'l', title: 'Hint' }, { id: 'r', title: 'Next step' }] }),
        widget('chain2', 'causalChain', { prompt: 'Cause, then effect.', items: [{ id: 's1', title: 'Open task' }, { id: 's2', title: 'Visible strategy' }] }),
      ]),
    ]),
    section('section_8', null, [
      column('col', 12, [
        choice('q7', 'Which comment moves learning forward?', 'b', [
          ['a', 'Good effort'],
          ['b', 'You have the first link. What causes the next one?'],
        ]),
        widget('short', 'shortAnswer', { question: 'What will you try next lesson?', caption: 'This stays on your review.' }),
        widget('tf2', 'trueFalse', { question: 'A score alone is formative.', correctAnswer: false }),
        widget('blank', 'fillInTheBlank', { question: 'Formative assessment answers: where is the learner going, where are they now, and how do they ______?' }),
        widget('scale', 'likert', { question: 'I can use dashboard evidence to plan the next activity.', min: 1, max: 5 }),
      ]),
    ]),
  ],
})

const ENVELOPES = {
  [DATAWISE_MODULE_ID]: datawise,
  [NODES_MODULE_ID]: nodes,
  [FEEDBACK_MODULE_ID]: feedback,
}

export function sampleEnvelope(id) {
  return ENVELOPES[id] || null
}
