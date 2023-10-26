<template>
  <div class="cards-wrapper">
    <IconButton
      icon="plus-circle"
      @click="showAddModal = true"
      text="Add Content"
      background="#FFC442"
    />
    <div class="card-container">
      <div
        v-for="id in content"
        :key="id"
        class="card"
      >
        <vueEmbedComponent
          :id="id"
          mode="preview"
        />
      </div>
    </div>
  </div>
  <PILAModal
    v-if="showAddModal"
    @close="trackContent(contentId)"
    showCloseButton
    :closeButtonText=" showUUIDWarning || contentId === '' ? 'cancel' : 'add'"
  >
    <template v-slot:title>Add Content By Id</template>
    <template v-slot:body>
      <div style="text-align: center;">
        <input
          style="width: 50%; text-align: center;"
          type="text"
          class="rounded-grey"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          v-model="contentId"
          @keydown="showUUIDWarning = false"
        />
        <div v-if="showUUIDWarning">
          invalid id
        </div>
      </div>
    </template>
  </PILAModal>
</template>

<script>
  import TaggedContent from './tagged-content-collection.vue'
  import IconButton from './icon-button.vue'
  import PILAModal from './PILAModal.vue'
  import { validate as isUUID } from 'uuid'
  import { vueScopeComponent, vueEmbedComponent } from '@knowlearning/agents/vue.js'

  export default {
    props: {
      header_tag_types: Array
    },
    components: {
      TaggedContent,
      PILAModal,
      IconButton,
      vueScopeComponent,
      vueEmbedComponent
    },
    data() {
      return {
        contentId: '',
        showAddModal: false
      }
    },
    computed: {
      content() {
        return [
          ...this.$store.getters['pila_tags/withTag']('expert'),
          ...this.$store.getters['pila_tags/withTag']('tracked')
        ]
      },
      showUUIDWarning() {
        return this.contentId !== '' && !isUUID(this.contentId)
      }
    },
    methods: {
      trackContent(content_id) {
        if (isUUID(content_id)) {
          this.$store.dispatch('pila_tags/tag', { content_id, tag_type: 'tracked' })
        }
        this.showAddModal = false
      }
    }
  }
  
</script>

<style scoped>
  .cards-wrapper
  {
    padding: 16px;
  }
  .card-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
  }

  .card {
    border: 2px solid #ccc;
    width: 33%;
    max-width: 256px;
    height: 33vw;
    max-height: 192px;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    margin: 10px;
    max-width: 300px;
    overflow: hidden;
    position: relative;
  }
</style>
