/** Overlay z-index tiers — use these instead of hardcoded values. */
export const Z_LAYERS = {
  sticky: 10,
  dropdown: 40,
  modal: 50,
  modalNested: 60,
  modalPreview: 70,
  toast: 10000,
  alert: 10050,
}

export const Z_LAYER_VARS = {
  sticky: 'var(--z-sticky)',
  dropdown: 'var(--z-dropdown)',
  modal: 'var(--z-modal)',
  nested: 'var(--z-modal-nested)',
  preview: 'var(--z-modal-preview)',
  toast: 'var(--z-toast)',
  alert: 'var(--z-alert)',
}