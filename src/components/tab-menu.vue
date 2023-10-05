<template>
	<div class="wrapper">
		<div
		  v-for="{ name, background, color, id, spacer, width, icon } in tabs"
		  :class="spacer ? 'spacer' : 'tab' "
		  :style="{
		  	background,
		  	color,
		  	'flex-grow': spacer ? width : 0
		  }"
		  @click="$emit('select', id)"
		 >
		    <img
		      v-if="icon"
		      class="icon"
		      :src="icon"
		     />
			{{ spacer ? '' : name }}
		</div>
	</div>
</template>

<script>
	export default {
		props: {
			tabs: Array,
			current: String
		}
	}
</script>

<style scoped>
	.wrapper
	{
		display: flex;
	}

	.tab
	{
		cursor: pointer;
		padding: 12px 32px 4px 32px;
		border-radius: 16px 16px 0 0;
		margin-right: 4px;
	}

	.icon
	{
		height: 24px;
		margin-right: 4px;
		margin-top: -8px;
		margin-bottom: -4px;
	}

</style>