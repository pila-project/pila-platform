/**
 * Non-grade Explore filter options.
 * Always list taxonomy leaves. A finished catalog index with no hits still
 * shows the leaf at count 0 so the teacher can select it. A partial index
 * omits counts (a partial tagCache would under-count).
 *
 * @param {string[]} leafIds
 * @param {Record<string, number>} counts
 * @param {boolean} countsComplete
 * @param {(leafId: string) => string} labelFor
 */
export function competencyTagOptions(leafIds, counts, countsComplete, labelFor) {
  const tally = counts || {}
  return (leafIds || [])
    .map(leafId => ({
      value: leafId,
      label: labelFor(leafId),
      count: countsComplete ? (tally[leafId] || 0) : null,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
