<template>
	<div class="default-type-cell">
		{{ timeOnTask + ':::' }}
		{{ isCorrect ? "Woo" : "Boo" }}
	</div>
</template>

<script>
export default {
	name: 'default-type-cell',
	props: {
		timeOnTask: String,
		taskData: Object,
		userState: Object
	},
	computed: {
     	selectedOptions() {
	        return (
	          Object
	            .entries(this.userState.selected)
	            .filter(([index, isSelected]) => isSelected)
	            .map(([index]) => parseInt(index))
	        )
     	},
		isCorrect() {
	        const correctAnswers = (
	          this.taskData.options
	            .map(({ valid }, index)=> ({ valid, index }))
	            .filter(({ valid }) => valid)
	            .map(({ index }) => index)
	        )
	        const givenAnswers = this.selectedOptions

	        return (
	          correctAnswers.every(x => givenAnswers.includes(x))
	          && givenAnswers.every(x => correctAnswers.includes(x))
	        )
     	}
	}
}
</script>