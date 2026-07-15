<template>
  <v-menu
    v-model="menuOpen"
    :close-on-content-click="false"
    location="bottom start"
  >
    <template #activator="{ props: activatorProps }">
      <v-text-field
        v-bind="activatorProps"
        :model-value="displayValue"
        :label="label"
        :aria-label="label"
        :disabled="disabled"
        :clearable="!!modelValue"
        prepend-inner-icon="fa-solid fa-calendar-days"
        density="compact"
        hide-details
        readonly
        @click:clear.stop="clear"
      />
    </template>

    <v-card class="date-time-picker-card">
      <v-date-picker
        v-model="pickerDate"
        color="primary"
        hide-header
        show-adjacent-months
      />
      <v-divider />
      <v-card-text>
        <v-text-field
          v-model="draftTime"
          type="time"
          label="Time"
          prepend-inner-icon="fa-solid fa-clock"
          density="compact"
          hide-details
        />
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" @click="clear">
          Clear
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="menuOpen = false">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="tonal"
          :disabled="!draftDate || !draftTime"
          @click="apply"
        >
          Done
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script setup>
  import { computed, ref, watch } from 'vue'

  const props = defineProps({
    modelValue: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      required: true
    },
    disabled: Boolean
  })

  const emit = defineEmits(['update:modelValue'])

  const menuOpen = ref(false)
  const draftDate = ref('')
  const draftTime = ref('')

  const displayValue = computed(() => {
    if (!props.modelValue) return ''
    const date = new Date(props.modelValue)
    if (Number.isNaN(date.getTime())) return props.modelValue
    return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  })

  const pickerDate = computed({
    get() {
      return draftDate.value ? new Date(`${draftDate.value}T00:00:00`) : null
    },
    set(value) {
      if (!value) {
        draftDate.value = ''
        return
      }
      const date = value instanceof Date ? value : new Date(value)
      if (!Number.isNaN(date.getTime())) draftDate.value = toLocalDate(date)
    }
  })

  watch(menuOpen, isOpen => {
    if (!isOpen) return
    const [date = '', time = ''] = props.modelValue.split('T')
    draftDate.value = date || toLocalDate(new Date())
    draftTime.value = time.slice(0, 5) || toLocalTime(new Date())
  })

  function apply() {
    emit('update:modelValue', `${draftDate.value}T${draftTime.value}`)
    menuOpen.value = false
  }

  function clear() {
    emit('update:modelValue', '')
    menuOpen.value = false
  }

  function toLocalDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  function toLocalTime(date) {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }
</script>

<style scoped>
  .date-time-picker-card {
    width: min(360px, calc(100vw - 24px));
  }

  .date-time-picker-card :deep(.v-picker) {
    width: 100%;
  }
</style>
