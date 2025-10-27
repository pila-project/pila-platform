<template>
	<v-container class="resources-page">

		<v-list
			style="border: 1px solid #ccc; border-radius: 8px; background-color: #fafafa;"
		>
			<v-list-group value="Mandatory Resources">
				<template v-slot:activator="{ props }">
					<v-list-item
						v-bind="props"
						:title="t('required-resources')"
					></v-list-item>
				</template>

				<v-list-item
					v-for="({ name }, id) in mandatoryResources"
					:key="id"
					prepend-icon="fa-solid fa-download"
					:title="name"
					:value="name"
					@click="download(id)"
				></v-list-item>
			</v-list-group>
		</v-list>
		<br>
		<TagFilters
			v-model="selectedTags"
			:partition="partition"
			:roots="teacherResourceTags"
			select-leaves-only
			:LabelComponent="TagTranslation"
		/>
		<v-progress-linear v-if="loading" indeterminate />
		<v-list
			v-if="taggedResources.length"
			style="border: 1px solid #ccc; border-radius: 8px; background-color: #fafafa;"
		>
			<v-list-item
				v-for="id in taggedResources"
				:key="id"
				prepend-icon="fa-solid fa-download"
				@click="download(id)"
			>
				<v-list-item-title>
					<vueScopeComponent
						metadata
						:id="id"
						:path="['name']"
					/>
				</v-list-item-title>
			</v-list-item>
		</v-list>
	</v-container>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import {
	HOST_TO_PARTITION,
	MANDATORY_RESOURCES_TAG,
	OPTIONAL_RESOURCES_TAG,
	TEACHER_RESOURCE_TAGS
} from '../../constants.js'
import { useStore } from 'vuex'
import { vueScopeComponent } from '@knowlearning/agents/vue.js'
import { Filters as TagFilters } from '@knowlearning/tags'
import TagTranslation from '../../components/tag-translation.vue'

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