<template>
  <span> {{ displayString }}</span>
</template>

<script setup>
  import { ref } from 'vue'
  import { validate as isUUID } from 'uuid'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import { useStore } from 'vuex'
  const store = useStore()

  const props = defineProps(['itemId'])

  let displayString = ref(props.itemId)

  const { name } = await Agent.state(props.itemId)

  if (!isUUID(name)) {
    displayString = name
  } else { // name is uuid, attempt translate
    const translation = await attemptTranslation(name) 
    if (translation) {
      displayString = translation
    } else {
      const fallback = await attemptTranslationFallback(name)
      if (fallback) displayString = fallback
    }
  }

  async function attemptTranslation(id) {
    const r = await Agent.query(
      'translate',
      [ id, store.getters.language() ],
      'translate-karel-alpha.netlify.app'
    )
    return r?.[0]?.value
  }

  async function attemptTranslationFallback(id) {
    // relies on the-karel-project states being public
    // and translatable_items (breadcrumb) table format.
    const r = await Agent.state(id)
    return r?.source_string
  }

</script>