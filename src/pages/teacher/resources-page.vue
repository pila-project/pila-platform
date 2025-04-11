<template>
	<div class="resources-page">

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
			<v-list-group value="Optional Resources">
				<template v-slot:activator="{ props }">
					<v-list-item
						v-bind="props"
						:title="t('recommended-resources')"
					></v-list-item>
				</template>

				<v-list-item
					v-for="({ name }, id) in optionalResources"
					:key="id"
					prepend-icon="fa-solid fa-download"
					:title="name"
					:value="name"
					@click="download(id)"
				></v-list-item>
			</v-list-group>
		</v-list>

	</div>
</template>

<script setup>
import { reactive } from 'vue'
import { MANDATORY_RESOURCES_TAG, OPTIONAL_RESOURCES_TAG } from '../../constants.js'
import { useStore } from 'vuex'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

let mandatoryResources = reactive({})
let optionalResources  = reactive({})

const partition = 'PILA'
const domain = 'tags.knowlearning.systems'

const x = await Agent.query('taggings-for-tag',[ partition, MANDATORY_RESOURCES_TAG], domain)
await Promise.all(
  x.map(async ({ target: id }) => {
    const { name, active_type } = await Agent.metadata(id)
    mandatoryResources[id] = { name, type: active_type }
  })
)
const y = await Agent.query('taggings-for-tag',[ partition, OPTIONAL_RESOURCES_TAG], domain)
await Promise.all(
  y.map(async ({ target: id }) => {
    const { name, active_type } = await Agent.metadata(id)
    optionalResources[id] = { name, type: active_type }
  })
)

function download(id) { Agent.download(id).direct() }

</script>

<style scoped>
.resources-page {
	padding: 10px;
}
</style>