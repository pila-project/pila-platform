<template>
  <div class="review-page">
    <p v-if="loading" class="academy-muted">{{ copy('loading') }}</p>
    <p v-else-if="error" class="academy-error">{{ error }}</p>
    <section v-else-if="doc" class="review-sheet">
      <header class="lesson-nav">
        <div class="lesson-nav-title">
          <button type="button" class="lesson-back" @click="router.push(`/teacher/academy/module/${moduleId}`)">
            <LucideIcon name="arrow-left" :size="16" />
            {{ copy('back') }}
          </button>
          <h2 class="lesson-module-title">{{ text(doc.name) }}</h2>
        </div>
        <div class="lesson-nav-side">
          <div class="lesson-progress" role="group" :aria-label="copy('progress')">
            <span>{{ copy('progress') }}:</span>
            <span class="lesson-progress-track">
              <span class="lesson-progress-fill" :style="{ width: `${percent}%` }" />
            </span>
            <span>{{ percent }}%</span>
          </div>
          <button type="button" class="lesson-download" @click="showDownloads = true">
            <LucideIcon name="download" :size="16" />
            {{ copy('downloadRelated') }}
          </button>
        </div>
      </header>

      <div class="review-body">
        <div class="review-hero">
          <LucideIcon name="target" :size="32" color="#f97316" />
          <h2>{{ copy('moduleReview') }}</h2>
          <p>{{ summaryLead }}</p>
        </div>

        <div class="review-stats">
          <article class="review-stat">
            <LucideIcon name="pie-chart" :size="28" color="#16a34a" />
            <h3>{{ copy('score') }}</h3>
            <p class="review-score">{{ scoreLabel }}</p>
            <span v-if="correctLabel" class="review-pill">{{ correctLabel }}</span>
          </article>
          <article class="review-stat">
            <LucideIcon name="book-open" :size="28" color="#ef4444" />
            <h3>{{ copy('status') }}</h3>
            <span class="review-status" :class="statusKind">
              <LucideIcon v-if="statusKind === 'review'" name="refresh-cw" :size="12" />
              {{ statusPrimary }}
            </span>
            <span class="review-pill">{{ statusSecondary }}</span>
          </article>
        </div>

        <section v-if="breakdown.length" class="review-block">
          <h3>{{ copy('questionBreakdown') }}</h3>
          <ol class="review-breakdown">
            <li v-for="(row, rowIndex) in breakdown" :key="rowIndex">
              <span :class="row.correct ? 'is-correct' : (row.poll ? '' : 'is-open')">{{ row.poll ? copy('answerRecorded') : (row.correct ? copy('answerCorrect') : copy('answerIncorrect')) }}</span>
              <p>{{ row.prompt }}</p>
            </li>
          </ol>
        </section>

        <div class="review-footer">
          <button type="button" class="review-back" @click="router.push('/teacher/academy')">
            <LucideIcon name="arrow-left" :size="16" />
            {{ copy('backToAcademy') }}
          </button>
          <button type="button" class="review-complete" :disabled="!canComplete" @click="complete">
            <LucideIcon name="circle-check" :size="16" />
            {{ copy('completeModule') }}
          </button>
        </div>
      </div>
      <CompletionPrompt
        v-if="showFinishPrompt"
        :title="copy('moduleDoneTitle')"
        :body="copy('moduleDoneBody')"
        :cancel-label="copy('cancel')"
        :submit-label="copy('submitFinalReflection')"
        @cancel="promptDismissed = true"
        @submit="showReflection = true"
      />
    </section>
    <ReflectionDialog
      v-if="showReflection && doc?.reflection"
      :title="copy('submitReflection')"
      :lead="copy('reflectionLead')"
      :resource-name="text(doc.name)"
      :resource-meta="copy('minutes', { n: doc.durationMinutes || 0 })"
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
      @cancel="showReflection = false"
      @submit="submitReflection"
    />
    <DownloadResourcesDialog
      v-if="showDownloads"
      :title="copy('downloadResourcesTitle')"
      :lead="copy('downloadResourcesLead')"
      :files="downloadFiles"
      :select-all-label="copy('selectAll')"
      :count-label="(n, m) => copy('itemsSelected', { n, m })"
      :search-placeholder="copy('searchResources')"
      :empty-label="copy('noResources')"
      :cancel-label="copy('cancel')"
      :download-label="copy('downloadSelected')"
      @cancel="showDownloads = false"
      @download="saveDownloads"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { allSectionsContinued, emptyRunstate, localizedText, needsReview, reviewBreakdown, submitModuleReflection } from '@/utils/teacher-academy.js'
import { loadAcademyDocument, loadRunstate, loadSnapshot, savePlay, saveSnapshot } from '@/utils/teacher-academy-io.js'
import { fixtureRecord, isAcademyFixture, readFixtureRun, readFixtureSnapshot, writeFixtureRun, writeFixtureSnapshot } from './fixtures.js'
import ReflectionDialog from './ReflectionDialog.vue'
import CompletionPrompt from './CompletionPrompt.vue'
import DownloadResourcesDialog from './DownloadResourcesDialog.vue'
import { describeDownload, openDownloads } from './downloads.js'
import { reloadWhenShown, useAcademyPage } from './useAcademyPage.js'

