<template>
	<div class="tab-menu">
		<div class="tabs-wrapper">
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
			<div @click.shift="$store.dispatch('cycleLanguageAndRefetch')" >
	  			Anonymous_{{ $store.state.user.slice(0, 4) }}
	  			<br>
	  			{{ $store.getters['roles/role']($store.state.user) }}
	  		</div>
			<IconButton
	          @click="logout"

	          icon="sign-out"
	          :text="t('log-out')"
			/>
		</div>

		<div
	   		:style="{
	    		borderTop: `8px solid ${tabs.find(t => t.id === current).background}`,
				flexGrow: 1
			}"
		></div>
	</div>
    
</template>

<script>
    import IconButton from './icon-button.vue'

	export default {
		components: {
			IconButton
		},
		props: {
			tabs: Array,
			current: String
		},
		methods: {
			t(slug) { return this.$store.getters.t(slug) },
			logout() {
				this.$store.state.codeEntered = false
				Agent.logout()
			}
		}
	}
</script>

<style scoped>
	.tab-menu
	{
/*		font-weight: bold;*/
	}
	.tabs-wrapper
	{
		display: flex;
		padding-top: 16px;
		background: #EEEEEE;
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