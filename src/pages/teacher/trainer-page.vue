<template>
  <div class="p-6" :key="lastRefresh">
    <RoleTable
      :header="t('your-teachers')"
      :partition="partition"
      :tag="TEACHER_TAG"
      descendentTaggings
      :relatedTags="[{ id: TRAINER_TAG, editable: true }]"
      @tag="setTagging"
      :editable="true"
    />
    <RoleRequestTable
      @tag="data => {
        lastRefresh = Date.now()
        setTagging(data, partition)
      }"
    />
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { useStore } from 'vuex'
  import RoleTable from '@/components/roles/role-table.vue'
  import RoleRequestTable from '@/components/roles/role-request-table.vue'
  import { TEACHER_TAG, TRAINER_TAG } from '@/utils/constants.js'
  import setTagging from '@/utils/set-tagging.js'

  const store = useStore()
  function t(slug) { return store.getters.t(slug) }

  const partition = store.getters.tagPartition
  const lastRefresh = ref(0)
</script>
