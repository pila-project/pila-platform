<template>
  <div v-if="loading">
    ...
  </div>
  <div v-else>
    <div>
      Name
      <input v-model="study.name" />
    </div>
    <div>
      Description
      <textarea v-model="study.description" />
    </div>
    <div>
      Content
      <input v-model="study.content" />
    </div>
    <div>
      Dashboard
      <input v-model="study.dashboard" />
    </div>
    <div>
      Files
      <ul>
        <li v-for="id, index in study.files">
          <button @click="download(id)">download</button>
          <ContentName :id="id" />
          <button @click="study.files.splice(index, 1)">x</button>
        </li>
      </ul>
      <select v-model="selectedFile">
        <option value="UNSELECTED">Add File</option>
        <option v-for="id in files" :key="id" :value="id">
          <ContentName :id="id" />
        </option>
      </select>
    </div>
  </div>
  <div v-if="isGranted">
    Publish Request GRANTED
  </div>
  <div v-else-if="isGranted">
    Publish Request DENIED
  </div>
  <div v-else>
    <button
      @click="requestPublish"
      v-if="!publishRequested"
    >
      Request Publish
    </button>
    <div v-else>
      Publish Requested
      <button @click="undoRequest">undo</button>
    </div>
  </div>
  {{ id }}
  <GroupAssigner
    :id="id"
    :groups="$store.getters['groups/groups']('teachers')"
    assignment_type="researcher-to-teacher"
  />
</template>

<script>
  import UserInfo from '../../components/user-info.vue'
  import ContentName from '../../components/content-name.vue'
  import GroupAssigner from '../../components/groups/assigner.vue'

  const STUDY_TYPE = 'application/json;type=study'
  const ADMIN_APPROVAL_REQUEST = 'admin-approval-request'

  export default {
    props: {
      id: String
    },
    components: {
      ContentName,
      UserInfo,
      GroupAssigner
    },
    data() {
      return {
        loading: true,
        selectedFile: 'UNSELECTED',
        study: null
      }
    },
    async created() {
      this.study = await Agent.state(this.id)
      Agent.metadata(this.id).then(metadata => {
        if (metadata.active_type !== STUDY_TYPE) metadata.active_type = STUDY_TYPE
      })
      if (!this.study.files) this.study.files = []
      this.loading = false
    },
    computed: {
      isGranted() {
        return this.$store.getters['tags/hasTag'](this.id, 'admin-approved')
      },
      publishRequested() {
        return this.$store.getters['tags/hasTag'](this.id, ADMIN_APPROVAL_REQUEST)
      },
      files() {
        return this.$store.getters['tags/withTag']('file')
      }
    },
    watch: {
      selectedFile(n) {
        if (n === 'UNSELECTED') return
        else {
          this.study.files.push(this.selectedFile)
          this.selectedFile = 'UNSELECTED'
        }
      }
    },
    methods: {
      requestPublish() {
        const tagInfo = {
          content_id: this.id,
          tag_type: ADMIN_APPROVAL_REQUEST
        }
        this.$store.dispatch('tags/tag', tagInfo)
      },
      undoRequest() {
        const tagInfo = {
          content_id: this.id,
          tag_type: ADMIN_APPROVAL_REQUEST
        }
        this.$store.dispatch('tags/untag', tagInfo)
      },
      download(id) {
        Agent.download(id).direct()
      }
    }

  }

</script>

<style>

.assignment-tables {
  display: flex;
  justify-content: space-around;
  align-items: top;
}

</style>