<template>
	<span class="display-time">{{ displayTime }}</span>
</template>

<script>
export default {
	name: 'display-time',
	props: {
		rawTime: {
			type: Number
		}
	},
	computed: {
		displayTime() {
			const hours = Math.floor(this.rawTime / 3600)
			const minutes = Math.floor((this.rawTime%3600) / 60)
			const minutesPlaceholder = minutes < 10 ? '0' : ''
			const seconds = this.rawTime % 60
			const SecondsPlaceholder = seconds < 10 ? '0' : ''
			if (hours) {
				return `${hours}:${minutesPlaceholder}${minutes}:${SecondsPlaceholder}${seconds}`
			} else {
				return `${minutes}:${SecondsPlaceholder}${seconds}`
			}
		}
	}
}
</script>