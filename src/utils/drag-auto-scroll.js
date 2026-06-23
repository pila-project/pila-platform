const EDGE_PX = 56
const MAX_STEP = 16

function stepForDistance(distance, edge) {
  if (distance <= 0) return MAX_STEP
  return Math.max(4, Math.ceil(((edge - distance) / edge) * MAX_STEP))
}

function autoScrollElement(el, clientY) {
  const rect = el.getBoundingClientRect()
  const fromTop = clientY - rect.top
  const fromBottom = rect.bottom - clientY

  if (fromTop >= 0 && fromTop < EDGE_PX) {
    el.scrollTop -= stepForDistance(fromTop, EDGE_PX)
  } else if (fromBottom >= 0 && fromBottom < EDGE_PX) {
    el.scrollTop += stepForDistance(fromBottom, EDGE_PX)
  }
}

/**
 * While HTML5 drag is active, scroll explore pane containers when the pointer
 * nears their top/bottom edges (sequences list + content library grid).
 */
export function createDragAutoScroll(getTargets = () => []) {
  let active = false

  function onDragOver(e) {
    if (!active) return
    for (const el of getTargets()) {
      if (!(el instanceof HTMLElement)) continue
      autoScrollElement(el, e.clientY)
    }
  }

  function start() {
    if (active) return
    active = true
    document.addEventListener('dragover', onDragOver)
  }

  function stop() {
    if (!active) return
    active = false
    document.removeEventListener('dragover', onDragOver)
  }

  return { start, stop }
}