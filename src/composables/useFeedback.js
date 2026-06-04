import { reactive } from 'vue'
import { useSuccessDialog } from '@/utils/useSuccessDialog.js'
import { useToast } from '@/utils/useToast.js'

/**
 * Unified feedback: success → blocking modal; errors → toast.
 * Wraps existing useSuccessDialog / useToast for gradual migration.
 */
export function useFeedback() {
  const { successDialog, showSuccessDialog, dismissSuccessDialog } = useSuccessDialog()
  const { error: toastError, info: toastInfo } = useToast()

  function success(title, subtitleOrOnDone = null, onConfirm = null) {
    showSuccessDialog(title, subtitleOrOnDone, onConfirm)
  }

  function error(message) {
    toastError(message)
  }

  function info(message) {
    toastInfo(message)
  }

  return {
    successDialog,
    success,
    error,
    info,
    dismissSuccess: dismissSuccessDialog,
  }
}