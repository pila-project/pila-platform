<template>
	<div class="resources-page">
		<h3>{{ t('resources') }}</h3>
		<div v-for="({ name }, id) in resources" :key="id">
			<v-btn @click="download(id)">{{ name }}</v-btn>
		</div>
	</div>
</template>

<script setup>
import { reactive } from 'vue'
import { MANDATORY_RESOURCES_TAG } from '../../constants.js'
import { useStore } from 'vuex'

const store = useStore()
function t(slug) { return store.getters.t(slug) }

let resources = reactive({})

const partition = 'PILA'
const tag = MANDATORY_RESOURCES_TAG
const domain = 'tags.knowlearning.systems'
const x = await Agent.query('taggings-for-tag',[ partition, tag], domain)

await Promise.all(
  x.map(async ({ target: id }) => {
    const { name, active_type } = await Agent.metadata(id)
    resources[id] = { name, type: active_type }
  })
)

function download(id) { Agent.download(id).direct() }

</script>

<style scoped>
.resources-page {
	padding: 10px;
}
</style>