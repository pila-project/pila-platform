<template>
  <div
    :class="{ card: true, selected }"
    @click="$emit('select', id)"
  >
    <div
      v-if="URL_CONTENT_DATA[id]"
      class="content-name"
    >
      {{ URL_CONTENT_DATA[id].name }}
    </div>
    <div
      v-else-if="isBettyLink(id)"
      class="content-name"
    >
      <vueScopeComponent
        :id="id.split('/')[4]"
        metadata
        :path="['name']"
      />
    </div>
    <div class="preview-image">
      <img v-if="isCandliLink(id)" src="/candli-logo.svg" />
      <img v-else-if="isBettyLink(id)" src="/betty.png" />
      <vueEmbedComponent
        v-else
        :id="id"
        mode="card"
      />
    </div>
    <div>
      <CardIconsBar
        :id="id"
        :key="`icon-bar-for-${id}`"
        :tags="tagsForId(id)"
        showPreview
        showRemove
        @preview="$emit('preview')"
        @remove="remove(id)"
      />
    </div>
  </div>
</template>

<script>
  import CardIconsBar from './card-icons-bar.vue'
  import URL_CONTENT_DATA from '../url-content-data.js'
  import contentTags from '../content-tags.js'
  import { validate as isUUID } from 'uuid'
  import { vueScopeComponent, vueEmbedComponent } from '@knowlearning/agents/vue.js'

  export default {
    components: {
      CardIconsBar,
      vueScopeComponent,
      vueEmbedComponent
    },
    props: {
      id: {
        type: String,
        required: true
      },
      selected: {
        type: Boolean,
        required: false,
        default: false
      }
    },
    computed: {
      URL_CONTENT_DATA() {
        return URL_CONTENT_DATA
      }
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) },
      tagsForId(id) { return contentTags[id] || [] },
      isCandliLink(id) {
        return id && id.startsWith('https://pila.cand.li/')
      },
      isBettyLink(id) {
        return id && id.startsWith('https://bettysbrain.knowlearning.systems/')
      },
      remove(content_id) {
        this.$store.dispatch('pila_tags/untag', { content_id, tag_type: 'tracked' })
      }
    }
  }
  
</script>

<style>
  button.icon-button.tag-select {
    height: 38px;
    display: inline-flex;
  }
</style>

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
    cursor: pointer;
    display: flex;
    flex-direction: column;
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
  .card.selected {
    border: 2px solid lightseagreen;
    background: rgba(32, 178, 170, 0.3);
  }

  .new-item-card
  {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .preview-image
  {
    pointer-events: none;
    position: relative;
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .preview-image > img
  {
    position: absolute;
    max-width: 80%;
    max-height: 80%;
  }
  .content-name
  {
    display: block;
    color: #5d5d5d;
    font-size: 1.25em;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 8px;
  }
</style>
