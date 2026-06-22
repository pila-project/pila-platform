<template>
	<PILAModal
		showCloseButton
		@close="modalClose($event)"
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
	CONTROL_TAG
} from '../../constants.js'

const PARTITION = HOST_TO_PARTITION[window.location.host]

export default {
	name: 'teacher-agreement',
	components: { PILAModal },
	methods: {
		t(slug) { return this.$store.getters.t(slug) },
		async modalClose(e) {
			const { auth: { user }} = await Agent.environment()
			// GOAL :: Apply TCTCTC... pattern for incoming teachers.
			// Do this by looking at taggings where the 'contributor' is the same as the 'target'
			// to exclude manual overwrites in the tagging domain
			const [ allTreatmentTaggings, allControlTaggings ] = await Promise.all([
				Agent.query('taggings-for-tag', [ PARTITION, TREATMENT_TAG ], 'tags.knowlearning.systems'),
				Agent.query('taggings-for-tag', [ PARTITION, CONTROL_TAG ], 'tags.knowlearning.systems')
			])

			const treatmentSelfTaggings = allTreatmentTaggings.filter(
				({ contributor, target}) => contributor === target
			)
			const controlSelfTaggings = allControlTaggings.filter(
				({ contributor, target}) => contributor === target
			)

			const newestTreatment = newestTimestamp(treatmentSelfTaggings)
			const newestControl = newestTimestamp(controlSelfTaggings)

			// Apply the OPPOSITE tag from whichever group has the newest self-tagging.
			if (newestTreatment > newestControl) {
				tagSelfWith(CONTROL_TAG, PARTITION)
			} else if (newestControl > newestTreatment) {
				tagSelfWith(TREATMENT_TAG, PARTITION)
			} else {
				// fallback for no existing taggings, or exact tie
				tagSelfWith(Math.random() > 0.5 ? TREATMENT_TAG : CONTROL_TAG, PARTITION)
			}

			function newestTimestamp(arr) {
				return arr.reduce(
					(newest, item) =>
						item.timestamp && item.timestamp > newest
							? item.timestamp
							: newest,
						""
				)
			}

			async function tagSelfWith(tag, partition) {
				const tags = await Agent.state('tags')
				if (!tags[tag]) tags[tag] = {}
				tags[tag][user] = { partition, value: true}
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
</style>
