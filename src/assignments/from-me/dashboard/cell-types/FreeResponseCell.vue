<template>
	<div
		:class="{
			'free-response-type-cell' : true,
			'correct' : isCorrect
		}"
	>
		<DisplayTime
			v-if="timeOnTask"
			:rawTime="timeOnTask"
		/>
	</div>
</template>

<script>
import DisplayTime from './DisplayTime.vue'
export default {
	name: 'free-response-type-cell',
	components: { DisplayTime },
	props: {
		timeOnTask: Number,
		taskData: Object,
		userState: Object
	},
	computed: {
		isCorrect() {
			return this.userState.response.includes('hello')
		}
	}
}
</script>

<style scoped>
.default-type-cell {
	text-align: left;
	background: darkslategrey;
	color: white;
}
.correct {
	background: lightgreen;
}
</style>