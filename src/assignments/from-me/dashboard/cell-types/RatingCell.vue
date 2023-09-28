<template>
	<div class="default-type-cell">
		<DisplayTime
			v-if="timeOnTask"
			:rawTime="timeOnTask"
		/>
		
		{{ emoji }}

	</div>
</template>

<script>
import DisplayTime from './DisplayTime.vue'
export default {
	name: 'default-type-cell',
	components: { DisplayTime },
	props: {
		timeOnTask: String,
		taskData: Object,
		userState: Object
	},
	computed: {
		emoji() {
			const rating = this.userState.rating
			if (rating === 42) return "😎"
			const i = Math.floor(rating / 20)
			return [
				"💩",
				"🙁",
				"😕",
				"😐",
				"🙂",
				"🤠"
			][i]
		}
	}
}
</script>