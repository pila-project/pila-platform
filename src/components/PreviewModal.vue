<template>
  <PILAModal
    @close="$emit('close')"
    showCloseButton
  >
    <template v-slot:title>
      <span>{{ t('previewing') }} "<vueScopeComponent :id="id" :path="['content', 'name']" />"</span>
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
    }
  }
</script>