<template>
	<div class="resources-page">
		<section class="resources-filters">
			<div v-if="tagsLoading" class="resources-filters-loading" aria-busy="true" aria-label="Loading filters">
				<div
					v-for="n in availableTabs.length || 2"
					:key="n"
					class="resources-tab-skeleton"
				/>
			</div>
			<PTabs
				v-else-if="availableTabs.length"
				v-model="activeTab"
				:tabs="availableTabs"
				type="pill"
			/>
		</section>

		<div v-if="loading" class="resources-list-loading">
			<LucideIcon name="loader-2" :size="14" :spin="true" class="inline mr-2" />
			{{ t('loading') }}
		</div>
		<div
			v-else-if="taggedResources.length"
			class="resources-list border border-slate-200 rounded-lg bg-slate-50"
		>
			<button
				v-for="id in taggedResources"
				:key="id"
				class="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 transition-colors text-left border-b border-slate-200 last:border-b-0"
				@click="download(id)"
			>
				<LucideIcon name="download" :size="16" class="text-slate-400" />
				<vueScopeComponent
					metadata
					:id="id"
					:path="['name']"
				/>
			</button>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { PTabs } from '@/components/ui/index.js'
import {
	HOST_TO_PARTITION,
	MANDATORY_RESOURCES_TAG,
	OPTIONAL_RESOURCES_TAG,
	TEACHER_RESOURCE_TAGS,
} from '@/utils/constants.js'
import { useStore } from 'vuex'
import { vueScopeComponent } from '@knowlearning/agents/vue.js'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const RESOURCE_TAB_DEFS = [
	{ key: MANDATORY_RESOURCES_TAG, slug: 'required-resources' },
	{ key: OPTIONAL_RESOURCES_TAG, slug: 'recommended-resources' },
]

const activeTab = ref('')
const taggedResources = ref([])
const loading = ref(false)
const tagsLoading = ref(true)
const availableTabKeys = ref(RESOURCE_TAB_DEFS.map(tab => tab.key))

const partition = HOST_TO_PARTITION[window.location.host]
const domain = 'tags.knowlearning.systems'

const availableTabs = computed(() =>
	RESOURCE_TAB_DEFS
		.filter(tab => availableTabKeys.value.includes(tab.key))
		.map(tab => ({ key: tab.key, label: t(tab.slug) })),
)

let currentFetch = null

watch(activeTab, () => {
	taggedResources.value = []
	fetchTaggings()
})

onMounted(() => {
	initResourceTabs()
})

async function initResourceTabs() {
	tagsLoading.value = true
	try {
		const linked = (
			await Agent.query('taggings-for-tag', [partition, TEACHER_RESOURCE_TAGS], domain)
		).map(r => r.target)

		const known = RESOURCE_TAB_DEFS.map(tab => tab.key)
		const linkedKnown = known.filter(id => linked.includes(id))

		availableTabKeys.value = linkedKnown.length ? linkedKnown : known

		if (availableTabKeys.value.includes(MANDATORY_RESOURCES_TAG)) {
			activeTab.value = MANDATORY_RESOURCES_TAG
		} else if (availableTabKeys.value.length) {
			activeTab.value = availableTabKeys.value[0]
		}
	} finally {
		tagsLoading.value = false
	}
}

function download(id) { Agent.download(id).direct() }

async function fetchTaggings() {
	const tag = activeTab.value
	if (!tag) {
		loading.value = false
		return
	}

	loading.value = true
	const thisFetch = Date.now()
	currentFetch = thisFetch

	try {
		const result = await Agent.query(
			'taggings-intersection',
			[partition, [tag]],
			domain,
		)
		if (currentFetch === thisFetch) {
			taggedResources.value = result.map(r => r.target)
		}
	} finally {
		if (currentFetch === thisFetch) {
			loading.value = false
		}
	}
}
</script>

<style scoped>
.resources-page {
	padding: 10px 16px 16px;
}

.resources-filters {
	padding-top: 20px;
}

.resources-filters-loading {
	display: inline-flex;
	gap: 4px;
	padding: 4px;
	background: var(--color-slate-100, #f1f5f9);
	border-radius: 8px;
}

.resources-tab-skeleton {
	height: 28px;
	width: 132px;
	border-radius: 6px;
	background: linear-gradient(
		90deg,
		var(--color-slate-200) 0%,
		var(--color-slate-100) 50%,
		var(--color-slate-200) 100%
	);
	background-size: 200% 100%;
	animation: resources-tab-shimmer 1.2s ease-in-out infinite;
}

.resources-list-loading {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 24px 0;
	font-size: 14px;
	color: var(--color-slate-500);
}

.resources-list {
	margin-top: 16px;
}

@keyframes resources-tab-shimmer {
	0% { background-position: 100% 0; }
	100% { background-position: -100% 0; }
}
</style>