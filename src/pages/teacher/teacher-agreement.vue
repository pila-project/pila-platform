<template>
	<PModal
		showCloseButton
		@close="modalClose($event)"
		:closeButtonText="t('create-account')"
		class="teacher-agreement-modal"
		width="800px"
	>
		<template v-slot:title>
			{{ t('terms-of-service-and-data-protection-notice') }}
		</template>
		<template v-slot:body>
			<div class="teacher-agreement">
				<div class="teacher-agreement-body">
					<p v-if="!isSimplifiedStudyDomain" style="margin-bottom: 24px;">
						{{ t('by-creating-my-teacher-account-i-agree-to-the-te') }}
					</p>
					<p v-else style="margin-bottom: 24px;">
						{{ t('by-creating-my-teacher-account-i-agree-to-the-pr') }}
					</p>
					<p v-if="!isSimplifiedStudyDomain">
						<a
							class="policy-external-link"
							href="https://pilaproject.org/about-pila/terms-and-conditions-for-teachers"
							target="_blank"
							rel="noopener noreferrer"
						>
							<span>{{ t('terms-of-service-for-teachers') }}</span>
							<LucideIcon name="external-link" :size="14" />
						</a>
					</p>
					<p>
						<a
							class="policy-external-link"
							:href="teacherDataProtectionLink"
							target="_blank"
							rel="noopener noreferrer"
						>
							<span>{{ t('data-protection-notice-for-teachers') }}</span>
							<LucideIcon name="external-link" :size="14" />
						</a>
					</p>
				</div>
			</div>
		</template>
	</PModal>
</template>

<script>
import { PModal } from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import {
	DOMAIN_DATA_PROTECTION_LINKS,
	SIMPLIFIED_STUDY_DOMAINS,
} from '@/utils/constants.js'

export default {
	name: 'teacher-agreement',
	components: { PModal, LucideIcon },
	methods: {
		t(slug) { return this.$store.getters.t(slug) },
		async modalClose(e) {
			// Trunk: TC treatment/control tagging moved to admin role grant — not on agreement close
			if (e === 'primary-button') await this.$store.dispatch('acceptTeacherAgreement')
		}
	},
	computed: {
		teacherDataProtectionLink() {
			return DOMAIN_DATA_PROTECTION_LINKS[location.host]
				|| DOMAIN_DATA_PROTECTION_LINKS.default
		},
		isSimplifiedStudyDomain() {
			return SIMPLIFIED_STUDY_DOMAINS.includes(window.location.host)
		}
	}
}
</script>

<style>
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
.teacher-agreement .policy-external-link {
	display: inline-flex;
	align-items: center;
	gap: 0.3em;
	color: inherit;
	text-decoration: none;
}
.teacher-agreement .policy-external-link span {
	text-decoration: underline;
	text-decoration-thickness: 1px;
	text-underline-offset: 2px;
}
.teacher-agreement .policy-external-link svg {
	flex-shrink: 0;
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
