<template>
  <div class="new-dashboard">
    <table>
      <thead>
        <tr>
          <th></th>
          <th></th>
          <th
            v-for="id,i in sequenceItems"
            :key="`item-name-${id}`"
            class="rotate"
            >
              <div>
                <span class="vue-scope-span-wrapper">
                  {{ `${i<10 ? '0' : ''}${i+1}. ` }}
                  <NameOrTranslatedNameFromItemId :itemId="id" />
                  
                </span>
              </div>
            </th>
        </tr>
      </thead>
      <tbody>
        <StudentResultsRow
          v-for="id in props.users"
          :key="`student-${id}`"
          :assignment="assignment"
          :sequenceId="content"
          :sequenceItems="sequenceItems"
          :user="id"
        />
      </tbody>
    </table>
  </div>
</template>

<script setup>
  import StudentResultsRow from './student-results-row.vue'
  import NameOrTranslatedNameFromItemId from '../name-or-translated-name-from-item-id.vue'

  const props = defineProps({
    users: Array,
    assignment: String
  })

  const { content } = await Agent.state(props.assignment)

  const sequenceItems = await (
    Agent
      .state(content)
      .then(c => Object.values(c.items).map(({ id }) => id))
  )
</script>

<style>
.new-dashboard table {
  margin: auto;
  border-collapse: collapse;
  color: #2c3e50;
}
.new-dashboard th, .new-dashboard td {
  padding: 4px 8px;
  text-align: left;
  position: relative;
}
.new-dashboard th {
  font-weight: normal;
  font-size: 0.85rem;
  white-space: nowrap;
}
.new-dashboard td {
  border-right: 1px solid #ddd; /* Only vertical borders */
}
.new-dashboard th.rotate {
  padding: 0;
  height: 170px;
  white-space: nowrap;
}
.new-dashboard th.rotate > div {
  transform: rotate(-45deg); /* Adjusted rotation direction */
  width: 30px;
  position: absolute;
  bottom: 6px;
  left: 16px;
}
.new-dashboard td.item-cell {
  min-width: 40px;
}

/* for item info sub component */
.new-dashboard  .item-info {
  display: flex;
  flex-direction: column;
  align-items: center;

}
.new-dashboard .item-info i {
  font-size: 18px;
}
.new-dashboard  .item-info span {
  font-size: 10px;
}
.new-dashboard  .item-info > * {
  padding: 1px;
}

/* for student summary sub component */
.new-dashboard .student-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 5px;
}
.new-dashboard .student-summary span {
  font-size: 12px;
}
.new-dashboard .student-summary > * {
  padding: 1px;
}
.new-dashboard .vue-scope-span-wrapper {
  display: inline-block;
  text-overflow: ellipsis;
  width: 170px;
  overflow: hidden;
}
</style>
