import { ref, watch, onBeforeUnmount } from 'vue'

export function useDebounce(source, delay = 500) {
  const debounced = ref(source.value)
  let timer = null

  const stop = watch(source, (val) => {
    clearTimeout(timer)
    timer = setTimeout(() => { debounced.value = val }, delay)
  })

  function flush() {
    clearTimeout(timer)
    debounced.value = source.value
  }

  onBeforeUnmount(() => {
    clearTimeout(timer)
    stop()
  })

  return { debounced, flush }
}
