<template>
	<div class="student-agreement">
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
						<p>{{ t('thanks-to-the-pila-data-security-system-your-teacher-will-receive-your-data-in-digital-dashboards') }}</p>
						<p>{{ t('your-teachers-are-the-only-ones-who-will-be-able-to-identify-who-you-are') }}</p>
					</div>

					<div>
						<p>
							{{ t('you-will-be-able-to-access-your-assignments-and-results-in-your-student-account-you-can-read-more-about-how-pila-protects-your-data-in-the-data-protection-notice-for-students') }}
						</p>
						<p style="margin: 20px 0; text-align: center;">
							<a
								href="https://pilaproject.org/about-pila/data-protection-notice-for-students"
								target="_blank"
							>
								{{ t('data-protection-notice-for-students') }}
							</a>
						</p>
						<p>
							<span>{{ t('if-you') }}&nbsp;</span>
							<span><strong>{{ t('do-not-agree') }}</strong>&nbsp;</span>
							<span>{{ t('to-know-learning-collecting-and-storing-this-data-please-speak-with-your-teacher-and-do-not-create-a-student-account-on-pila') }}</span>
						</p>
					</div>




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