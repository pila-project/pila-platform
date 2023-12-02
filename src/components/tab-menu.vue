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
			<div
			  class="name-and-role"
			  @click.shift="$store.dispatch('cycleLanguageAndRefetch')"
			>
				{{ username }},
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
		data() {
			return {
				username: '...'
			}
		},
		async created() {
			const { auth: { info } } = await Agent.environment()
			if (info?.name) this.username = info.name
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
		background: #EEEEEE;
		align-items: end;
		padding: 8px 8px 0px 8px;
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

	.name-and-role
	{
		padding: 0 16px;
	}

</style>