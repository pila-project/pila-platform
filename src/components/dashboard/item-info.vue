<template>
	<div class="item-info">
		<i
			class="fas fa-check-circle"
			:style="`color: ${iconColor};`"
		/>
		<span>{{ timeString }}</span>
	</div>
</template>

<script>
const o = x => ( x<10 ? '0'+x : ''+x )

export default {
	name: 'item-info',
	props: {
		info: {
			type: Object,
			required: false,
			default: () => ({ timeOnTask: 99, isCorrect: true })
		},
	},
	computed: {
		timeString() {
			if (!this.info.timeOnTask) return "00:00"

			const t = this.info.timeOnTask
			const mins = Math.floor(t/60)
			const secs = t % 60
			return `${o(mins)}:${o(secs)}`
		},
		iconColor() {
			const correct = this.info.isCorrect
			if (correct === null || correct === undefined) return 'grey'
			else return (correct ? 'limegreen' : 'orangered')
		}
	},
}
</script>