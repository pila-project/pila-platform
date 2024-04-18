<template>
	<div class="student-summary">
		<span>{{ correctnessString }}</span>
		<span>{{ timeString }}</span>
	</div>
</template>

<script>
const o = x => ( x<10 ? '0'+x : ''+x )

export default {
	name: 'student-summary',
	props: {
		info: {
			type: Object,
			required: true,
		},
	},
	computed: {
		timeString() {
			const totalTime = this.info.reduce((acc, itemInfo) => {
				return acc + itemInfo.timeOnTask
			}, 0)
			const mins = Math.floor(totalTime/60)
			const secs = totalTime % 60
			return `${o(mins)}:${o(secs)}`
		},
		correctnessString() {
			const numItems = this.info.length
			const numCorrect = this.info.reduce((acc, itemInfo) => {
				return itemInfo.isCorrect ? acc + 1 : acc
			}, 0)
			return `${numCorrect} / ${numItems}`
		}
	}
}
</script>

<style scoped>
.student-summary {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin: 0 5px;
	
}
.student-summary span {
	font-size: 12px;
}
.student-summary > * {
	padding: 1px;
}
</style>