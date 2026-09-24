import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { useDuplicateGuard } from './useDuplicateGuard.js'

describe('useDuplicateGuard proceed awaiting', () => {
  it('awaits proceed when there is no duplicate', async () => {
    const { runWithGuard } = useDuplicateGuard({ getExistingNames: () => [] })
    let finished = false
    const ran = await runWithGuard('New group', async () => {
      await Promise.resolve()
      finished = true
    })
    assert.equal(ran, true)
    assert.equal(finished, true)
  })

  it('does not call proceed until Continue, then awaits it', async () => {
    const { runWithGuard, confirmDuplicateProceed, duplicatePrompt } = useDuplicateGuard({
      getExistingNames: () => ['Fanya'],
    })
    let finished = false
    const ran = await runWithGuard('Fanya', async () => {
      await Promise.resolve()
      finished = true
    })
    assert.equal(ran, false)
    assert.equal(finished, false)
    assert.equal(duplicatePrompt.value.name, 'Fanya')

    await confirmDuplicateProceed()
    assert.equal(finished, true)
    assert.equal(duplicatePrompt.value, null)
  })

  it('logs and does not reject when Continue proceed fails', async () => {
    const { runWithGuard, confirmDuplicateProceed } = useDuplicateGuard({
      getExistingNames: () => ['Fanya'],
    })
    await runWithGuard('Fanya', async () => {
      throw new Error('save failed')
    })
    const errors = []
    const original = console.error
    console.error = (...args) => { errors.push(args) }
    try {
      await confirmDuplicateProceed()
    } finally {
      console.error = original
    }
    assert.equal(errors.length, 1)
    assert.equal(errors[0][0].message, 'save failed')
  })

  it('still skips excludeId when deciding a duplicate (unchanged)', async () => {
    const { runWithGuard, duplicatePrompt } = useDuplicateGuard({
      getExistingStudents: () => [{ id: 'self', name: 'Fanya', grade: '4' }],
    })
    let called = false
    const ran = await runWithGuard('Fanya', () => { called = true }, '4', 'self')
    assert.equal(ran, true)
    assert.equal(called, true)
    assert.equal(duplicatePrompt.value, null)
  })
})