const route = useRoute()
const { store, router, lang, copy } = useAcademyPage()
const moduleId = computed(() => route.params.id)
const doc = ref(null)
const snap = ref(null)
const run = ref(emptyRunstate())
const loading = ref(true)
const error = ref('')
const showDownloads = ref(false)
const showReflection = ref(false)
const promptDismissed = ref(false)
const submitting = ref(false)

const percent = computed(() => Math.round((snap.value?.progress || 0) * 100))
const scoreLabel = computed(() => (
  snap.value?.scoreScaled == null ? '—' : `${Math.round(snap.value.scoreScaled * 100)}%`
))
const correctLabel = computed(() => (
  snap.value?.scoreMax == null
    ? ''
    : copy('correctOf', { n: snap.value.scoreRaw || 0, m: snap.value.scoreMax })
))
const statusKind = computed(() => {
  if (needsReview(doc.value, run.value)) return 'review'
  if (snap.value?.status === 'completed') return 'done'
  if (snap.value?.status === 'in-progress') return 'progress'
  return 'fresh'
})
const statusPrimary = computed(() => (
  statusKind.value === 'review' ? copy('needReviewTitle') : statusSecondary.value
))
const statusSecondary = computed(() => {
  if (statusKind.value === 'review') return copy('needsReview')
  if (statusKind.value === 'done') return copy('completed')
  if (statusKind.value === 'progress') return copy('inProgress')
  return copy('new')
})
const summaryLead = computed(() => {
  const raw = text(doc.value?.summaryMarkdown)
    .replace(/^#{1,6}\s+.*$/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return raw || copy('reviewLead')
})
const breakdown = computed(() => (
  reviewBreakdown(doc.value, run.value).map((row) => ({
    prompt: text(row.prompt),
    correct: row.correct === true,
    poll: row.poll === true,
  }))
))
const downloadFiles = computed(() => (doc.value?.downloads || []).map((file) => describeDownload(file, text)))
const showFinishPrompt = computed(() => (
  snap.value?.status === 'completed'
  && Boolean(doc.value?.reflection)
  && !run.value?.reflectionSubmitted
  && !promptDismissed.value
))
const canComplete = computed(() => (
  snap.value?.status !== 'completed'
  && Boolean(doc.value?.reflection)
  && allSectionsContinued(doc.value, run.value)
))
function text(value) {
  return localizedText(value, lang.value)
}

function saveDownloads(files) {
  openDownloads(files)
  showDownloads.value = false
}

async function submitReflection(payload) {
  submitting.value = true
  error.value = ''
  try {
    const result = submitModuleReflection({
      snapshot: { schemaVersion: 1, modules: { [moduleId.value]: snap.value }, series: {} },
      runstate: run.value,
      module: doc.value,
      moduleId: moduleId.value,
      text: payload.text,
      optionIndex: payload.optionIndex,
      now: Date.now(),
    })
    if (!result.ok) {
      error.value = copy('playFailed')
      return
    }
    if (isAcademyFixture(moduleId.value)) {
      writeFixtureSnapshot(result.snapshot)
      writeFixtureRun(moduleId.value, result.runstate)
    } else {
      const current = await loadSnapshot(store)
      current.modules[moduleId.value] = result.snapshot.modules[moduleId.value]
      await saveSnapshot(store, current)
      await savePlay(store, moduleId.value, result.runstate, result.publicEntry)
    }
    snap.value = result.snapshot.modules[moduleId.value]
    run.value = result.runstate
    showReflection.value = false
  } catch (err) {
    if (err?.code === 'forbidden') router.replace('/')
    else error.value = copy('playFailed')
  } finally {
    submitting.value = false
  }
}

function complete() {
  if (!canComplete.value) return
  router.push(`/teacher/academy/reflect/module/${moduleId.value}`)
}

async function loadReview() {
  try {
    if (isAcademyFixture(moduleId.value)) {
      const sample = fixtureRecord(moduleId.value)
      if (!sample || sample.kind !== 'module') {
        error.value = copy('notFound')
        return
      }
      doc.value = sample.doc
      const local = readFixtureSnapshot()
      snap.value = local.modules?.[moduleId.value] || null
      run.value = readFixtureRun(moduleId.value) || emptyRunstate()
      return
    }
    const loaded = await loadAcademyDocument(store, moduleId.value)
    if (!loaded || loaded.kind !== 'module') {
      error.value = copy('notFound')
      return
    }
    doc.value = loaded.doc
    const snapshot = await loadSnapshot(store)
    snap.value = snapshot.modules?.[moduleId.value] || null
    run.value = await loadRunstate(store, moduleId.value) || emptyRunstate()
  } catch (err) {
    if (err?.code === 'forbidden') router.replace('/')
    else error.value = copy('notFound')
  } finally {
    loading.value = false
  }
}

reloadWhenShown(loadReview)
</script>

<style src="./academy.css"></style>
