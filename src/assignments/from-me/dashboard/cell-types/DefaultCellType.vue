<template>
	<div class="default-type-cell">
		<h2>Default Cell View</h2>
		<DisplayTime
			v-if="timeOnTask"
			:rawTime="timeOnTask"
		/>
		<h3>Task Data:</h3>
		<pre>{{ taskData }}</pre>
		<h3>User Run State:</h3>
		<pre>{{ userState}}</pre>
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
	}
}
</script>

<style scoped>
.default-type-cell {
	text-align: left;
	background: darkslategrey;
	color: white;
}
</style>