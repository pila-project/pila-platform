<template>
	<div class="project-selector">
		<div 
			v-for="p in projects"
			:key="p"
			:class="{
				project: true,
				active: activeProjects.includes(p)
			}"
			@click="$emit('select', p)"
		>
			<img :src="getImageSrc(p)">
		</div>
	</div>
</template>

<script>
export default {
	name: 'project-selector',
	props: {
		activeProjects: {
			type: Array,
			required: true
		},
		projects: {
			type: Array,
			required: false,
			default: () => (['candli', 'betty', 'karel'])
		}
	},
	methods: {
		getImageSrc(project) {
			if (project === 'karel') return './karelSide.png'
			else if (project === 'candli') return './candli-logo.svg'
			else if (project === 'betty') return './betty.png'
			else return './mascotte.png'
		}
	}	
}
</script>

<style scoped>
.project-selector {
	display: flex;
}
.project {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 64px;
	height: 32px;
	margin: 8px;
	border: 2px solid lightgrey;
	border-radius: 12px;
	filter: grayscale(100%);
	cursor: pointer;

}
.project img {
	max-width: 42px;
	max-height: 30px;
}
.project.active {
	border: 2px solid lightseagreen;
	filter: grayscale(0%);
}
</style>