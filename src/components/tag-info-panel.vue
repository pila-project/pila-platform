<template>
  <div>
    <h1>Tags</h1>
    <div v-for="tag in tagsForContent">
      <h2>
        <vueScopeComponent
          :id="tag"
          :path="['name']"
        />
      </h2>
    </div>
    <h1>Metadata</h1>
    <div>
      Created By:
      <vueScopeComponent
        :id="content"
        metadata
        :path="['owner']"
      />
      <br>
      Created:
      <vueScopeComponent
        :id="content"
        metadata
        :path="['created']"
      />
      <br>
      Updated:
      <vueScopeComponent
        :id="content"
        metadata
        :path="['updated']"
      />
      <h2>Avaliable Languages</h2>
      <span>
        Translations:
        {{ translationLanguages.join(', ') }}
      </span>
    </div>
  </div>
</template>

<script setup>
  import { watch, ref } from 'vue'
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'

  const { content } = defineProps({
    content: {
      type: String,
      required: false,
    },
    defaults: Array
  })

  const tagsForContent = ref([])
  const translationLanguages = ref([])

  Agent
    .query('tags-for-content', [content], 'tags.knowlearning.systems')
    .then(result => tagsForContent.value = result.map(r => r.tag_id))

  getLanguages(content)
    .then(l => translationLanguages.value = l)

  async function getLanguages(item) {
    // assume url items (karel && betty are translated)
    return isURL(item) ? [ 'en', 'th' ] : getLanguagesForKarelContent(item)
  }

  function isURL(s) {
    try {
      const url = new URL(s)
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  }

  async function getLanguagesForKarelContent(id) {
    const KAREL_DOMAIN = 'the-karel-project.netlify.app'
    const TRANSLATION_DOMAIN = 'translate-karel-alpha.netlify.app'

    let output = []

    const sub_items = await Agent.query('targets_for_parent', [id], KAREL_DOMAIN)
    // exit of no items
    if (!sub_items || sub_items.length === 0) return output

    // use sub_items[0] as bellwether
    output.push(sub_items[0].language)

    // find and push translations
    const translations = await Agent.query(
      'translations_for_target',
      [sub_items[0].id],
      TRANSLATION_DOMAIN
    )

    translations.forEach(translation => {
      const lang = translation.language
      if (lang && !output.includes(lang) && lang !== 'src') {
        output.push(lang)
      }
    })

    return output
  }

</script>