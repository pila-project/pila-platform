// Know Learning writes `{ time: 0, correct: null }` for every key when a sequence opens.
// Those placeholders are not attempts. A cell is real only with time spent or a grade.

export function isRealItemInfoCell(info) {
  if (!info || typeof info !== 'object') return false
  if (Number(info.time) > 0) return true
  return info.correct === true || info.correct === false || info.correct === 'completed'
}

/** Item cell stored under `{index}/{itemId}` or the bare item id. */
export function cellByItemId(info, itemId) {
  if (!info || typeof info !== 'object' || !itemId) return null
  let placeholder = null
  for (const [key, cell] of Object.entries(info)) {
    if (key !== itemId && !key.endsWith(`/${itemId}`)) continue
    if (isRealItemInfoCell(cell)) return cell
    if (!placeholder) placeholder = cell
  }
  return placeholder
}

export function itemInfoHasRealCell(state) {
  const info = state?.itemInfo
  if (!info || typeof info !== 'object') return false
  for (const cell of Object.values(info)) {
    if (isRealItemInfoCell(cell)) return true
  }
  return false
}

function groupIsKlWrapper(group) {
  return group?.klWrapper === true
}

/**
 * Copy wrapper cells onto legacy itemInfo only when the wrapper cell is real.
 * Placeholder keys keep the legacy value.
 */
/**
 * Copy real wrapper cells onto column keys `{index}/{itemId}`.
 * The wrapper may store the same item at a different index. Placeholders do
 * not replace a legacy cell.
 */
export function overlayRealItemInfo(baseInfo, overlayInfo, itemIds) {
  const itemInfo = { ...(baseInfo || {}) }
  if (!overlayInfo || typeof overlayInfo !== 'object') return itemInfo
  for (let i = 0; i < (itemIds || []).length; i += 1) {
    const itemId = itemIds[i]
    if (!itemId) continue
    const incoming = cellByItemId(overlayInfo, itemId)
    if (!isRealItemInfoCell(incoming)) continue
    itemInfo[`${i}/${itemId}`] = incoming
  }
  return itemInfo
}

/**
 * Live-monitoring row.
 * With no klWrapper group, cells are the first existing `{index}/{itemId}` value,
 * placeholder included. Skip-placeholder and id lookup run only when a wrapper
 * group is present.
 * totalTime sums every group when no klWrapper group is present (a sequence can
 * have time before any cell is real). With a wrapper group: if that doc has a
 * real cell, use only its totalTime; otherwise sum groups that themselves have
 * a real cell, so a placeholder-only wrapper adds nothing and old leaf time is
 * not added on top of a new wrapper attempt.
 */
export function mergeLiveMonitoringPerformance({
  groups,
  performanceBySeq,
  sequenceItems,
  activeSequenceId,
  quizModeBySeq,
} = {}) {
  const list = groups || []
  const bySeq = performanceBySeq || {}
  const wrapperGroup = list.find(groupIsKlWrapper)
  let totalTime = 0
  let activeItemIndex = null

  if (!wrapperGroup) {
    for (const group of list) {
      const state = bySeq[group.sequenceId]
      if (!state) continue
      totalTime += Number(state.totalTime) || 0
      activeItemIndex = activeIndexForGroup(group, state, sequenceItems, activeSequenceId, activeItemIndex)
    }
  } else {
    const wrapperState = bySeq[wrapperGroup.sequenceId]
    if (itemInfoHasRealCell(wrapperState)) {
      totalTime = Number(wrapperState.totalTime) || 0
    } else {
      for (const group of list) {
        if (groupIsKlWrapper(group)) continue
        const state = bySeq[group.sequenceId]
        if (!state || !itemInfoHasRealCell(state)) continue
        totalTime += Number(state.totalTime) || 0
      }
    }
    for (const group of list) {
      const state = bySeq[group.sequenceId]
      if (!state) continue
      activeItemIndex = activeIndexForGroup(group, state, sequenceItems, activeSequenceId, activeItemIndex)
    }
  }

  const activeItemInfoArray = (sequenceItems || []).map((itemId) => {
    for (const group of list) {
      const localIndex = group.itemIds?.indexOf(itemId)
      if (localIndex == null || localIndex === -1) continue
      const info = bySeq[group.sequenceId]?.itemInfo
      const keyed = info?.[`${localIndex}/${itemId}`]
      if (!wrapperGroup) {
        if (keyed) return { ...keyed, quizMode: quizModeBySeq?.[group.sequenceId] }
        continue
      }
      const cell = isRealItemInfoCell(keyed) ? keyed : cellByItemId(info, itemId)
      if (!isRealItemInfoCell(cell)) continue
      return { ...cell, quizMode: quizModeBySeq?.[group.sequenceId] }
    }
    return { correct: null, time: 0 }
  })

  return { totalTime, activeItemIndex, activeItemInfoArray }
}

function activeIndexForGroup(group, state, sequenceItems, activeSequenceId, current) {
  if (group.sequenceId !== activeSequenceId) return current
  if (state.activeItemIndex == null || state.activeItemIndex === '') return current
  const localId = group.itemIds?.[state.activeItemIndex]
  const unionIndex = (sequenceItems || []).indexOf(localId)
  if (unionIndex === -1) return current
  return unionIndex
}
