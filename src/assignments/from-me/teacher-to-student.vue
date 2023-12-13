<template>
  <div v-if="loading">
    ...
  </div>
  <div v-else-if="selectingContent">
    <div>
      <div style="height: 48px;">
        <IconButton
          icon="bolt"
          style="
            z-index: 1;
            position: absolute;
            top: 48px;
            left: 32px;
            transform: scale(1.5);
          "
          :text="t('select')"
          @click="selectingContent = false"
          background="#FFC442"
        />
      </div>
      <ContentLibrary
        selectable
        :selected="assignment.content"
        @select="assignment.content = $event"
      />
    </div>
    <div>
      
    </div>
  </div>
  <div style="margin: 16px;" v-else>
    <div>
      <h4>{{ t('give-your-assignment-a-name') }}</h4>
      <input
        v-model="assignment.name"
        class="rounded-grey"
        style="width: 70%;"
      />
      <h4>{{ t('give-your-assignment-a-description') }}</h4>
      <textarea
        v-model="assignment.description"
        class="rounded-grey"
        style="width: 70%; height: 44px;"
      />
    </div>
    <div style="display: flex; justify-content: center;">
      <div style="display: flex; flex-direction: column;">
        <div style="margin: 8px;">
          <h4>{{ t('select-the-content-to-assign') }}*</h4>
        </div>
        <div style="flex-grow: 1;">
          <ContentLibraryCard
            v-if="assignment.content"
            :id="assignment.content"
            :removable="false"
            @preview="previewing = assignment.content"
          />
          <IconButton
            icon="bolt"
            :text="t('select-new')"
            @click="selectingContent = true"
            background="#FFC442"
          />
        </div>
      </div>
      <div style="margin: 8px;">
        <h4>{{ t('select-classes-for-the-assignment') }}*</h4>
        <GroupAssigner
          :id="id"
          :groups="$store.getters['groups/groups']('class')"
          assignment_type="teacher-to-student"
        />
      </div>
    </div>
  </div>
  <PreviewModal
    v-if="previewing"
    :id="previewing"
    @close="previewing = null"
  />
</template>

<script>
  import { v4 as uuid, validate as isUUID } from 'uuid'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import Dashboard from './dashboard/index.vue'
  import GroupAssigner from '../../components/groups/assigner.vue'
  import ContentLibrary from '../../components/content-library.vue'
  import ContentLibraryCard from '../../components/content-library-card.vue'
  import URL_CONTENT_DATA from '../../url-content-data.js'
  import PreviewModal from '../../components/PreviewModal.vue'
  import IconButton from '../../components/icon-button.vue'

  export default {
    props: {
      id: String
    },
    components: {
      IconButton,
      Dashboard,
      GroupAssigner,
      vueScopeComponent,
      ContentLibraryCard,
      ContentLibrary,
      PreviewModal
    },
    data() {
      return {
        loading: true,
        assignment: null,
        previewing: null,
        selectingContent: false
      }
    },
    async created() {
      this.assignment = await Agent.state(this.id)
      this.loading = false
    },
    computed: {
      hasValidContent() {
        return this.assignment && isUUID(this.assignment.content)
      },
      expertContent() {
        return this.$store.getters['pila_tags/withTag']('expert')
      },
      userContent() {
        return this.$store.getters['pila_tags/withTag']('tracked')
      },
      URL_CONTENT_DATA() {
        return URL_CONTENT_DATA
      }
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) }
    }
  }

</script>

<style scoped>
  .content-entry
  {
    padding: 4px 8px;
    border: 1px solid transparent;
    border-radius: 16px;
  }
  .selected
  {
    border: 1px solid blue;
  }
  textarea,
  input {
    width: 70%;
    margin: 2px 0 6px 0;
  }

</style>