<template>
	<div class="item-info">
		<template v-if="hasAttempt">
			<LucideIcon
				name="check-circle"
				:size="14"
				:style="`color: ${iconColor};`"
			/>
			<span>{{ timeString }}</span>
		</template>
	</div>
</template>

<script>
import LucideIcon from '@/components/ui/LucideIcon.vue'
const o = x => ( x<10 ? '0'+x : ''+x )

export default {
	name: 'item-info',
	components: { LucideIcon },
	props: {
		info: {
			type: Object,
			required: false,
			default: () => ({ timeOnTask: 99, isCorrect: true })
		},
	},
	computed: {
		hasAttempt() {
			const correct = this.info?.isCorrect
			const time = Number(this.info?.timeOnTask) || 0
			return (correct !== null && correct !== undefined) || time > 0
		},
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