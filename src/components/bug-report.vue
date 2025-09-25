<template>
  <div class="bug-report">
    <h2>Bug Report</h2>

    <form v-if="!submitted" @submit.prevent="handleSubmit">
      <div class="field">
        <label for="description">Bug Description</label>
        <textarea
          id="description"
          v-model="form.description"
          required
          rows="3"
        ></textarea>
      </div>

      <div class="field">
        <label for="steps">Steps to Reproduce</label>
        <textarea
          id="steps"
          v-model="form.steps"
          required
          rows="3"
        ></textarea>
      </div>

      <button
        type="submit"
        class="submit-btn"
        @mouseover="hovering = true"
        @mouseleave="hovering = false"
        :class="{ hover: hovering }"
      >
        Submit
      </button>
    </form>

    <div v-else class="thank-you">
      <p>✅ Thank you, your data has been reported!</p>
      <button
        @click="resetForm"
        class="reset-btn"
        @mouseover="hoveringReset = true"
        @mouseleave="hoveringReset = false"
        :class="{ hover: hoveringReset }"
      >
        Report Another Bug
      </button>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'

const form = reactive({
  description: '',
  steps: '',
})

const submitted = ref(false)
const hovering = ref(false)
const hoveringReset = ref(false)

async function handleSubmit() {
  const { auth: { user } } = await Agent.environment()
  const x = await Agent.state('bug-report-xapi')
  x.xapi = {
    actor: user,
    verb: 'reported',
    object: 'bug',
    result: {
      response: `DESCRIPTION: ${form.description} :: STEPS: ${form.steps}`
    }
  }
  submitted.value = true
  form.description = ''
  form.steps = ''
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
