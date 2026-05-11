import { reactive } from 'vue'

export function useSuccessDialog() {
  const successDialog = reactive({
    show: false,
    message: '',
    onConfirm: null,
  })

  function showSuccessDialog(message, onConfirm = null) {
    successDialog.message = message
    successDialog.onConfirm = onConfirm
    successDialog.show = true
  }

  function dismissSuccessDialog() {
    const cb = successDialog.onConfirm
    successDialog.show = false
    successDialog.message = ''
    successDialog.onConfirm = null
    if (cb) cb()
  }

  return { successDialog, showSuccessDialog, dismissSuccessDialog }
}
