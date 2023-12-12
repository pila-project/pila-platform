<template>
  <PILAModal
    @close="$emit('close')"
    showCloseButton
    width="90vw"
    height="800px"
  >
    <template v-slot:title>
      <span>{{ t('previewing') }}
        <span v-if="URL_CONTENT_DATA[id]">"{{ URL_CONTENT_DATA[id].name }}"</span>
      </span>
    </template>
    <template v-slot:body>
      <div style="height: 60vh; position: relative;">
        <vueEmbedComponent
          :id="id"
          @close="$emit('close')"
        />
      </div>
    </template>
  </PILAModal>
</template>

<script>
  import { vueScopeComponent, vueEmbedComponent } from '@knowlearning/agents/vue.js'
  import URL_CONTENT_DATA from '../url-content-data.js'
  import PILAModal from './PILAModal.vue'

  export default {
    props: {
      id: String
    },
    components: {
      PILAModal,
      vueScopeComponent,
      vueEmbedComponent
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) }
    },
    computed: {
      URL_CONTENT_DATA() {
        return URL_CONTENT_DATA
      }
    }
  }
</script>