<template>
  <div v-if="study">
    <h1>
      {{ study.name }}
    </h1>
    Content: 
    {{ study.content }}
    <p>
      {{ study.description }}
    </p>
    <div>
      Files
      <ul>
        <li v-for="id in study.files">
          <button @click="download(id)">download</button>
          <ContentName :id="id" />
        </li>
      </ul>
    </div>
    <GroupAssigner
      :id="id"
      :groups="$store.getters['groups/groups']('class')"
      assignment_type="teacher-to-student-research"
    />
  </div>
  <div v-else>
    ...
  </div>
</template>

<script>
  import GroupAssigner from '../../components/groups/assigner.vue'
  import ContentName from '../../components/content-name.vue'

  export default {
    components: {
      ContentName,
      GroupAssigner
    },
    props: {
      id: String
    },
    data() {
      return {
        study: null
      }
    },
    async created() {
      const { item_id } = this.$store.getters['assignments/get'](this.id)
      this.study = await Agent.state(item_id)
    },
    methods: {
      download(id) { Agent.download(id).direct() }
    }
  }

</script>