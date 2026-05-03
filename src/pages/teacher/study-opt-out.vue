<template>
  <div class="py-10 mx-auto" style="max-width: 720px;">
    <h1 class="text-xl font-semibold mb-2">{{ t('opt-out-of-treatment-group') }}</h1>
    <p class="text-sm text-slate-700 mb-6">
      {{ t('if-you-opt-out-you-will-no-longer-be-included-in') }}
    </p>

    <div
      v-if="optedOut"
      class="mb-6 p-4 rounded-md bg-success-50 text-success-600 text-sm"
    >
      {{ t('youre-currently-opted-out-of-the-treatment-group') }}
    </div>

    <div
      v-else
      class="mb-6 p-4 rounded-md bg-primary-50 text-primary-600 text-sm"
    >
      {{ t('you-are-currently-included-in-the-treatment-grou') }}
    </div>

    <div class="card mb-8">
      <div class="card-body">
        <h2 class="text-base font-semibold mb-2">{{ t('what-opting-out-means') }}</h2>
        <ul class="pl-6 list-disc text-sm text-slate-700">
          <li class="mb-1">{{ t('you-will-be-excluded-from-future-experiments-for') }}</li>
          <li class="mb-1">{{ t('you-can-request-to-opt-back-in-later-by-contacti') }}</li>
        </ul>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <PButton
        variant="primary"
        :disabled="loading || optedOut"
        @click="confirmOpen = true"
      >
        <LucideIcon v-if="loading" name="loader-2" :size="14" :spin="true" class="inline mr-2" />
        {{ optedOut ? t('already-opted-out') : t('opt-out-of-treatment-group') }}
      </PButton>

      <PButton
        variant="text"
        @click="refreshStatus"
        :disabled="loading"
        :text="t('refresh-status')"
      />
    </div>

    <!-- Confirm dialog -->
    <PModal
      v-if="confirmOpen"
      width="520px"
      :title="t('confirm-opt-out')"
      @close="confirmOpen = false"
    >
      <template #body>
        <span>
          {{ t('you-will-be-excluded-from-future-experiments-for') }} ({{ PARTITION }}).
        </span>
        <span>{{ t('you-can-revert-later-by-clearing-your-opt-out-ta') }}</span>
      </template>
      <template #footer>
        <PButton variant="secondary" :text="t('cancel')" @click="confirmOpen = false" />
        <PButton
          variant="primary"
          :disabled="loading"
          @click="optOutConfirmed"
        >
          <LucideIcon v-if="loading" name="loader-2" :size="14" :spin="true" class="inline mr-2" />
          {{ t('yes-opt-me-out') }}
        </PButton>
      </template>
    </PModal>

    <!-- Feedback toasts -->
    <div
      v-if="snackMessage"
      class="fixed bottom-4 right-4 px-4 py-3 rounded-md shadow-lg text-sm z-50"
      :class="snackError ? 'bg-danger-600 text-white' : 'bg-zinc-950 text-white'"
    >
      {{ snackMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { useStore } from 'vuex'
import { PButton, PModal } from '@/components/ui/index.js'
import {
  HOST_TO_PARTITION,
  OPT_OUT_TAG
} from '@/utils/constants.js'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const host = location.host
const PARTITION = HOST_TO_PARTITION[host]

const confirmOpen = ref(false)
const loading = ref(false)
const optedOut = ref(false)
const snackMessage = ref(null)
const snackError = ref(false)

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
