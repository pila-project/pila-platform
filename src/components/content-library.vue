<template>
  <div class="cards-wrapper">

    <div v-if="selectedContent" class="tag-container">
      <button @click="selectedContent = null">close</button>
      <pre><vueScopeComponent metadata :id="selectedContent" /></pre>
    </div>
    <div v-else class="tag-container">
      <div
        v-for="_, id in selectedTags"
        :key="id"
        @click="delete selectedTags[id]"
      >
        <vueScopeComponent :id="id" :path="['name']" />
      </div>
      <input v-model="tagSearchQuery" placeholder="Search Tags" />
      <div
        v-for="{ id } in tagMatches"
        class="tag-match"
        @click="() => {
          if (selectedTags[id]) delete selectedTags[id]
          else selectedTags[id] = true
        }"
        :class="{
          'tag-match': true,
          selected: !!selectedTags[id]
        }"
      >
        <h2><vueScopeComponent :id="id" :path="['name']" /></h2>
        <p><vueScopeComponent :id="id" :path="['description']" /></p>
      </div>
    </div>
    <div v-if="tagFilters" class="tagging-match-container">
      <div
        v-for="match in taggingMatches"
        @click="selectedContent = selectedContent === match.content_id ? null : match.content_id"
      >
        {{ match }}
      </div>
    </div>
    <div v-else class="card-container">
      <div class="card new-item-card">
        <div>
          <div class="content-name">{{t('add-content')}}</div>
          <div>
            <IconButton
              icon="plus-circle"
              @click="showAddModal = true"
              :text="t('add-content-by-id-or-url')"
              background="#FFC442"
            />
            <br>
            <IconButton
              icon="plus-circle"
              @click="showCreateModal = true"
              :text="t('create-new-content')"
              background="#FFC442"
            />
          </div>
        </div>
      </div>
      <ContentLibraryCard
         v-for="id in filteredContent"
        :key="id"
        :id="id"
        :selected="selectable && selected === id"
        @click="$emit('select', id)"
        @preview="previewing = id"
        @remove="$store.dispatch('pila_tags/untag', { content_id: id, tag_type: 'tracked' })"
      />
    </div>
  </div>
  <PILAModal
    v-if="showAddModal"
    @close="event => trackContent(event, contentId)"
    showCloseButton
    :closeButtonText="contentIdValidated ? t('add') : t('cancel')"
  >
    <template v-slot:title>{{ t('add-content-by-id-or-url') }}</template>
    <template v-slot:body>
      <div style="text-align: center;">
        <input
          style="width: 50%; text-align: center;"
          type="text"
          class="rounded-grey"
          placeholder="content code OR url"
          v-model="contentId"
        />
        <div v-if="!contentIdValidated">
          {{ t('invalid-id-or-url') }}
        </div>
      </div>
    </template>
  </PILAModal>
  <PILAModal
    v-if="showCreateModal"
    @close="event => createContent(event, contentToCreate)"
    showCloseButton
    :closeButtonText="contentToCreate ? t('create') : t('cancel')"
  >
    <template v-slot:title>{{ t('add-content-by-id-or-url') }}</template>
    <template v-slot:body>
      {{previewing}}
      <div style="padding: 0 32px;">
        <h3>{{ t('select-content-type') }}</h3>
        <br>
        <label>
          <input type="radio" :checked="contentToCreate === 'karel-map'" @click="contentToCreate = 'karel-map'" />
          {{t('create-karel-map-block-based-programming')}}
        </label>
        <br>
        <label>
          <input type="radio" :checked="contentToCreate === 'bettys-brain'" @click="contentToCreate = 'bettys-brain'" />
          {{t('create-bettys-brain-concept-map-and-virtual-agents')}}
        </label>
      </div>
    </template>
  </PILAModal>
  <PreviewModal
    v-if="previewing"
    :id="previewing"
    @close="previewing = null"
  />
</template>

