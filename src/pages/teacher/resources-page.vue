<template>
	<div class="resources-page">
		<TagFilters
			v-model="selectedTags"
			:partition="partition"
			:roots="teacherResourceTags"
			select-leaves-only
			:LabelComponent="TagTranslation"
		/>
		<div v-if="loading" class="py-4 text-center text-slate-500">
			<LucideIcon name="loader-2" :size="14" :spin="true" class="inline mr-2" />Loading...
		</div>
		<div
			v-if="taggedResources.length"
			class="border border-slate-200 rounded-lg bg-slate-50"
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
import { reactive, ref, watch, onMounted } from 'vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import {
	HOST_TO_PARTITION,
	MANDATORY_RESOURCES_TAG,
	OPTIONAL_RESOURCES_TAG,
	TEACHER_RESOURCE_TAGS
} from '@/utils/constants.js'
import { useStore } from 'vuex'
import { vueScopeComponent } from '@knowlearning/agents/vue.js'
import { Filters as TagFilters } from '@knowlearning/tags'
import TagTranslation from '@/components/tags/tag-translation.vue'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

const selectedTags = ref([])
const taggedResources = ref([])
const loading = ref(false)

let mandatoryResources = reactive({})

const partition = HOST_TO_PARTITION[window.location.host]
const domain = 'tags.knowlearning.systems'

const teacherResourceTags = (
	await Agent.query('taggings-for-tag',[ partition, TEACHER_RESOURCE_TAGS], domain)
).map(r => r.target)

const x = await Agent.query('taggings-for-tag',[ partition, MANDATORY_RESOURCES_TAG], domain)
await Promise.all(
	x.map(async ({ target: id }) => {
		const { name, active_type } = await Agent.metadata(id)
		mandatoryResources[id] = { name, type: active_type }
	})
)

watch(selectedTags, () => {
	taggedResources.value = []
	fetchTaggings()
})

if (teacherResourceTags.length === 1) {
	selectedTags.value = [teacherResourceTags[0]]
	onMounted(() => fetchTaggings())
}

function download(id) { Agent.download(id).direct() }

let currentFetch = null
async function fetchTaggings() {
	loading.value = true
	const tags = selectedTags.value
	if (tags.length) {
		const thisFetch = Date.now()
		currentFetch = thisFetch
		await (
			Agent
				.query('taggings-intersection', [partition, tags], 'tags.knowlearning.systems')
				.then(result => {
					if (currentFetch === thisFetch) {
						taggedResources.value = result.map(r => r.target)
					}
				})
		)
	}
	loading.value = false
}
</script>

<style scoped>
.resources-page {
	padding: 10px;
}
</style>
