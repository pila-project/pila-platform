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

				</div>
			</div>
		</template>
	</PModal>
</template>

<script>
import { PModal } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'
export default {
	name: 'student-agreement',
	components: { PModal, LucideIcon },
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