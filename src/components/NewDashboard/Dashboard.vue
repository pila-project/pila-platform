<template>
  <div>
    <table>
      <thead>
        <tr>
          <th></th>
          <th></th>
          <th
            v-for="id in items"
            :key="`item-name-${id}`"
            class="rotate"
            >
              <div>
                <vueScopeComponent
                  :id="id"
                  :path="['name']"
                />
              </div>
            </th>
        </tr>
      </thead>
      <tbody>
        <StudentResultsRow
          v-for="id in props.users"
          :key="`student-${id}`"
          :items="items"
          :user="id"
        />
      </tbody>
    </table>
  </div>
</template>

<script setup>
  import { vueScopeComponent } from '@knowlearning/agents/vue.js'
  import StudentResultsRow from './student-results-row.vue'

  const props = defineProps({
    users: Array,
    content: String
  })

  const items = await Agent.state(props.content).then(content => {
    return Object.values(content.items).map(({ id }) => id)
  })

</script>

<style scoped>
table {
  border-collapse: collapse;
}
th, td {
  padding: 4px;
  text-align: left;
  position: relative;
}
th {
  font-weight: normal;
  font-size: 0.8rem;
  white-space: nowrap;
}
td {
  border-right: 1px solid #ddd; /* Only vertical borders */
}
th.rotate {
  padding: 0;
  height: 140px;
  white-space: nowrap;
}
th.rotate > div {
  transform: rotate(-45deg); /* Adjusted rotation direction */
  width: 30px;
  position: absolute;
  bottom: 6px;
  left: 16px;
}
td.item-cell {
  min-width: 40px;
}
</style>
