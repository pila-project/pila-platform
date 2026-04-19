<template>
  <div class="datepicker" :class="{ 'datepicker-range': type === 'range' }">
    <!-- Presets sidebar -->
    <div v-if="type === 'presets' && presets.length" class="datepicker-presets">
      <button
        v-for="preset in presets"
        :key="preset.label"
        class="datepicker-preset-btn"
        @click="applyPreset(preset)"
      >
        {{ preset.label }}
      </button>
    </div>

    <!-- Calendar(s) -->
    <div class="datepicker-calendars">
      <div class="datepicker-calendar">
        <div class="datepicker-header">
          <button class="datepicker-nav-btn" aria-label="Previous month" @click="prevMonth(0)">
            <i class="fa fa-chevron-left text-xs" />
          </button>
          <span class="datepicker-month-label">{{ monthLabel(viewMonths[0]) }}</span>
          <button class="datepicker-nav-btn" aria-label="Next month" @click="nextMonth(0)">
            <i class="fa fa-chevron-right text-xs" />
          </button>
        </div>
        <div class="datepicker-weekdays">
          <span v-for="d in weekdays" :key="d" class="datepicker-weekday">{{ d }}</span>
        </div>
        <div class="datepicker-grid">
          <button
            v-for="day in calendarDays(viewMonths[0])"
            :key="day.key"
            :class="dayClasses(day)"
            :disabled="day.disabled"
            @click="selectDay(day)"
          >
            {{ day.label }}
          </button>
        </div>
      </div>

      <!-- Second calendar for range -->
      <div v-if="type === 'range'" class="datepicker-calendar">
        <div class="datepicker-header">
          <button class="datepicker-nav-btn" aria-label="Previous month" @click="prevMonth(1)">
            <i class="fa fa-chevron-left text-xs" />
          </button>
          <span class="datepicker-month-label">{{ monthLabel(viewMonths[1]) }}</span>
          <button class="datepicker-nav-btn" aria-label="Next month" @click="nextMonth(1)">
            <i class="fa fa-chevron-right text-xs" />
          </button>
        </div>
        <div class="datepicker-weekdays">
          <span v-for="d in weekdays" :key="d" class="datepicker-weekday">{{ d }}</span>
        </div>
        <div class="datepicker-grid">
          <button
            v-for="day in calendarDays(viewMonths[1])"
            :key="day.key"
            :class="dayClasses(day)"
            :disabled="day.disabled"
            @click="selectDay(day)"
          >
            {{ day.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [Date, Array],
    default: null,
  },
  type: {
    type: String,
    default: 'single',
    validator: v => ['single', 'range', 'presets'].includes(v),
  },
  min: Date,
  max: Date,
  presets: {
    type: Array,
    default: () => [],
    // Each preset: { label: string, value: [Date, Date] }
  },
  disabled: Boolean,
})

const emit = defineEmits(['update:modelValue'])

const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const today = new Date()
const initialMonth = props.modelValue instanceof Date
  ? props.modelValue
  : Array.isArray(props.modelValue) && props.modelValue[0]
    ? props.modelValue[0]
    : today

const viewMonths = ref([
  new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1),
  new Date(initialMonth.getFullYear(), initialMonth.getMonth() + 1, 1),
])

// For range selection: track partial selection
const rangeStart = ref(null)

function monthLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function prevMonth(idx) {
  const d = new Date(viewMonths.value[idx])
  d.setMonth(d.getMonth() - 1)
  viewMonths.value[idx] = d
}

function nextMonth(idx) {
  const d = new Date(viewMonths.value[idx])
  d.setMonth(d.getMonth() + 1)
  viewMonths.value[idx] = d
}

function calendarDays(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []

  // Empty cells for alignment
  for (let i = 0; i < firstDay; i++) {
    days.push({ key: `empty-${i}`, label: '', disabled: true, date: null })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const isDisabled = (props.min && date < props.min) || (props.max && date > props.max)
    days.push({
      key: `${year}-${month}-${d}`,
      label: d,
      date,
      disabled: isDisabled || props.disabled,
    })
  }

  return days
}

function isSameDay(a, b) {
  if (!a || !b) return false
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function isInRange(date) {
  if (!date || !Array.isArray(props.modelValue) || props.modelValue.length < 2) return false
  const [start, end] = props.modelValue
  return start && end && date > start && date < end
}

function dayClasses(day) {
  if (!day.date) return ['datepicker-cell datepicker-cell-empty']
  const classes = ['datepicker-cell']
  if (day.disabled) classes.push('datepicker-cell-disabled')

  const mv = props.modelValue
  if (mv instanceof Date && isSameDay(day.date, mv)) {
    classes.push('datepicker-cell-selected')
  } else if (Array.isArray(mv)) {
    if (isSameDay(day.date, mv[0]) || isSameDay(day.date, mv[1])) {
      classes.push('datepicker-cell-selected')
    } else if (isInRange(day.date)) {
      classes.push('datepicker-cell-range')
    }
  }

  if (isSameDay(day.date, today)) classes.push('datepicker-cell-today')

  return classes
}

function selectDay(day) {
  if (!day.date || day.disabled) return

  if (props.type === 'single' || props.type === 'presets') {
    emit('update:modelValue', day.date)
  } else {
    // Range selection
    if (!rangeStart.value) {
      rangeStart.value = day.date
      emit('update:modelValue', [day.date, null])
    } else {
      const start = rangeStart.value
      const end = day.date
      rangeStart.value = null
      emit('update:modelValue', start <= end ? [start, end] : [end, start])
    }
  }
}

function applyPreset(preset) {
  emit('update:modelValue', preset.value)
  rangeStart.value = null
}
</script>
