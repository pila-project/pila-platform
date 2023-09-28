<template>
	<div class="default-type-cell">
		<div>Type Not Found: Default Cell View:::;</div>
		<div>Time on Task: {{ timeOnTask }}</div>
		<h3>Task Data:</h3>
		<pre>{{ taskData }}</pre>
		<h3>User Run State:</h3>
		<pre>{{ userState}}</pre>
	</div>
</template>

<script>
export default {
	name: 'default-type-cell',
	props: {
		timeOnTask: String,
		taskData: Object,
		userState: Object
	}
}
</script>