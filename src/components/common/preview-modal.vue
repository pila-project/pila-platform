<template>
  <PModal
    layer="preview"
    @close="$emit('close')"
    showCloseButton
    :closeButtonText="t('close')"
    :width="width"
    :height="height"
    noPadBody
  >
    <template v-slot:title>
      <span>{{ t('previewing') }}
        <span v-if="URL_CONTENT_DATA[id]">"{{ URL_CONTENT_DATA[id].name }}"</span>
      </span>
    </template>
    <template v-slot:body>
      <div class="preview-body">
        <div v-if="loading" class="preview-loader">
          <LucideIcon name="loader-2" :size="32" :spin="true" />
          <span>{{ t('loading') }}…</span>
        </div>
        <vueEmbedComponent
          ref="embedRef"
          :id="id"
          class="preview-embed"
          namespace="preview"
          @close="$emit('close')"
          :environmentProxy="addPreviewVariable"
          allow="camera;microphone;fullscreen"
        />
      </div>
    </template>
  </PModal>
</template>

<script>
  import { vueScopeComponent, vueEmbedComponent } from '@knowlearning/agents/vue.js'
  import URL_CONTENT_DATA from '@/utils/url-content-data.js'
  import studyEnvironmentVariableProxy from '@/utils/study-environment-variable-proxy.js'
  import { PModal } from '@/components/ui/index.js'
  import LucideIcon from '@/components/ui/LucideIcon.vue'

  let varProxy

  export default {
    props: {
      id: String,
      width: {
        type: String,
        default: '90vw'
      },
      height: {
        type: String,
        default: '90vh'
      }
    },
    data() {
      return { loading: true }
    },
    created() {
      varProxy = studyEnvironmentVariableProxy({ PREVIEW: true })
    },
    mounted() {
      // Listen for the iframe's native load event
      this.$nextTick(() => {
        const iframe = this.$refs.embedRef?.$el
        if (iframe && iframe.tagName === 'IFRAME') {
          iframe.addEventListener('load', () => { this.loading = false }, { once: true })
        }
      })
      // Fallback: hide loader after timeout in case load doesn't fire
      this._loaderTimeout = setTimeout(() => { this.loading = false }, 8000)
    },
    beforeUnmount() {
      clearTimeout(this._loaderTimeout)
    },
    components: {
      PModal,
      vueScopeComponent,
      vueEmbedComponent,
      LucideIcon,
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) },
      async addPreviewVariable(e) {
        const fn = await varProxy
        return fn(e)
      }
    },
    computed: {
      URL_CONTENT_DATA() {
        return URL_CONTENT_DATA
      }
    }
  }
</script>

<style scoped>
.preview-body {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1;
}

.preview-embed {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.preview-loader {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #64748b;
  font-size: 14px;
  z-index: 1;
  background: white;
}
</style>