import { computed, onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { academyCopy } from './copy.js'
import { teacherActor } from '@/utils/teacher-academy-io.js'

export function useAcademyPage() {
  const store = useStore()
  const router = useRouter()
  const lang = computed(() => {
    const value = store.getters.language?.()
    return value || 'en'
  })
  const actor = computed(() => teacherActor(store))

  function copy(slug, vars) {
    return academyCopy(lang.value, slug, vars)
  }

  function ensureTeacher() {
    if (!actor.value.allowed) {
      router.replace('/')
      return false
    }
    return true
  }

  return { store, router, lang, actor, copy, ensureTeacher }
}

/** KeepAlive remounts are not new mounts. Skip the first activate so load runs once, then refresh on Back. */
export function reloadWhenShown(load) {
  const ready = ref(false)
  onMounted(async () => {
    await load()
    ready.value = true
  })
  onActivated(() => {
    if (!ready.value) return
    load()
  })
}
