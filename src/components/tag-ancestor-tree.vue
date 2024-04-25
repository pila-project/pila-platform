<template>
  <v-container>
    <v-list>
      <tree-node
        v-for="(node, id) in tree"
        :key="id"
        :id="id"
        :target="props.target"
        :node="node"
        :level="0"
      />
    </v-list>
  </v-container>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import TreeNode from './tag-ancestor-tree-node.vue'

  const props = defineProps({ partition: String, target: String })

  const ancestorPaths = ref([])

  Agent
    .query(
      'tag-ancestor-paths',
      [props.partition, props.target],
      'tags.knowlearning.systems'
    )
    .then(r => {
      //  add tag to end of each path to render it
      ancestorPaths.value = r.map(({ path }) => [...path, props.target])
    })

  const tree = computed(() => {
    const root = {}
    ancestorPaths.value.forEach(path => {
      let current = root
      path.forEach(id => current = current[id] = current[id] || {})
    })
    return root
  })
</script>
