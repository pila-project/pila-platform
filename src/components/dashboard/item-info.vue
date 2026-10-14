<template>
	<div class="item-info">
		<span
			class="progress-dot"
			:class="status"
			role="img"
			:aria-label="statusLabel"
			:title="statusLabel"
		/>
		<span v-if="hasAttempt">{{ timeString }}</span>
	</div>
</template>

<script>
const o = x => ( x<10 ? '0'+x : ''+x )

export default {
	name: 'item-info',
	props: {
		active: Boolean,
		quizMode: Boolean,
		info: {
			type: Object,
			required: false,
			default: () => ({ timeOnTask: 0, isCorrect: null })
		},
	},
	computed: {
		status() {
			if (this.active) return 'active'
			const correct = this.info?.isCorrect
			if (correct === true || correct === 'completed' || (this.quizMode && correct === false)) return 'finished'
			return this.hasAttempt ? 'entered' : 'not-entered'
		},
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
		statusLabel() {
			return this.status.replace('-', ' ')
		}
	},
}
</script>

<style scoped>
.item-info .progress-dot {
	display: block;
	width: 14px;
	height: 14px;
	box-sizing: border-box;
	flex-shrink: 0;
	padding: 0;
	border: 1px solid rgba(44, 62, 80, 0.25);
	border-radius: 50%;
	background-color: white;
}
.progress-dot.entered { background-color: grey; }
.progress-dot.finished { background-color: dodgerblue; }
.progress-dot.active {
	background-color: #ffd600;
	animation: progress-dot-blink 1s ease-in-out infinite;
}
@keyframes progress-dot-blink {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.25; }
}
@media (prefers-reduced-motion: reduce) {
	.progress-dot.active { animation: none; }
}
</style>
