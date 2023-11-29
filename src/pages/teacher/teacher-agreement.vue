<template>
	<div class="teacher-agreement">
		<PILAModal
			showCloseButton
			:closeButtonText="t('create-account')"
			@close="modalClose"
			class="teacher-agreement-modal"
		>
			<template v-slot:title>
				{{ t('terms-of-service-and-data-protection-notice') }}
			</template>
			<template v-slot:body>
				<div class="teacher-agreement-body">
					<p style="margin-bottom: 24px;">
						{{ t('by-creating-my-teacher-account-i-agree-to-the-terms-of-service-and-the-processing-of-my-personal-data-as-described-in-the-data-protection-notice') }}
					</p>
					<p>
						<a
							href="https://pilaproject.org/about-pila/terms-of-service-for-teachers"
							target="_blank"
						>
							{{ t('terms-of-service-for-teachers') }}
						</a>
					</p>
					<p>
						<a
							href="https://pilaproject.org/about-pila/data-protection-notice-for-teachers"
							target="_blank"
						>
							{{ t('data-protection-notice-for-teachers') }}
						</a>
					</p>
				</div>
			</template>
		</PILAModal>
	</div>
</template>

<script>
import PILAModal from '../../components/PILAModal.vue'
export default {
	name: 'teacher-agreement',
	components: { PILAModal },
	methods: {
		t(slug) { return this.$store.getters.t(slug) },
		modalClose(e) {
			// only accept/handle modal close from 'agree' button
			const agreeBtn = e === 'primary-button'
			if (agreeBtn) this.$store.dispatch('acceptTeacherAgreement')
		}
	}
}
</script>


<style >
.teacher-agreement .teacher-agreement-modal > .modal-content {
	margin-top: 5vh;
}
.teacher-agreement .teacher-agreement-body {
	padding: 10px 30px 0 20px;
	color: #1b1b83;
}
.teacher-agreement .teacher-agreement-body div {
	margin: 34px 0;
}
.teacher-agreement .teacher-agreement-body p {
	margin: 8px;
}
.teacher-agreement .teacher-agreement-body i {
	min-width: 50px;
	font-size: 2.2rem;
	margin: 4px 20px 4px 6px;
}
.teacher-agreement p.icon-row {
	display: flex;
	align-items: center;
}
.teacher-agreement .fa-mouse-pointer {
	transform: translateX(10px);
}
</style>