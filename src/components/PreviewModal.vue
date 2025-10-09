<template>
  <PILAModal
    @close="$emit('close')"
    showCloseButton
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
  </PILAModal>
</template>

<script>
  import { vueScopeComponent, vueEmbedComponent } from '@knowlearning/agents/vue.js'
  import URL_CONTENT_DATA from '../url-content-data.js'
  import PILAModal from './PILAModal.vue'

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
    components: {
      PILAModal,
      vueScopeComponent,
      vueEmbedComponent
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) },
      async addPreviewVariable(e) {
        const env = await Agent.environment(e)
        if (env.variables) return { ...env, variables: { ...env.variables, PREVIEW: true } }
        else return env

      }
    },
    computed: {
      URL_CONTENT_DATA() {
        return URL_CONTENT_DATA
      }
    }
  }
</script>