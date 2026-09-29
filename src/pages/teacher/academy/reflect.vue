<template>
  <div class="academy">
    <h1 class="academy-kicker">{{ t('teacher-academy') }}</h1>
    <p v-if="loading" class="academy-muted">{{ copy('loading') }}</p>
    <p v-else-if="error" class="academy-error">{{ error }}</p>
    <ReflectionDialog
      v-else-if="doc?.reflection"
      :title="copy(kind === 'series' ? 'seriesComplete' : 'submitReflection')"
      :lead="copy(kind === 'series' ? 'seriesCompleteBody' : 'reflectionLead')"
      :resource-name="text(doc.name)"
      :resource-meta="copy(kind === 'series' ? 'series' : 'moduleLibrary')"
      :mode="doc.reflection.kind"
      :prompt="text(doc.reflection.prompt)"
      :options="(doc.reflection.options || []).map((option) => text(option.text))"
      :your-label="copy('yourReflection')"
      :placeholder="copy('reflectionPlaceholder')"
      :hint="copy('reflectionHint')"
      :character-label="(n) => copy('characters', { n })"
      :cancel-label="copy('cancel')"
      :submit-label="copy('submit')"
      :submitting="submitting"
      @cancel="cancel"
      @submit="submit"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  localizedText,
  orderedModuleIds,
  submitModuleReflection,
  submitSeriesReflection,
} from '@/utils/teacher-academy.js'
import {
  loadAcademyDocument,
  loadRunstate,
  loadSnapshot,
  savePlay,
  saveSnapshot,
} from '@/utils/teacher-academy-io.js'
import { fixtureRecord, isAcademyFixture, readFixtureRun, readFixtureSnapshot, writeFixtureRun, writeFixtureSnapshot } from './fixtures.js'
import { emptyRunstate } from '@/utils/teacher-academy.js'
import ReflectionDialog from './ReflectionDialog.vue'
import { useAcademyPage } from './useAcademyPage.js'

const route = useRoute()
const { store, router, lang, copy } = useAcademyPage()
const t = (slug) => store.getters.t(slug)
const kind = computed(() => route.params.kind === 'series' ? 'series' : 'module')
const id = computed(() => route.params.id)
const doc = ref(null)
const snapshot = ref(null)
const runstate = ref(emptyRunstate())
const loading = ref(true)
const submitting = ref(false)
const error = ref('')

function text(value) {
  return localizedText(value, lang.value)
}

function cancel() {
  if (kind.value === 'series') router.push('/teacher/academy')
  else router.push(`/teacher/academy/module/${id.value}`)
}

async function submit(payload) {
  submitting.value = true
  error.value = ''
  try {
    const result = kind.value === 'series'
      ? submitSeriesReflection({
        snapshot: snapshot.value,
        series: doc.value,
        seriesId: id.value,
        moduleIds: orderedModuleIds(doc.value),
        text: payload.text,
        optionIndex: payload.optionIndex,
        now: Date.now(),
      })
      : submitModuleReflection({
        snapshot: snapshot.value,
        runstate: runstate.value,
        module: doc.value,
        moduleId: id.value,
        text: payload.text,
        optionIndex: payload.optionIndex,
        now: Date.now(),
      })
    if (!result.ok) {
      error.value = result.error === 'series-incomplete' ? copy('seriesCompleteBody') : copy('saveFailed')
      return
    }
    if (isAcademyFixture(id.value)) {
      writeFixtureSnapshot(result.snapshot)
      writeFixtureRun(id.value, result.runstate)
    } else {
      await saveSnapshot(store, result.snapshot)
      await savePlay(store, id.value, result.runstate, result.publicEntry)
    }
    router.push(kind.value === 'series'
      ? '/teacher/academy'
      : `/teacher/academy/module/${id.value}/review`)
  } catch (err) {
    if (err?.code === 'forbidden') router.replace('/')
    else error.value = copy('playFailed')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    if (isAcademyFixture(id.value)) {
      const sample = fixtureRecord(id.value)
      if (!sample || sample.kind !== kind.value || !sample.doc?.reflection) {
        error.value = copy('notFound')
        return
      }
      doc.value = sample.doc
      snapshot.value = readFixtureSnapshot()
      if (kind.value === 'module') runstate.value = readFixtureRun(id.value) || emptyRunstate()
      return
    }
    const loaded = await loadAcademyDocument(store, id.value)
    if (!loaded || loaded.kind !== kind.value || !loaded.doc?.reflection) {
      error.value = copy('notFound')
      return
    }
    doc.value = loaded.doc
    snapshot.value = await loadSnapshot(store)
    if (kind.value === 'module') {
      runstate.value = await loadRunstate(store, id.value) || emptyRunstate()
    }
  } catch (err) {
    if (err?.code === 'forbidden') router.replace('/')
    else error.value = copy('notFound')
  } finally {
    loading.value = false
  }
})
</script>

<style src="./academy.css"></style>
