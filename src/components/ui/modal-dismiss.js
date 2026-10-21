/**
 * Whether a PModal close reason should emit.
 * dismissible false blocks every reason (outside, escape, top-x, primary-button).
 * persistent still only blocks outside clicks, and only when the modal is dismissible.
 */
export function modalCloseAllowed({ dismissible = true, persistent = false, reason } = {}) {
  if (dismissible === false) return false
  if (persistent && reason === 'outside') return false
  return true
}
