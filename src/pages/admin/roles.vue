<template>
  <v-container v-if="isThailandDomain">
    <div class="text-h3">Admins</div>
    <v-data-table
      sticky
      :items="admins"
      :loading="loadingAdmins"
    >
      <template v-slot:item.target="data">
        {{ data.item.target }}
      </template>
      <template v-slot:item.contributor="data">
        {{ data.item.contributor }}
      </template>
    </v-data-table>
  </v-container>
  <OldRoles v-else />
</template>

<script setup>
  import { ref } from 'vue'
  import { useStore } from 'vuex'
  import OldRoles from './old-roles.vue'

  const store = useStore()
  const ADMIN_TAG = "36e1b060-ed49-11ee-be89-5b04faf266ea"
  const { tagPartition, isThailandDomain } = store.getters

  const loadingAdmins = ref(true)
  const admins = ref([])

  Agent
    .query('taggings-for-tag', [tagPartition, ADMIN_TAG], 'tags.knowlearning.systems')
    .then(result => {
      admins.value = result.map(({ target, contributor }) => ({ target, contributor }))
      loadingAdmins.value = false
    })
</script>
