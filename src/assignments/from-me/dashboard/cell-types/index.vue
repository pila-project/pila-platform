<template>
	<div class="task-cell">
		<div v-if="this.loading">loading</div>
		<component
			v-else
			:is="cellType"
			:timeOnTask="timeOnTask"
			:taskData="taskData"
			:userState="userState"
			@click.shift="showDefaultCell = !showDefaultCell"
		/>

	</div>
</template>

<script>
import DefaultCellType from './DefaultCellType.vue'
import RatingCell from './RatingCell.vue'
import MultipleChoiceCell from './MultipleChoiceCell.vue'
export default {
	name: 'task-cell',
	components: {
		MultipleChoiceCell,
		RatingCell,
		DefaultCellType
	},
	props: [ 'task', 'scope', 'timeOnTask' ],
	async created() {
		this.taskData = await Agent.state(this.task)
		this.taskMetadata = await Agent.metadata(this.task)

		Agent.watch(this.scope, ({ state }) => {
			this.userState = state
			this.loading = false
		})

	},
	data() {
		return {
			loading: true,
			taskData: null,
			taskMetadata: null,
			userState: null,
			showDefaultCell: false
		}
	},
	computed: {
		taskType() { return this.taskMetadata ? this.taskMetadata.active_type : null },
		cellType() {
			if (this.showDefaultCell) return DefaultCellType

			const componentMap = {
				'application/json;type=multiple-choice' : MultipleChoiceCell,
				'application/json;type=rating' : RatingCell
			}
			return componentMap[this.taskType] || DefaultCellType
		}
	}
}
</script>


<style>
</style>
