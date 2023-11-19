<template>
	<div class="studies-not-available">
		<img src="/mascotte.png">
		<h3>{{ t('you-will-be-able-to-participate-in-research-studies-on-pila-soon-check-back-in-a-few-months') }}</h3>
		<button @click="$emit('showStudies')">Temp For Dev Only, Show Studies</button>
	</div>
</template>


<script>
export default {
	name: 'studies-not-available',
	methods: {
		t(slug) { return this.$store.getters.t(slug) }
	}
}
</script>

<style scoped>
.studies-not-available {
	display: flex;
	flex-direction: column;
	align-items: center;
}
img {
	height: 180px;
	margin: 20px;
}
h3 {
	width: 400px;
	text-align: center;
	color: #1B1B83;
	margin-bottom: 100px;
}
</style>