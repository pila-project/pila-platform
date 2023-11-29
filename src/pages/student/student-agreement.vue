<template>
	<div class="student-agreement">
		STUDENT AGREEMENT PAGE
		<button @click="agree">Agree</button>
	</div>
</template>

<script>
export default {
	name: 'student-agreement',
	methods: {
		agree() {
			this.$store.dispatch('roles/acceptStudentAgreement')
		}
	}
}
</script>


<style scoped>
.student-agreement {

}
</style>