<script>
  import ContentLibraryCard from './content-library-card.vue'
  import IconButton from './icon-button.vue'
  import PILAModal from './PILAModal.vue'
  import PreviewModal from './PreviewModal.vue'
  import ProjectSelector from './project-selector.vue'
  import TagSelector from './tag-selector.vue'
  import URL_CONTENT_DATA from '../url-content-data.js'
  import contentTags from '../content-tags.js'
  import { validate as isUUID } from 'uuid'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'

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
      ContentLibraryCard,
      vueScopeComponent,
      PILAModal,
      PreviewModal,
      ProjectSelector,
      TagSelector,
      IconButton
    },
    emits: ['select'],
    data() {
      return {
        contentId: '',
        contentIdValidated: null,
        showAddModal: false,
        previewing: null,
        showCreateModal: false,
        contentToCreate: '',
        activeProjects: [ 'karel', 'candli', 'betty' ],
        activeTags: [],
        showFilters: false,
        tagSearchQuery: '',
        tagMatches: [],
        taggingMatches: [],
        selectedTags: {},
        selectedContent: null
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
    watch: {
      async contentId(val) {
        if (isURL(val)) { // if url, validated if betty or candli
          this.contentIdValidated = this.isBettyLink(val) || this.isCandliLink(val)
        } else if (isUUID(val)) { // if uuid, validated if karel map
          const res = await Agent.metadata(this.contentId)
          this.contentIdValidated = (res?.active_type?.startsWith('application/json;type=karel-map')) // allow all versions
        } else { // else not validated
          this.contentIdValidated = false
        }
      },
      tagSearchQuery(val) {
        clearTimeout(this.lastTagSearchTimeout)
        this.lastTagSearchTimeout = setTimeout(async () => {
          const response = await Agent.query('search-tags', [val], 'f74e9cb3-2b53-4c85-9b0c-f1d61b032b3f.localhost:5222')
          if (val === this.tagSearchQuery) this.tagMatches = response
        }, 500)
      },
      async tagFilters(val) {
        if (!val) return this.taggingMatches = []

        const response = await Agent.query('taggings', [val], 'f74e9cb3-2b53-4c85-9b0c-f1d61b032b3f.localhost:5222')
        //  TODO: invalidate if does not match
        this.taggingMatches = response
      }
    },
    computed: {
      tagFilters() {
        const selected = Object.keys(this.selectedTags)
        return selected.length ? selected : null
      },
      filteredContent() {
        const filteredByType = this.content.filter(id => (this.activeProjects.includes('betty') && this.isBettyLink(id))
            || (this.activeProjects.includes('candli') && this.isCandliLink(id))
            || (this.activeProjects.includes('karel') && isUUID(id))
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
      },
      URL_CONTENT_DATA() {
        return URL_CONTENT_DATA
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
      trackContent(event, content_id) {
        if (event === 'primary-button') {
          this.$store.dispatch('pila_tags/tag', { content_id, tag_type: 'tracked' })
        }
        this.showAddModal = false
      },
      isCandliLink(id) {
        return id && (id.startsWith('https://pila.cand.li/') || id === '1d77b2e0-f214-4c28-a06e-2186b7f1e0b2')
      },
      isBettyLink(id) {
        return id && id.startsWith('https://bettysbrain.knowlearning.systems/')
      },
      remove(content_id) {
        this.$store.dispatch('pila_tags/untag', { content_id, tag_type: 'tracked' })
      },
      createContent(event, type) {
        if (event === 'primary-button') {
          if (type === 'karel-map') {
            window.open('https://the-karel-project.netlify.app/karel-builder?mode=maps', '_blank')
          }
          else if (type === 'bettys-brain') {
            window.open('https://bettysbrain.knowlearning.systems/bb/custom/causal-map?auth=true&oecd=true&custom=true', '_blank')
          }
        }
        this.showCreateModal = false
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
    display: flex;
    padding: 16px;
  }

  .tagging-match-container
  {
    flex-grow: 1;    
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

  .tag-match.selected
  {
    background: chartreuse;
  }
</style>
