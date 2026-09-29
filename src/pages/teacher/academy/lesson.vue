<template>
  <div class="lesson-page">
    <p v-if="loading" class="academy-muted">{{ copy('loading') }}</p>
    <p v-else-if="error" class="academy-error">{{ error }}</p>
    <template v-else-if="doc && section">
      <section class="lesson-sheet">
        <header class="lesson-nav">
          <div class="lesson-nav-title">
            <button type="button" class="lesson-back" @click="router.push(backTo)">
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

        <div class="lesson-columns" :class="{ 'no-check': !section.check }">
          <div class="lesson-scroll">
            <div class="lesson-chips">
              <span class="lesson-chip">{{ copy('sectionOf', { n: index + 1, m: sectionKeys.length }) }}</span>
              <span v-if="minuteCount != null" class="lesson-chip">
                <LucideIcon name="clock" :size="14" />
                {{ copy('minutes', { n: minuteCount }) }}
              </span>
            </div>
            <AcademyBlocks
              v-if="!section.widgets"
              :title="text(section.title)"
              :blocks="section.blocks || []"
              :lang="lang"
              :insight-label="copy('keyInsight')"
              :tip-label="copy('practicalTip')"
            />
            <ModuleWidgets
              v-else
              :title="text(section.title)"
              :widgets="section.widgets"
              :lang="lang"
              :answers="runstate.answers || {}"
              :show-result="showResult"
              :insight-label="copy('keyInsight')"
              :tip-label="copy('practicalTip')"
              :check-label="copy('checkAnswer')"
              @answer="answerWidget"
            />
            <p v-if="playError" class="academy-error">{{ playError }}</p>
            <KnowledgeCheck
              v-if="section.check"
              class="lesson-check lesson-check-mobile"
              :q-label="`Q${questionNumber}`"
              :heading="copy('knowledgeCheck')"
              :lead="copy('answerFirst')"
              :prompt="text(section.check.prompt)"
              :options="optionLabels"
              :selected="shownSelected"
              :correct-index="correctIndex"
              :revealed="revealed"
              :show-result="showResult"
              :check-label="copy('checkAnswer')"
              :continue-label="primaryLabel"
              :show-previous="index > 0"
              :previous-label="copy('previous')"
              @select="pick"
              @check="checkAnswer"
              @continue="onPrimary"
              @previous="goTo(index - 1)"
            />
          </div>
          <div class="lesson-pager" :class="{ 'with-actions': !section.check }">
            <button
              v-if="!section.check"
              type="button"
              class="lesson-pager-side"
              :disabled="index === 0"
              @click="goTo(index - 1)"
            >
              <LucideIcon name="arrow-left" :size="16" />
              {{ copy('previous') }}
            </button>
            <div class="lesson-pages">
              <button
                v-for="(key, page) in sectionKeys"
                :key="key"
                type="button"
                class="lesson-page-btn"
                :aria-current="page === index ? 'page' : undefined"
                :disabled="!canOpen(page)"
                @click="goTo(page)"
              >
                {{ page + 1 }}
              </button>
            </div>
            <button
              v-if="!section.check"
              type="button"
              class="lesson-pager-next"
              :disabled="checksPending"
              @click="onPrimary"
            >
              {{ primaryLabel }}
              <LucideIcon name="arrow-right" :size="16" />
            </button>
          </div>
          <KnowledgeCheck
            v-if="section.check"
            class="lesson-check lesson-check-desktop"
            :q-label="`Q${questionNumber}`"
            :heading="copy('knowledgeCheck')"
            :lead="copy('answerFirst')"
            :prompt="text(section.check.prompt)"
            :options="optionLabels"
            :selected="shownSelected"
            :correct-index="correctIndex"
            :revealed="revealed"
            :show-result="showResult"
            :check-label="copy('checkAnswer')"
            :continue-label="primaryLabel"
            :show-previous="index > 0"
            :previous-label="copy('previous')"
            @select="pick"
            @check="checkAnswer"
            @continue="onPrimary"
            @previous="goTo(index - 1)"
          />
        </div>
      </section>
      <p v-if="toast" class="lesson-toast" :class="toast" role="status">
        <LucideIcon :name="toast === 'ok' ? 'circle-check' : 'circle-x'" :size="16" />
        {{ toast === 'ok' ? copy('answerCorrect') : copy('answerIncorrect') }}
      </p>
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
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import {
  answerCheck,
  continueSection,
  emptyRunstate,
  localizedText,
  openModule,
  orderedKeys,
} from '@/utils/teacher-academy.js'
import { loadAcademyDocument, loadRunstate, loadSnapshot, savePlay, saveSnapshot } from '@/utils/teacher-academy-io.js'
import { fixtureRecord, isAcademyFixture, readFixtureRun, readFixtureSnapshot, writeFixtureRun, writeFixtureSnapshot } from './fixtures.js'
import AcademyBlocks from './AcademyBlocks.vue'
import KnowledgeCheck from './KnowledgeCheck.vue'
import ModuleWidgets from './ModuleWidgets.vue'
import DownloadResourcesDialog from './DownloadResourcesDialog.vue'
import { describeDownload, openDownloads } from './downloads.js'
import { reloadWhenShown, useAcademyPage } from './useAcademyPage.js'

