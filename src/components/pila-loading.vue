<template>
	<div class="pila-loading">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 339 121"
			class="pila-svg"
		>
			<path d="M25.368 5.915l50.346 62.171c4.692 5.795 3.798 14.296-1.996 18.988-5.794 4.692-14.295 3.798-18.987-1.996L27 50.833V76.5C27 83.956 20.956 90 13.5 90S0 83.956 0 76.5v-62C0 7.114 5.931 1.114 13.29 1.002a13.493 13.493 0 0112.078 4.913z" transform="translate(260)" ></path>
			<path d="M172.5 1c7.456 0 13.5 6.044 13.5 13.5V63h38.5c7.456 0 13.5 6.044 13.5 13.5S231.956 90 224.5 90h-52c-7.456 0-13.5-6.044-13.5-13.5v-62C159 7.044 165.044 1 172.5 1zM124.5 1c7.456 0 13.5 6.044 13.5 13.5v62c0 7.352-5.877 13.332-13.19 13.497l-.31.003c-7.456 0-13.5-6.044-13.5-13.5v-62C111 7.044 117.044 1 124.5 1z" ></path>
			<path d="M13.5 120c7.456 0 13.5-6.044 13.5-13.5v-62c0-7.352-5.877-13.332-13.19-13.497L13.5 31C6.044 31 0 37.044 0 44.5v62c0 7.456 6.044 13.5 13.5 13.5z"></path>
			<circle cx="44.5" cy="44.5" r="44.5"></circle>
		</svg>
		<p> ... {{ t('loading') }} ... </p>
</div>
</template>

<script>

export default {
	name: 'pila-loading',
	methods: {
		t(slug) { return this.$store.getters.t(slug) }
	}
}
</script>


<style scoped>
.pila-loading {
	display: flex;
	flex-direction: column;
	align-items: center;
	font-size: 1.2rem;
	color: darkgrey;
	font-style: italic;
}
.pila-svg {
	width: 240px;
	animation: colorSwoosh 2600ms infinite ease-in-out;
}

@keyframes colorSwoosh {
  0% {
    fill: #6BEAC9;
  }
  50% {
    fill: #2E32DB;
  }
  100% {
    fill: #6BEAC9;
  }
}
</style>