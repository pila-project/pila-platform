<template>
  <tr>
    <td>
      <span v-if="loaded">
        <button
          v-if="metadata.external"
          @click="download"
        >
          Download
        </button>
        <button v-else @click="play">Play</button>
      </span>
      <span v-else>...</span>
    </td>
    <td><ContentName :id="id" /></td>
    <td v-for="tag in tags" :id="tag">
      <PCheckbox
        :modelValue="$store.getters['pila_tags/hasTag'](id, tag)"
        size="sm"
        @update:modelValue="val => {
          const action = val ? 'tag' : 'untag'
          $store.dispatch(`pila_tags/${action}`, { content_id: id, tag_type: tag })
        }"
      />
    </td>
    <td>
      <button @click="remove(id, tag_type)">x</button>
    </td>
  </tr>
</template>

<script>
  import ContentName from './content-name.vue'
  export default {
    props: {
      id: String,
      tags: Array,
      tag_type: String,
      UPLOAD_TYPE: {
        type: String,
        default: 'application/json;type=upload'
      }
    },
    components: {
      ContentName
    },
    data() {
      return {
        loaded: false,
        metadata: null
      }
    },
    async created() {
      this.metadata = await Agent.metadata(this.id)
      this.loaded = true
    },
    methods: {
      download() {
        Agent.download(this.id).direct()
      },
      play() {
        alert(`Open up ${this.id}`)
      },
      remove(content_id, tag_type) {
        this.$store.dispatch('pila_tags/untag', { content_id, tag_type })
      }
    }
  }
</script>