const route = useRoute()
const { store, router, lang, copy } = useAcademyPage()
const moduleId = computed(() => route.params.id)
const doc = ref(null)
const snapshot = ref(null)
const runstate = ref(emptyRunstate())
const loading = ref(true)
const error = ref('')
const playError = ref('')
const pending = ref(null)
const toast = ref('')
const showDownloads = ref(false)
const backTo = '/teacher/academy'
let toastTimer = 0

const sectionKeys = computed(() => orderedKeys(doc.value?.sections))
const index = computed(() => {
  const max = Math.max(0, sectionKeys.value.length - 1)
  return Math.min(Math.max(0, runstate.value.sectionIndex || 0), max)
})
const sectionKey = computed(() => sectionKeys.value[index.value])
const section = computed(() => doc.value?.sections?.[sectionKey.value] || null)
const percent = computed(() => Math.round((snapshot.value?.modules?.[moduleId.value]?.progress || 0) * 100))
const selected = computed(() => {
  const value = runstate.value.answers?.[sectionKey.value]
  return value == null ? null : value
})
const correctIndex = computed(() => (
  section.value?.check?.options?.findIndex((option) => option.correct) ?? -1
))
const optionLabels = computed(() => (section.value?.check?.options || []).map((option) => text(option.text)))
const questionNumber = computed(() => {
  const keys = sectionKeys.value.filter((key) => doc.value?.sections?.[key]?.check)
  return Math.max(1, keys.indexOf(sectionKey.value) + 1)
})
const primaryLabel = computed(() => copy('continueNext'))
const showResult = computed(() => doc.value?.correctnessFeedback !== 'summaryOnly')
const minuteCount = computed(() => {
  const sectionMinutes = section.value?.estimatedMinutes
  if (sectionMinutes != null && Number.isFinite(Number(sectionMinutes))) return Number(sectionMinutes)
  return doc.value?.durationMinutes ?? null
})
const checksPending = computed(() => (
  (section.value?.checks || []).some((check) => runstate.value.answers?.[check.id] == null)
))
const downloadFiles = computed(() => (doc.value?.downloads || []).map((file) => describeDownload(file, text)))
const revealed = computed(() => (
  Boolean(section.value?.check) && runstate.value.answers?.[sectionKey.value] != null
))
const shownSelected = computed(() => (
  revealed.value ? selected.value : pending.value
))

watch(sectionKey, () => {
  pending.value = null
  clearToast()
})

onBeforeUnmount(clearToast)

function text(value) {
  return localizedText(value, lang.value)
}

function saveDownloads(files) {
  openDownloads(files)
  showDownloads.value = false
}

function canOpen(page) {
  if (page <= 0) return true
  const previous = sectionKeys.value[page - 1]
  return runstate.value.continued?.[previous] === true
}

async function persist(result) {
  snapshot.value = result.snapshot
  runstate.value = result.runstate
  if (isAcademyFixture(moduleId.value)) {
    writeFixtureSnapshot(result.snapshot)
    writeFixtureRun(moduleId.value, result.runstate)
    return
  }
  await saveSnapshot(store, result.snapshot)
  await savePlay(store, moduleId.value, result.runstate, result.publicEntry)
}

function clearToast() {
  toast.value = ''
  clearTimeout(toastTimer)
}

