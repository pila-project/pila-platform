<template>
  <v-container class="py-10" style="max-width: 720px;">
    <h1 class="text-h4 mb-2">Opt out of treatment group</h1>
    <p class="text-body-1 mb-6">
      If you opt out, you will no longer be included in experimental features or A/B tests tied to this account.
      You will continue to have normal access, but new experimental changes may not be shown to you.
    </p>

    <v-alert
      v-if="optedOut"
      type="success"
      variant="flat"
      class="mb-6"
    >
      You’re currently opted out of the treatment group for this partition.
    </v-alert>

    <v-alert
      v-else
      type="info"
      variant="flat"
      class="mb-6"
    >
      You are currently included in the treatment group. You can opt out at any time.
    </v-alert>

    <v-card class="pa-4 mb-8">
      <h2 class="text-h6 mb-2">What opting out means</h2>
      <ul class="pl-6">
        <li class="mb-1">You will be excluded from feature experiments for this partition</li>
        <li class="mb-1">Your experience should remain stable and less subject to change</li>
        <li class="mb-1">You can request to opt back in later by contacting support or removing the opt-out tag</li>
      </ul>
    </v-card>

    <div class="d-flex align-center ga-3">
      <v-btn
        color="primary"
        :disabled="loading || optedOut"
        @click="confirmOpen = true"
      >
        <v-progress-circular
          v-if="loading"
          indeterminate
          size="18"
          width="2"
          class="mr-2"
        />
        {{ optedOut ? 'Already opted out' : 'Opt out of treatment group' }}
      </v-btn>

      <v-btn
        variant="text"
        @click="refreshStatus"
        :disabled="loading"
      >
        Refresh status
      </v-btn>
    </div>

    <!-- Confirm dialog -->
    <v-dialog v-model="confirmOpen" max-width="520">
      <v-card>
        <v-card-title class="text-h6">Confirm opt out</v-card-title>
        <v-card-text>
          Opting out will exclude you from experimental features and tests for this partition ({{ PARTITION }}).
          You can revert later by clearing your opt-out tag. Continue?
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="confirmOpen = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="loading"
            @click="optOutConfirmed"
          >
            Yes, opt me out
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Feedback toasts -->
    <v-snackbar v-if="snack" v-model="snack.success" timeout="2500">
      {{ snack.success }}
    </v-snackbar>
    <v-snackbar v-if="snack" v-model="snack.error" timeout="4000" color="error">
      {{ snack.error }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  HOST_TO_PARTITION,
  OPT_OUT_TAG
} from '../../constants.js'

const host = location.host
const PARTITION = HOST_TO_PARTITION[host]

const confirmOpen = ref(false)
const loading = ref(false)
const optedOut = ref(false)
const snack = ref(null)

// --- Stub function for now ---
async function checkOptOutStatus() {
  const { auth: { user } } = await Agent.environment()
  const optOuts = await Agent.query('tagging-for-target', [PARTITION, OPT_OUT_TAG, user], 'tags.knowlearning.systems')
  return optOuts.length !== 0
}

async function checkOptOut() {
  optedOut.value = await checkOptOutStatus()
}

async function optOut() {
  const { auth: { user } } = await Agent.environment()
  const tags = await Agent.state('tags')
  if (!tags[OPT_OUT_TAG]) tags[OPT_OUT_TAG] = {}
  tags[OPT_OUT_TAG][user] = { partition: PARTITION, value: true }
}

async function optOutConfirmed() {
  loading.value = true
  await optOut()
  loading.value = false
  confirmOpen.value = false
}

async function refreshStatus() {
  loading.value = true
  try {
    await checkOptOut()
  } finally {
    loading.value = false
  }
}

onMounted(checkOptOut)
</script>
