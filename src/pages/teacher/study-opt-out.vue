<template>
  <v-container class="py-10" style="max-width: 720px;">
    <h1 class="text-h4 mb-2">{{ t('opt-out-of-treatment-group') }}</h1>
    <p class="text-body-1 mb-6">
      {{ t('if-you-opt-out-you-will-no-longer-be-included-in') }}
    </p>

    <v-alert
      v-if="optedOut"
      type="success"
      variant="flat"
      class="mb-6"
    >
      {{ t('youre-currently-opted-out-of-the-treatment-group') }}
    </v-alert>

    <v-alert
      v-else
      type="info"
      variant="flat"
      class="mb-6"
    >
      {{ t('you-are-currently-included-in-the-treatment-grou') }}
    </v-alert>

    <v-card class="pa-4 mb-8">
      <h2 class="text-h6 mb-2">{{ t('what-opting-out-means') }}</h2>
      <ul class="pl-6">
        <li class="mb-1">{{ t('you-will-be-excluded-from-future-experiments-for') }}</li>
        <li class="mb-1">{{ t('you-can-request-to-opt-back-in-later-by-contacti') }}</li>
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
        {{ optedOut ? t('already-opted-out') : t('opt-out-of-treatment-group') }}
      </v-btn>

      <v-btn
        variant="text"
        @click="refreshStatus"
        :disabled="loading"
      >
        {{ t('refresh-status') }}
      </v-btn>
    </div>

    <!-- Confirm dialog -->
    <v-dialog v-model="confirmOpen" max-width="520">
      <v-card>
        <v-card-title class="text-h6">{{ t('confirm-opt-out') }}</v-card-title>
        <v-card-text>
          <span>
            {{ t('you-will-be-excluded-from-future-experiments-for') }} ({{ PARTITION }}).
          </span>
          <span>{{ t('you-can-revert-later-by-clearing-your-opt-out-ta') }}</span>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="confirmOpen = false">{{ t('cancel') }}</v-btn>
          <v-btn
            color="primary"
            :loading="loading"
            @click="optOutConfirmed"
          >
            {{ t('yes-opt-me-out') }}
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
import { useStore } from 'vuex'
import {
  HOST_TO_PARTITION,
  OPT_OUT_TAG
} from '../../constants.js'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

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
  await Agent.response()
}

async function optOutConfirmed() {
  loading.value = true
  await optOut()
  await new Promise(r => setTimeout(r, 2000))
  await refreshStatus()
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
