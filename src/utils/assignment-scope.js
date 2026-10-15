/**
 * Assignment content scope.
 *
 * An assignment holds either exactly one sequence, or one-or-more
 * non-sequence items. Never two sequences. Never a sequence mixed with items.
 *
 * Sequence detection reuses partitionSequenceMemberIds (active_type
 * application/json;type=sequence, plus knownSequenceIds). Unknown metadata
 * stays a leaf, matching that helper. Pass knownSequenceIds so a metadata
 * timeout cannot classify a known sequence as a leaf.
 *
 * UIUX-294: a Pethematicians id counts as an item. Every other sequence
 * counts as a sequence, at any item count. Nesting stays on active_type.
 */

import {
  SEQUENCE_ACTIVE_TYPE,
  listedAsSequence,
  partitionSequenceMemberIds,
} from './sequence-items.js'

export const ASSIGNMENT_SCOPE_OK = 'ok'
export const ASSIGNMENT_SCOPE_MIXED = 'mixed'
export const ASSIGNMENT_SCOPE_MULTIPLE_SEQUENCES = 'multiple-sequences'

/** Toast slug: sequence together with single activities. */
export const ASSIGNMENT_SCOPE_MIXED_KEY = 'an-assignment-can-include-one-sequence-or-several-single-activities-but-not-both'

/** Toast slug: a second sequence. */
export const ASSIGNMENT_SCOPE_ONE_SEQUENCE_KEY = 'you-can-only-add-one-sequence-to-an-assignment'

function dedupe(ids) {
  const out = []
  const seen = new Set()
  for (const id of ids || []) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

/**
 * @param {string[]} sequenceIds proven sequence ids
 * @param {string[]} itemIds non-sequence ids
 * @returns {{ ok: boolean, reason: string, sequences: string[], items: string[] }}
 */
export function assignmentScopeFromMembers(sequenceIds, itemIds) {
  const sequences = []
  const countedAsItems = []
  const seen = new Set()
  for (const id of sequenceIds || []) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    if (listedAsSequence(id, SEQUENCE_ACTIVE_TYPE)) sequences.push(id)
    else countedAsItems.push(id)
  }
  const sequenceSet = new Set(sequences)
  const items = dedupe([...countedAsItems, ...(itemIds || [])]).filter(id => !sequenceSet.has(id))

  let reason = ASSIGNMENT_SCOPE_OK
  if (sequences.length > 1 && items.length > 0) reason = ASSIGNMENT_SCOPE_MIXED
  else if (sequences.length > 1) reason = ASSIGNMENT_SCOPE_MULTIPLE_SEQUENCES
  else if (sequences.length === 1 && items.length > 0) reason = ASSIGNMENT_SCOPE_MIXED

  return {
    ok: reason === ASSIGNMENT_SCOPE_OK,
    reason,
    sequences,
    items,
  }
}

export function assignmentScopeAlertKey(reason) {
  if (reason === ASSIGNMENT_SCOPE_MIXED) return ASSIGNMENT_SCOPE_MIXED_KEY
  if (reason === ASSIGNMENT_SCOPE_MULTIPLE_SEQUENCES) return ASSIGNMENT_SCOPE_ONE_SEQUENCE_KEY
  return null
}

/**
 * Classify assignment content ids. Does not drop ids from the caller.
 * @param {string[]} itemIds
 * @param {{ knownSequenceIds?: Set<string>|string[], timeoutMs?: number }} [opts]
 */
export async function assessAssignmentContentScope(itemIds, opts) {
  const ids = dedupe(itemIds)
  const { allowed, rejectedSequences } = await partitionSequenceMemberIds(ids, opts)
  return assignmentScopeFromMembers(rejectedSequences, allowed)
}
