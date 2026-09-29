import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readAccingoModule } from './accingo-module.js'
import {
  DATAWISE_MODULE_ID,
  FEEDBACK_MODULE_ID,
  NODES_MODULE_ID,
  sampleEnvelope,
} from '../pages/teacher/academy/sample-modules.js'
import { continueSection, emptyRunstate, emptySnapshot, openModule } from './teacher-academy.js'

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
    assert.equal(nodes.sections['0'].checks, undefined)
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
})