function showToast(kind) {
  toast.value = kind
  clearTimeout(toastTimer)
  toastTimer = setTimeout(clearToast, 3000)
}

function pick(optionIndex) {
  if (revealed.value) return
  pending.value = optionIndex
}

async function checkAnswer() {
  if (pending.value == null || revealed.value) return
  const optionIndex = pending.value
  const saved = await choose(optionIndex)
  if (!saved) return
  if (showResult.value) showToast(optionIndex === correctIndex.value ? 'ok' : 'bad')
}

async function answerWidget({ id, optionIndex }) {
  playError.value = ''
  const result = answerCheck({
    snapshot: snapshot.value,
    runstate: runstate.value,
    module: doc.value,
    moduleId: moduleId.value,
    sectionKey: sectionKey.value,
    checkId: id,
    optionIndex,
    now: Date.now(),
  })
  if (!result.ok || result.unchanged) return
  try {
    await persist(result)
    if (!showResult.value) return
    const check = (section.value?.checks || []).find((item) => item.id === id)
    const correct = check?.options?.[optionIndex]?.correct === true
    showToast(correct ? 'ok' : 'bad')
  } catch (err) {
    if (err?.code === 'forbidden') router.replace('/')
    else playError.value = copy('playFailed')
  }
}

async function choose(optionIndex) {
  playError.value = ''
  const result = answerCheck({
    snapshot: snapshot.value,
    runstate: runstate.value,
    module: doc.value,
    moduleId: moduleId.value,
    sectionKey: sectionKey.value,
    optionIndex,
    now: Date.now(),
  })
  if (!result.ok) return false
  if (result.unchanged) return true
  try {
    await persist(result)
    return true
  } catch (err) {
    if (err?.code === 'forbidden') router.replace('/')
    else playError.value = copy('playFailed')
    return false
  }
}

function onPrimary() {
  advance()
}

async function advance() {
  playError.value = ''
  const result = continueSection({
    snapshot: snapshot.value,
    runstate: runstate.value,
    module: doc.value,
    moduleId: moduleId.value,
    sectionKey: sectionKey.value,
    now: Date.now(),
  })
  if (!result.ok) return
  try {
    await persist(result)
    if (result.publicEntry.status === 'completed') {
      router.push(`/teacher/academy/module/${moduleId.value}/review`)
    }
  } catch (err) {
    if (err?.code === 'forbidden') router.replace('/')
    else playError.value = copy('playFailed')
  }
}

async function goTo(page) {
  if (!canOpen(page) || page === index.value) return
  runstate.value = { ...runstate.value, sectionIndex: page }
  try {
    if (isAcademyFixture(moduleId.value)) writeFixtureRun(moduleId.value, runstate.value)
    else await savePlay(store, moduleId.value, runstate.value, null)
  } catch (err) {
    if (err?.code === 'forbidden') router.replace('/')
    else playError.value = copy('playFailed')
  }
}

async function loadLesson() {
  try {
    if (isAcademyFixture(moduleId.value)) {
      const sample = fixtureRecord(moduleId.value)
      if (!sample || sample.kind !== 'module') {
        error.value = copy('notFound')
        return
      }
      doc.value = sample.doc
      snapshot.value = readFixtureSnapshot()
      runstate.value = readFixtureRun(moduleId.value) || emptyRunstate()
      const opened = openModule(snapshot.value, moduleId.value, Date.now())
      snapshot.value = opened.snapshot
      writeFixtureSnapshot(opened.snapshot)
      return
    }
    const loaded = await loadAcademyDocument(store, moduleId.value)
    if (!loaded || loaded.kind !== 'module') {
      error.value = copy('notFound')
      return
    }
    doc.value = loaded.doc
    snapshot.value = await loadSnapshot(store)
    runstate.value = await loadRunstate(store, moduleId.value) || emptyRunstate()
    const opened = openModule(snapshot.value, moduleId.value, Date.now())
    snapshot.value = opened.snapshot
    await saveSnapshot(store, opened.snapshot)
    if (opened.created) await savePlay(store, moduleId.value, runstate.value, opened.publicEntry)
  } catch (err) {
    if (err?.code === 'forbidden') router.replace('/')
    else error.value = copy('notFound')
  } finally {
    loading.value = false
  }
}

reloadWhenShown(loadLesson)
</script>

<style src="./academy.css"></style>
