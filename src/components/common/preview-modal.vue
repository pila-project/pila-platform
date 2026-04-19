<template>
  <PModal
    @close="$emit('close')"
    showCloseButton
    :closeButtonText="t('close')"
    :width="width"
    :height="height"
  >
    <template v-slot:title>
      <span>{{ t('previewing') }}
        <span v-if="URL_CONTENT_DATA[id]">"{{ URL_CONTENT_DATA[id].name }}"</span>
      </span>
    </template>
    <template v-slot:body>
      <vueEmbedComponent
        :id="id"
        style="position: absolute;"
        namespace="preview"
        @close="$emit('close')"
        :environmentProxy="addPreviewVariable"
        allow="camera;microphone;fullscreen"
      />
    </template>
  </PModal>
</template>

<script>
  import { vueScopeComponent, vueEmbedComponent } from '@knowlearning/agents/vue.js'
  import URL_CONTENT_DATA from '@/utils/url-content-data.js'
  import studyEnvironmentVariableProxy from '@/utils/study-environment-variable-proxy.js'
  import { PModal } from '@/components/ui/index.js'

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
    created() {
      varProxy = studyEnvironmentVariableProxy({ PREVIEW: true })
    },
    components: {
      PModal,
      vueScopeComponent,
      vueEmbedComponent
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