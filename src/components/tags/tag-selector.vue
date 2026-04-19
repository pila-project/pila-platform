<template>
	<div class="tag-selector">
		<PButton
		  v-for="tag in tags"
		  class="tag-select"
		  :key="tag"
          :icon="isActive(tag) ? 'minus-circle' : 'plus-circle'"
          @click="$emit('select', tag)"
          :text="t(tag)"
          :variant="isActive(tag) ? 'primary' : 'secondary'"
		/>
	</div>
</template>

<script>
import { PButton } from '@/components/ui/index.js'
export default {
	name: 'tag-selector',
	components: { PButton },
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
button.tag-select span {
	display: inline-block;
	width: 110px;
	text-align: start;
}
</style>