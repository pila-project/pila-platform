<template>
  <div style="margin: 2em auto; max-width: 512px;">
    <div class="card">
      <div class="card-body" v-html="instructionMarkdown" />
    </div>
    <br>
    <PSelect
      v-model="form.type"
      :items="[
        { label: t('report-bug'), value: 'bug' },
        { label: t('suggest-a-feature'), value: 'feature' }
      ]"
      item-title="label"
      item-value="value"
    />
    <br>
    <div
      v-if="form.type === 'bug'"
      class="card"
      style="max-width: 600px;"
    >
      <div class="card-header">
        <h3 class="text-lg font-semibold">{{ t('bug-report') }}</h3>
      </div>
      <div class="card-body">
        <form v-if="!submitted" @submit.prevent="handleBugSubmit">
          <PInput
            v-model="form.description"
            :label="t('bug-description')"
            multiline
            :rows="3"
            required
          />
          <div class="mt-3">
            <PInput
              v-model="form.steps"
              :label="t('steps-to-reproduce')"
              multiline
              :rows="3"
              required
            />
          </div>
          <PButton
            type="submit"
            variant="primary"
            :text="t('submit')"
            class="mt-4"
          />
        </form>
        <div v-else class="text-center">
          <p class="mb-4">{{ t('thank-you-your-feedback-has-been-sent-our-team-w') }}</p>
          <PButton
            variant="secondary"
            @click="resetForm"
            :text="t('report-another-bug')"
          />
        </div>
      </div>
    </div>
    <div
      v-if="form.type === 'feature'"
      class="card"
      style="max-width: 600px;"
    >
      <div class="card-header">
        <h3 class="text-lg font-semibold">{{ t('suggest-a-feature') }}</h3>
      </div>
      <div class="card-body">
        <form v-if="!submitted" @submit.prevent="handleFeatureSubmit">
          <PInput
            v-model="form.suggestionTitle"
            :label="t('feature-title')"
            :placeholder="t('feature-title')"
            required
          />
          <div class="mt-3">
            <PInput
              v-model="form.suggestion"
              :label="t('your-suggestion')"
              :placeholder="t('your-suggestion')"
              multiline
              :rows="4"
              required
            />
          </div>
          <PButton
            type="submit"
            variant="primary"
            :text="t('submit')"
            class="mt-4"
          />
        </form>
        <div v-else class="text-center">
          <p class="mb-4">{{ t('thank-you-your-feedback-has-been-sent-our-team-w') }}</p>
          <PButton
            variant="secondary"
            @click="resetForm"
            :text="t('request-another-feature')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { PButton, PInput, PSelect } from '@/components/ui/index.js'

const t = useStore().getters.t

const instructions = t('👉-quick-troubleshooting-checklist-please-make-s') // markdown!
const instructionMarkdown = marked.parse(DOMPurify.sanitize(instructions))

const route = useRoute()

const form = reactive({
  type: 'bug',
  description: '',
  steps: '',
  suggestionTitle: '',
  suggestion: ''
})

const submitted = ref(false)

async function handleBugSubmit() {
  if (!form.description || !form.steps) return

  const { auth: { user } } = await Agent.environment()
  const x = await Agent.state('bug-report-xapi')
  x.xapi = {
    actor: user,
    verb: 'reported',
    object: 'bug',
    result: {
      response: `DESCRIPTION: ${form.description} :: STEPS: ${form.steps}`
    },
    extensions: {
      assignment: route.query?.assignment
    }
  }
  submitted.value = true
  form.description = ''
  form.steps = ''
}

async function handleFeatureSubmit() {
  if (!form.suggestionTitle || !form.suggestion) return

  const { auth: { user } } = await Agent.environment()
  const x = await Agent.state('feature-request-xapi')
  x.xapi = {
    actor: user,
    verb: 'requested',
    object: 'feature',
    result: {
      response: `TITLE: ${form.suggestionTitle} :: SUGGESTION: ${form.suggestion}`
    },
    extensions: {
      assignment: route.query?.assignment
    }
  }
  submitted.value = true
  form.suggestionTitle = ''
  form.suggestion = ''
}

function resetForm() {
  submitted.value = false
}
</script>
