<template>
  <div class="cards-wrapper">
    <IconButton
      icon="plus-circle"
      @click="showAddModal = true"
      :text="t('add-content')"
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
          mode="card"
        />
        <CardIconsBar
          :id="id"
          :key="`icon-bar-for-${id}`"
          :showEdit="false"
          showRemove
          @preview="preview(id)"
          @remove="remove(id)"
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
    <template v-slot:title>{{ t('add-content-by-id') }}</template>
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
          {{ t('invalid-id') }}
        </div>
      </div>
    </template>
  </PILAModal>
</template>

<script>
  import TaggedContent from './tagged-content-collection.vue'
  import IconButton from './icon-button.vue'
  import CardIconsBar from './card-icons-bar.vue'
  import PILAModal from './PILAModal.vue'
  import { validate as isUUID } from 'uuid'
  import { vueScopeComponent, vueEmbedComponent } from '@knowlearning/agents/vue.js'

  export default {
    components: {
      TaggedContent,
      PILAModal,
      CardIconsBar,
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
        const expert = [ ...this.$store.getters['pila_tags/withTag']('expert') ]
        const tracked = [ ...this.$store.getters['pila_tags/withTag']('tracked') ]
        return Array.from( new Set([...expert, ...tracked]) ).sort()
      },
      showUUIDWarning() {
        return this.contentId !== '' && !isUUID(this.contentId)
      }
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) },
      trackContent(content_id) {
        if (isUUID(content_id)) {
          this.$store.dispatch('pila_tags/tag', { content_id, tag_type: 'tracked' })
        }
        this.showAddModal = false
      },
      preview(id) {

      },
      remove(content_id) {
        this.$store.dispatch('pila_tags/untag', { content_id, tag_type: 'tracked' })
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
    display: grid;
    grid-template-rows: 5fr 1fr;
    grid-template-columns: 1fr;
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
  card.bottom {
    color: pink;
  }
</style>
