<template>
    <span>{{ displayString }}</span>
</template>

<script setup>
import { useStore } from 'vuex'
import { getHardcodedTagTranslation } from '@/utils/tag-name-translations.js'
const language = useStore().getters.language()

const props = defineProps(['id'])

let displayString
const translation = getHardcodedTagTranslation(props.id, language)
if (translation) {
    displayString = translation
} else {
    const translations = await Agent.query('translate-item', [ props.id, [ language ] ], 'translations.pilaproject.org')

    //  Use any name translation that's not a fallback
    const nameTranslation = translations.find(t => !t.is_fallback && t.path.length === 2 && t.path[1] === 'name')

    if (nameTranslation) displayString = nameTranslation.value
    else {
      const { name } = await Agent.state(props.id)
      displayString = name || props.id
    }
}

</script>
