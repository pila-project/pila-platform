<template>
  <v-list-item @click.stop.prevent="() => {
    if (loaded && childTags.length === 0) emit('select', props.tag)
    else open = !open
  }">
    <template v-slot:prepend>
      <span :style="`display: block; width: ${depth * 48}px`" />
      <v-icon
        v-if="loaded && childTags.length === 0"
        :icon="`fa-regular fa-square${selected.includes(props.tag)  ? '-check' : ''}`"
      />
      <v-icon
        v-if="childTags.length"
        :style="{ marginLeft: `${ Math.max(depth-1, 0) * 48 }px`}"
        @click.stop="open = !open"
        :icon="`fa-solid fa-chevron-${ open ? 'down' : 'right'}`"
      />
    </template>
    <v-list-item-title
      draggable
      @dragstart="$event.dataTransfer.setData('text', props.tag)"
      @dragover.prevent
    >
      <vueScopeComponent :id="props.tag" :path="['name']" />
    </v-list-item-title>
  </v-list-item>
  <TagTaggingsList
    v-if="open"
    :tags="childTags"
    :partition="props.partition"
    :selected="props.selected"
    :depth="props.depth + 1"
    @select="tag => emit('select', tag)"
  />
</template>

<script setup>
  import { ref } from 'vue'
  import TagTaggingsList from './tag-taggings-list.vue'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'

  const emit = defineEmits(['select'])

  const props = defineProps({
    tag: String,
    partition: String,
    selected: Array,
    depth: {
      type: Number,
      default: 0
    }
  })
  const open = ref(false)
  const childTags = ref([])
  const loaded = ref(false)

  Agent
    .query('taggings-targeting-tags', [props.partition, props.tag], 'tags.knowlearning.systems')
    .then(r => {
      childTags.value = r.map(t => t.target)
      loaded.value = true
    })

</script>

<style scoped>
  .sub-list
  {
    margin-left: 32px;
  }
</style>