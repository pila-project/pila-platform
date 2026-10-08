<template>
  <PModal :title="title" width="480px" @close="$emit('cancel')">
    <p class="academy-muted">{{ lead }}</p>
    <div class="download-toolbar">
      <label class="download-check">
        <input type="checkbox" :checked="allSelected" @change="toggleAll" />
        <span>{{ selectAllLabel }}</span>
      </label>
      <span class="academy-muted">{{ countLabel(selected.size, files.length) }}</span>
    </div>
    <input
      v-model="query"
      class="download-search"
      type="search"
      :placeholder="searchPlaceholder"
    />
    <p v-if="!filtered.length" class="academy-muted">{{ emptyLabel }}</p>
    <ul v-else class="download-list">
      <li v-for="file in filtered" :key="fileKey(file)">
        <label class="download-row">
          <input type="checkbox" :checked="selected.has(fileKey(file))" @change="toggle(fileKey(file))" />
          <span>
            <strong>{{ file.name }}</strong>
            <small>{{ file.kind }}</small>
          </span>
          <em v-if="file.size">{{ file.size }}</em>
        </label>
      </li>
    </ul>
    <template #footer>
      <PButton variant="outline" color="danger" :text="cancelLabel" @click="$emit('cancel')" />
      <PButton
        variant="primary"
        icon="lucide:download"
        :text="downloadLabel"
        :disabled="!selected.size"
        @click="download"
      />
    </template>
  </PModal>
</template>

<script setup>
import { computed, ref } from 'vue'
import { PButton, PModal } from '@/components/ui/index.js'

const props = defineProps({
  title: { type: String, default: '' },
  lead: { type: String, default: '' },
  files: { type: Array, default: () => [] },
  selectAllLabel: { type: String, default: '' },
  countLabel: { type: Function, default: (n, m) => `${n} of ${m}` },
  searchPlaceholder: { type: String, default: '' },
  emptyLabel: { type: String, default: '' },
  cancelLabel: { type: String, default: '' },
  downloadLabel: { type: String, default: '' },
})

const emit = defineEmits(['cancel', 'download'])
const query = ref('')
function fileKey(file) {
  return file?.url || file?.id || file?.name || ''
}

const selected = ref(new Set(props.files.map((file) => fileKey(file))))

const filtered = computed(() => {
  const term = query.value.trim().toLowerCase()
  if (!term) return props.files
  return props.files.filter((file) => file.name.toLowerCase().includes(term) || file.kind.toLowerCase().includes(term))
})
const allSelected = computed(() => props.files.length > 0 && props.files.every((file) => selected.value.has(fileKey(file))))

function toggle(key) {
  const next = new Set(selected.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  selected.value = next
}

function toggleAll(event) {
  selected.value = event.target.checked ? new Set(props.files.map((file) => fileKey(file))) : new Set()
}

function download() {
  const files = props.files.filter((file) => selected.value.has(fileKey(file)))
  if (!files.length) return
  emit('download', files)
}
</script>

<style src="./academy.css"></style>
