<template>
	<PModal
		showCloseButton
		:closeButtonText="t('create-account')"
		@close="modalClose"
		class="student-agreement-modal"
		width="800px"
	>
		<template v-slot:title>
			{{ t('your-data') }}
		</template>
		<template v-slot:body>
			<div class="student-agreement">
				<div class="student-agreement-body">

					<template v-if="agreementVariant === 'legacy'">
						<div>{{ t("you-are-about-to-create-a-student-account-on-pil") }}</div>

						<div>
							<p>{{ t('the-kinds-of-activity-data-include') }}</p>
							<p class="icon-row">
								<LucideIcon name="cloud-download" :size="35" />
								<span>{{ t('your-clicks') }}</span>
							</p>
							<p class="icon-row">
								<LucideIcon name="mouse-pointer" :size="35" />
								<span>{{ t('information-about-your-screen-and-device') }}</span>
							</p>
							<p class="icon-row">
								<LucideIcon name="monitor" :size="35" />
								<span>{{ t('all-saved-versions-of-your-answers-solutions-inc') }}</span>
							</p>
						</div>

						<div>
							<p style="white-space: pre-line;">
								{{ t('know-learning-will-keep-this-data-safe-and-wont') }}
							</p>
						</div>
					</template>

					<template v-else>
						<div>
							<p>{{ t('you-are-currently-logging-into-a-student-account') }}</p>
							<p>{{ t('while-you-work-on-the-platform-certain-data-rega') }}</p>
						</div>

						<div>
							<p>{{ t('the-types-of-activity-data-include') }}</p>
							<p class="icon-row">
								<LucideIcon name="cloud-download" :size="35" />
								<span>{{ t('where-you-click') }}</span>
							</p>
							<p class="icon-row">
								<LucideIcon name="monitor" :size="35" />
								<span>{{ t('all-saved-versions-of-your-answers-and-solutions') }}</span>
							</p>
							<p v-if="agreementVariant === 'thailand'" class="icon-row">
								<LucideIcon name="message-circle" :size="35" />
								<span>{{ t('conversations-with-ai-chatbots-designed-for-educ') }}</span>
							</p>
						</div>

						<div>
							<p>{{ t(securitySlug) }}</p>
							<p>{{ t(teacherVisibilitySlug) }}</p>
							<p>{{ t('if-there-is-anything-in-this-text-you-do-not-und') }}</p>
						</div>
					</template>

				</div>
			</div>
		</template>
	</PModal>
</template>

<script>
import { PModal } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { consentCopyVariant } from '@/utils/constants.js'
export default {
	name: 'student-agreement',
	components: { PModal, LucideIcon },
	computed: {
		agreementVariant() {
			return consentCopyVariant()
		},
		securitySlug() {
			return this.agreementVariant === 'thailand'
				? 'know-learning-keeps-this-data-secure-and-shares'
				: 'know-learning-the-company-that-created-and-manag'
		},
		teacherVisibilitySlug() {
			return this.agreementVariant === 'thailand'
				? 'your-teacher-will-see-progress-but-not-chatbot-c'
				: 'your-teacher-will-be-able-to-see-your-progress-o'
		}
	},
	methods: {
		t(slug) { return this.$store.getters.t(slug) },
		async modalClose(e) {
			// only accept/handle modal close from 'agree' button
			const agreeBtn = e === 'primary-button'
			if (agreeBtn) await this.$store.dispatch('acceptStudentAgreement')
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
.student-agreement .student-agreement-body svg {
	min-width: 50px;
	margin: 4px 20px 4px 6px;
	flex-shrink: 0;
}
.student-agreement p.icon-row {
	display: flex;
	align-items: center;
}
</style>
