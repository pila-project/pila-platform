<template>
	<div class="student-agreement">
		<PILAModal
			showCloseButton
			:closeButtonText="t('agree')"
			@close="modalClose"
		>
			<template v-slot:title>
				Todo Student Agreement Header
			</template>
			<template v-slot:body>
				<div class="student-agreement-body">
					Student Agreement Body
				</div>
			</template>
		</PILAModal>
	</div>
</template>

<script>
import PILAModal from '../../components/PILAModal.vue'
export default {
	name: 'student-agreement',
	components: { PILAModal },
	methods: {
		t(slug) { return this.$store.getters.t(slug) },
		modalClose(e) {
			// only accept/handle modal close from 'agree' button
			const agreeBtn = e === 'primary-button'
			if (agreeBtn) this.$store.dispatch('roles/acceptStudentAgreement')
		}
	}
}
</script>


<style scoped>
.student-agreement {

}
</style>