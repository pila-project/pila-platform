<template>
  <div style="margin: 2em auto; max-width: 512px;">
    <v-card class="pa-4">
      <div v-html="instructionMarkdown" />
    </v-card>
    <br>
    <v-select
      v-model="form.type"
      :items="[
        { label: t('report-bug'), value: 'bug' },
        { label: t('suggest-a-feature'), value: 'feature' }
      ]"
      item-title="label"
      item-value="value"
      variant="outlined"
    />
    <br>
    <v-card
      v-if="form.type === 'bug'"
      class="pa-6"
      max-width="600"
    >
      <v-card-title class="text-h5">{{t('bug-report')}}</v-card-title>

      <v-card-text>
        <v-form ref="formRef" v-if="!submitted" @submit.prevent="handleBugSubmit">
          <v-textarea
            v-model="form.description"
            :label="t('bug-description')"
            rows="3"
            variant="outlined"
            :rules="[v => !!v || t('description-is-required')]"
            required
          />

          <v-textarea
            v-model="form.steps"
            :label="t('steps-to-reproduce')"
            rows="3"
            variant="outlined"
            :rules="[v => !!v || t('steps-to-reproduce-are-required')]"
            required
          />

          <v-btn
            type="submit"
            color="primary"
            class="mt-4"
            :elevation="hovering ? 8 : 2"
            @mouseover="hovering = true"
            @mouseleave="hovering = false"
          >
            {{ t('submit') }}
          </v-btn>
        </v-form>

        <div v-else class="text-center">
          <p class="mb-4">{{t('thank-you-your-feedback-has-been-sent-our-team-w')}}</p>
          <v-btn
            color="secondary"
            @click="resetForm"
            :elevation="hoveringReset ? 8 : 2"
            @mouseover="hoveringReset = true"
            @mouseleave="hoveringReset = false"
          >
            {{ t('report-another-bug') }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
    <v-card
      v-if="form.type === 'feature'"
      class="pa-6"
      max-width="600"
    >
      <v-card-title class="text-h5">
       {{ t('suggest-a-feature') }}
      </v-card-title>

      <v-card-text>
        <v-form ref="formRef" v-if="!submitted" @submit.prevent="handleFeatureSubmit">
          <v-text-field
            v-model="form.suggestionTitle"
            :rules="[v => !!v || t('description-is-required')]"
            :label="t('feature-title')"
            :placeholder="t('feature-title')"
            variant="outlined"
            required
          />

          <v-textarea
            v-model="form.suggestion"
            :rules="[v => !!v || t('description-is-required')]"
            :label="t('your-suggestion')"
            :placeholder="t('your-suggestion')"
            rows="4"
            variant="outlined"
            required
          />
          <v-btn
            type="submit"
            color="primary"
            class="mt-4"
            :elevation="hovering ? 8 : 2"
            @mouseover="hovering = true"
            @mouseleave="hovering = false"
          >
            {{ t('submit') }}
          </v-btn>
        </v-form>
        <div v-else class="text-center">
          <p class="mb-4">{{t('thank-you-your-feedback-has-been-sent-our-team-w')}}</p>
          <v-btn
            color="secondary"
            @click="resetForm"
            :elevation="hoveringReset ? 8 : 2"
            @mouseover="hoveringReset = true"
            @mouseleave="hoveringReset = false"
          >
            {{ t('request-another-feature') }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const t = useStore().getters.t
const formRef = ref()

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
const hovering = ref(false)
const hoveringReset = ref(false)

async function handleBugSubmit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

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
  const { valid } = await formRef.value.validate()
  if (!valid) return

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

<style scoped>
.bug-report {
  max-width: 500px;
  margin: 2rem auto;
  padding: 1.5rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
.bug-report h2 {
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 1rem;
}
.field {
  margin-bottom: 1rem;
}
.field label {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}
.field textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  resize: vertical;
}
.submit-btn,
.reset-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.submit-btn {
  background: #2563eb;
  color: white;
}
.submit-btn.hover {
  background: #1e4db7;
}
.reset-btn {
  background: #e5e7eb;
  color: #111;
}
.reset-btn.hover {
  background: #d1d5db;
}
.thank-you {
  text-align: center;
}
.thank-you p {
  color: green;
  font-weight: 600;
  margin-bottom: 1rem;
}
</style>
