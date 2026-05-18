import { reactive } from 'vue'

export function useSuccessDialog() {
  const successDialog = reactive({
    show: false,
    message: '',
    subtitle: '',
    onConfirm: null,
  })

  function showSuccessDialog(message, subtitleOrCallback = null, onConfirm = null) {
    successDialog.message = message
    if (typeof subtitleOrCallback === 'function') {
      successDialog.subtitle = ''
      successDialog.onConfirm = subtitleOrCallback
    } else {
      successDialog.subtitle = subtitleOrCallback || ''
      successDialog.onConfirm = onConfirm
    }
    successDialog.show = true
  }

  function dismissSuccessDialog() {
    const cb = successDialog.onConfirm
    successDialog.show = false
    successDialog.message = ''
    successDialog.subtitle = ''
    successDialog.onConfirm = null
    if (cb) cb()
  }

  return { successDialog, showSuccessDialog, dismissSuccessDialog }
}
