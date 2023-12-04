<template>
	<div class="tag-selector">
		<IconButton
		  v-for="tag in tags"
		  class="tag-select"
		  :key="tag"
          :icon="isActive(tag) ? 'minus-circle' : 'plus-circle'"
          @click="$emit('select', tag)"
          :text="t(tag)"
          :textColor="isActive(tag) ? 'white' : '#333333'"
          :background="isActive(tag) ? '#2E31DB' : 'lightgrey'"
		/>
	</div>
</template>

<script>
import IconButton from './icon-button.vue'
export default {
	name: 'tag-selector',
	components: { IconButton },
	props: {
		activeTags: {
			type: Array,
			required: true
		},
		tags: {
			type: Array,
			required: false,
			default: () => (['a', 'b', 'c'])
		}
	},
	methods: {
		t(slug) { return this.$store.getters.t(slug) },
		isActive(tag) {
			return this.activeTags.includes(tag)
		}
	}	
}
</script>

<style>
.tag-selector {
	text-align: end;
}
button.icon-button.tag-select span {
	display: inline-block;
	width: 110px;
	text-align: start;
}
</style>