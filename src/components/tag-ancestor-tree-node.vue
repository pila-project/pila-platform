<template>
  <v-list-item>
    <template v-slot:prepend>
      <span
        class="mr-2"
        :style="`
          width: ${level * 48}px;
          display: inline-block;
          text-align: right;
        `">
        <span v-if="level > 0">&#x21B3;</span>
      </span>
    </template>
    <v-list-item-title>
      <v-chip>
        <TagTranslation :id="props.id" />
      </v-chip>
      <v-icon
        v-if="node[props.target]"
        class="ml-2"
        style="margin-right: -6px"
        icon="fa-solid fa-tag"
      />
    </v-list-item-title>
  </v-list-item>
  <tree-node
    v-for="(child, id) in nonLeafChildren"
    :key="id"
    :id="id"
    :node="child"
    :target="props.target"
    :level="props.level + 1"
  />
</template>

<script setup>
  import { computed, defineProps } from 'vue'
  import TagTranslation from './tag-translation.vue'
  import TreeNode from './tag-ancestor-tree-node.vue'

  const props = defineProps({
    id: String,
    node: Object,
    target: String,
    level: Number
  })

  const nonLeafChildren = computed(() => {
    const copy = {...props.node }
    delete copy[props.target]
    return copy
  })

</script>
