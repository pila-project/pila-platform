<template>
  <TaggedContentCards
    v-if="$store.getters.isThailandDomain"
    @select="$emit('select', $event)"
  />
  <div
    v-else
    class="cards-wrapper"
  >
    <div>
      <div class="filters-selector" v-if="showFilters">

        <div style="align-self: flex-start;">
          <IconButton
            class="filter-button"
            icon="minus-circle"
            @click="showFilters = false"
            :text="t('hide-filters')"
            :background="'rgb(107, 234, 201)'"
          />
        </div>

        <ProjectSelector
          :activeProjects="activeProjects"
          @select="toggleActive"
        />
        <TagSelector
          style="width: 550px;"
          :activeTags="activeTags"
          :tags="allItemTags"
          @select="toggleTag"
        />
      </div>

      <IconButton
        v-else
        style="align-self: flex-start;"
        icon="plus-circle"
        @click="showFilters = true"
        :text="t('show-filters')"
        :background="'rgb(107, 234, 201)'"
      />

      <hr>
    </div>

    <div class="card-container">
      <ContentLibraryCard
         v-for="id in filteredContent"
        :key="id"
        :id="id"
        :selected="selfSelected === id"
        @click="() => {
          if (selfSelected === id) selfSelected = null
          else selfSelected = id
          $emit('select', selfSelected)
        }"
        @preview="previewing = id"
        @remove="$store.dispatch('pila_tags/untag', { content_id: id, tag_type: 'tracked' })"
      />
    </div>
  </div>
  <PreviewModal
    v-if="previewing"
    :id="previewing"
    @close="previewing = null"
  />
</template>

<script>
  import TaggedContentCards from './tagged-content-cards.vue'
  import ContentLibraryCard from './content-library-card.vue'
  import IconButton from './icon-button.vue'
  import PILAModal from './PILAModal.vue'
  import PreviewModal from './PreviewModal.vue'
  import ProjectSelector from './project-selector.vue'
  import TagSelector from './tag-selector.vue'
  import TagInfoPanel from './tag-info-panel.vue'
  import contentTags from '../content-tags.js'
  import { validate as isUUID } from 'uuid'

  function isURL(s) {
    try {
      const url = new URL(s)
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  }

  export default {
    components: {
      TagInfoPanel,
      TaggedContentCards,
      ContentLibraryCard,
      PILAModal,
      PreviewModal,
      ProjectSelector,
      TagSelector,
      IconButton
    },
    emits: ['select'],
    data() {
      return {
        previewing: null,
        activeProjects: [ 'karel', 'candli', 'betty' ],
        activeTags: [],
        showFilters: false,
        selfSelected: this.selected
      }
    },
    props: {
      selectable: {
        type: Boolean,
        required: false,
        default: false
      },
      selected: {
        type: String,
        required: false,
        default: null
      }
    },
    computed: {
      filteredContent() {
        if (this.$store.getters.isThailandDomain) return this.$store.getters['content/contentToShow']()
        else return this.oldFilteredContent
      },
      oldFilteredContent() {
        const filteredByType = this.content.filter(id => (this.activeProjects.includes('betty') && this.isBettyLink(id))
            || (this.activeProjects.includes('candli') && this.isCandliLink(id))
            || (this.activeProjects.includes('karel') && isUUID(id)
          )
        )
        const filteredByTypeAndTag = filteredByType.filter(id => {
          return this.activeTags.every(tag => this.tagsForId(id).includes(tag))
        })
        return filteredByTypeAndTag
      },
      allItemTags() {
        const flat = Object.values(contentTags).flat()
        return Array.from( new Set(flat) )
      },
      content() {
        const expert = [ ...this.$store.getters['pila_tags/withTag']('expert') ]
        const tracked = [ ...this.$store.getters['pila_tags/withTag']('tracked') ]
        return Array.from( new Set([...expert, ...tracked]) ).sort()
      }
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) },
      toggleTag(tag) {
        if (this.activeTags.includes(tag)) {
          this.activeTags = this.activeTags.filter(t => t !== tag)
        } else {
          this.activeTags.push(tag)
        }
      },
      tagsForId(id) { return contentTags[id] || [] },
      toggleActive(e) {
        if (this.activeProjects.includes(e)) {
          this.activeProjects = this.activeProjects.filter(p => p !== e)
        } else {
          this.activeProjects.push(e)
        }
      },
      isCandliLink(id) {
        return id && (id.startsWith('https://pila.cand.li/') || id === '1d77b2e0-f214-4c28-a06e-2186b7f1e0b2')
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

  .thailand-cards-wrapper
  {
    display: flex;
  }

  .card-container {
    flex-grow: 1;
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

  .new-item-card
  {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
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
  .filters-selector {
    display: grid;
    grid-template-columns: 2fr 2fr 5fr;
  }
</style>
