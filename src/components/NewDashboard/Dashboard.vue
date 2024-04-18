<template>
  <div>
    <table>
      <thead>
        <tr>
          <th></th>
          <th></th>
          <th
            v-for="itemDisplayName, i in itemDisplayStrings"
            :key="`item-name-${i}`"
            class="rotate"
            >
              <div><span>{{ itemDisplayName }}</span></div>
            </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="infoArray, name in studentInfo" :key="`student-${name}`">
          <td style="white-space: nowrap;">{{ name }}</td>
          <td>
            <StudentSummary :info="infoArray" />
          </td>
          <td
            v-for="(info, i) in infoArray"
            :key="`cell-${i}`"
            class="item-cell"
          >
            <ItemInfo :info="info" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import ItemInfo from './ItemInfo.vue'
import StudentSummary from './StudentSummary.vue'
import spoofItemInfo from '../spoofItemInfo.js'

export default {
  name: 'dashboard-wow',
  components: { ItemInfo, StudentSummary },
  data() {
    const itemNames = [
      'United States of America',
      'Peoples Republic of China',
      'The United Kingdom',
      'Islamic Republic of Afghanistan',
      'Kingdom of Saudi Arabia',
      'Republic of Trinidad and Tobago',
      'Republic of South Africa',
      'Kingdom of the Netherlands'
    ]
    const studentNames = [
      'Francesca Untersteher',
      'Some Very Very Long Name Here',
      'Some Shoter Name',
      'John Wick',
      'Alexander Johnson',
      'Elizabeth Thompson',
      'Christopher Williams',
      'Victoria Anderson',
      'Nathaniel Martinez'
    ]
    const studentInfo = studentNames.reduce((acc, cur) => {
      const itemResults = itemNames.map(el => spoofItemInfo(el))
      return { ...acc, [cur]: itemResults }
    }, {})

    return {
      itemNames,
      studentInfo
    }
  },
  computed: {
    itemDisplayStrings() {
      return this.itemNames.map((name,i) => {
        let n = i+1
        n = (n<10 ? '0'+n : ''+n)
        return `${n}. ${name}`
      })
    }
  }
}
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
