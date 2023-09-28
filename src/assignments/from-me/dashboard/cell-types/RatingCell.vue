<template>
	<div class="default-type-cell">
		{{ timeOnTask + ':::' }}
		{{ emoji }}
	</div>
</template>

<script>
export default {
	name: 'default-type-cell',
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