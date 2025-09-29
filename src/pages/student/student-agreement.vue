<template>
	<PILAModal
		showCloseButton
		:closeButtonText="t('create-account')"
		@close="modalClose"
		class="student-agreement-modal"
	>
		<template v-slot:title>
			{{ t('your-data') }}
		</template>
		<template v-slot:body>
			<div class="student-agreement">
				<div class="student-agreement-body">

					<div>{{ t("by-creating-an-account-and-using-the-platform-for-innovative-learning-assessments-pila-you-are-agreeing-that-know-learning-can-collect-and-store-data-about-your-activity-and-google-analytics-and-google-cloud-platform-can-process-this-data") }}</div>

					<div>
						<p>{{ t('the-kinds-of-activity-data-include') }}</p>
						<p class="icon-row">
							<i class="fa fa-cloud-download"></i>
							<span>{{ t('your-clicks') }}</span>
						</p>
						<p class="icon-row">
							<i class="fa fa-mouse-pointer"></i>
							<span>{{ t('information-about-your-screen-and-device') }}</span>
						</p>
						<p class="icon-row">
							<i class="fa fa-desktop"></i>
							<span>{{ t('all-saved-versions-of-your-answers-solutions') }}</span>
						</p>
					</div>

					<div>
						<p>{{ t('know-learning-will-keep-this-data-safe-and-not-share-it-in-any-way-externally') }}</p>
					</div>

				</div>
			</div>
		</template>
	</PILAModal>
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
			if (agreeBtn) this.$store.dispatch('acceptStudentAgreement')
		}
	}
}
</script>


<style >
.student-agreement .student-agreement-modal > .modal-content {
	margin-top: 5vh;
}
.student-agreement .student-agreement-body {
	padding: 0 30px;
	color: #1b1b83;
}
.student-agreement .student-agreement-body div {
	margin: 34px 0;
}
.student-agreement .student-agreement-body p {
	margin: 8px;
}
.student-agreement .student-agreement-body i {
	min-width: 50px;
	font-size: 2.2rem;
	margin: 4px 20px 4px 6px;
}
.student-agreement p.icon-row {
	display: flex;
	align-items: center;
}
.student-agreement .fa-mouse-pointer {
	transform: translateX(10px);
}
</style>