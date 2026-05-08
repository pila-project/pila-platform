import { reactive } from 'vue'

const state = reactive({ toasts: [] })

function remove(id) {
  const i = state.toasts.findIndex(t => t.id === id)
  if (i !== -1) state.toasts.splice(i, 1)
}

function toast(message, variant = 'success', duration = 3000) {
  const id = Date.now() + Math.random()
  state.toasts.push({ id, message, variant })
  if (duration > 0) setTimeout(() => remove(id), duration)
}

export function useToast() {
  return {
    toasts: state.toasts,
    success: (msg) => toast(msg, 'success'),
    error: (msg) => toast(msg, 'error', 5000),
    info: (msg) => toast(msg, 'info'),
    remove,
  }
}
