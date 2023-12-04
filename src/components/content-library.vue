<template>
  <div class="cards-wrapper">

    <div class="filters-selector" v-if="showFilters">

      <div style="align-self: flex-start;">
        <IconButton
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

    <div class="card-container">
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
      <div
        v-for="id in filteredContent"
        :key="id"
        class="card"
      >
        <div
          v-if="URL_CONTENT_DATA[id]"
          class="content-name"
        >
          {{ URL_CONTENT_DATA[id].name }}
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
            @preview="previewing = id"
            @remove="remove(id)"
          />
        </div>
      </div>
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
  import TaggedContent from './tagged-content-collection.vue'
  import IconButton from './icon-button.vue'
  import CardIconsBar from './card-icons-bar.vue'
  import PILAModal from './PILAModal.vue'
  import PreviewModal from './PreviewModal.vue'
  import ProjectSelector from './project-selector.vue'
  import TagSelector from './tag-selector.vue'
  import URL_CONTENT_DATA from '../url-content-data.js'
  import contentTags from '../content-tags.js'
  import { validate as isUUID } from 'uuid'
  import { vueScopeComponent, vueEmbedComponent } from '@knowlearning/agents/vue.js'

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
      TaggedContent,
      PILAModal,
      PreviewModal,
      ProjectSelector,
      TagSelector,
      CardIconsBar,
      IconButton,
      vueScopeComponent,
      vueEmbedComponent
    },
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
        showFilters: false
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
      }
    },
    computed: {
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
        return id.startsWith('https://pila.cand.li/')
      },
      isBettyLink(id) {
        return id.startsWith('https://bettysbrain.knowlearning.systems/')
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
  card.bottom {
    color: pink;
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
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 8px;
  }
  .filters-selector {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    align-items: center;

  }
</style>
