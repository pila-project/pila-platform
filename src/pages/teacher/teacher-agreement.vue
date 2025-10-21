<template>
	<PILAModal
		showCloseButton
		@close="modalClose($event, false)"
		:closeButtonText="t('create-account')"
		class="teacher-agreement-modal"
	>
		<template v-slot:title>
			{{ t('terms-of-service-and-data-protection-notice') }}
		</template>
		<template v-slot:body>
			<div class="teacher-agreement">
				<div class="teacher-agreement-body">
					<p style="margin-bottom: 24px;">
						{{ t('by-creating-my-teacher-account-i-agree-to-the-te') }}
					</p>
					<p
						v-if="isSimplifiedDomain"
						style="margin-bottom: 12px;"
					>
						For the PILA Study, your students will be randomized into either Treatment or Control groups.</p>
					<p>
						<a
							href="https://pilaproject.org/about-pila/terms-and-conditions-for-teachers"
							target="_blank"
						>
							{{ t('terms-of-service-for-teachers') }}
						</a>
					</p>
					<p>
						<a
							:href="teacherDataProtectionLink"
							target="_blank"
						>
							{{ t('data-protection-notice-for-teachers') }}
						</a>
					</p>
				</div>
			</div>
		</template>
	</PILAModal>
</template>

<script>
import PILAModal from '../../components/PILAModal.vue'
import {
	DOMAIN_DATA_PROTECTION_LINKS,
	HOST_TO_PARTITION,
	SIMPLIFIED_STUDY_DOMAINS,
	TREATMENT_TAG,
	CONTROL_TAG,
	OPT_OUT_TAG
} from '../../constants.js'

export default {
	name: 'teacher-agreement',
	components: { PILAModal },
	methods: {
		t(slug) { return this.$store.getters.t(slug) },
		async modalClose(e) {
			const taggedAsTreatment = await Agent.query('taggings-for-tag', [ PARTITION, TREATMENT_TAG ], 'tags.knowlearning.systems')
			const taggedAsControl = await Agent.query('taggings-for-tag', [ PARTITION, CONTROL_TAG ], 'tags.knowlearning.systems')
			const n = taggedAsTreatment.length
			const m = taggedAsControl.length
			const p = 1 // desired ratio of m:n
			if (p*n <= m) tagSelfWith(T)
			else tagSelfWith(C)

			async function tagSelfWith(tag, partition) {
				const { auth: { user }} = await Agent.environment()
				const tags = await Agent.state('tags')
				if (!tags[tag]) tags[tag] = {}
				tags[tag][user] = { partition: PARTITION, value: true}
			}
			if (e === 'primary-button') this.$store.dispatch('acceptTeacherAgreement')
		}
	},
	computed: {
		teacherDataProtectionLink() {
			return DOMAIN_DATA_PROTECTION_LINKS[location.host]
			    || DOMAIN_DATA_PROTECTION_LINKS.default
		},
		isSimplifiedDomain() {
			return SIMPLIFIED_STUDY_DOMAINS.includes(location.host)
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
#opt-out-wrapper {
	text-align: right;
	font-style: italic;
	margin: 8px;
	color: darkgrey;
	font-size: 0.8rem;
}
#opt-out-wrapper:hover {
	color: grey;
}
</style>