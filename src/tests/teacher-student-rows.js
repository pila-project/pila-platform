import { computed, watch } from 'vue'
import { buildTeacherStudentRows, classGroupIdsForStudent } from '../utils/teacher-student-rows.js'

export default function teacherStudentRowsTests() {
  describe('teacher Admin student rows (src/utils/teacher-student-rows.js)', function () {
    it('does not skip group lookup when joined students exist at first paint (EDU PILA path)', function () {
      const rows = buildTeacherStudentRows({
        createdUserIds: [],
        joinedStudentIds: ['student-1', 'student-2'],
        classGroupIds: ['class-a', 'class-b'],
        belongs: (id, gid) => id === 'student-1' && gid === 'class-a',
        getGroupName: gid => (gid === 'class-a' ? 'Year 8A' : ''),
        users: { 'student-1': { grade: '8', archived: false } },
        getDisplayName: id => (id === 'student-1' ? 'Ada' : ''),
      })
      expect(rows).to.have.length(2)
      expect(rows[0]).to.deep.include({
        id: 'student-1',
        displayName: 'Ada',
        grade: '8',
        archived: false,
        groupNames: 'Year 8A',
      })
      expect(rows[0].groupIds).to.deep.equal(['class-a'])
      expect(rows[1].groupIds).to.deep.equal([])
    })

    it('merges teacher-created users with joined students without duplicating ids', function () {
      const rows = buildTeacherStudentRows({
        createdUserIds: ['created-1'],
        joinedStudentIds: ['created-1', 'joined-1'],
        classGroupIds: [],
        belongs: () => false,
        users: {
          'created-1': { archived: true, grade: 'K' },
        },
      })
      expect(rows.map(r => r.id)).to.deep.equal(['created-1', 'joined-1'])
      expect(rows[0].archived).to.equal(true)
      expect(rows[1].archived).to.equal(false)
      expect(rows[1].displayName).to.equal('…')
    })

    it('returns no rows when both id sources are empty (the path that used to hide the TDZ)', function () {
      const rows = buildTeacherStudentRows({
        createdUserIds: [],
        joinedStudentIds: [],
        classGroupIds: ['class-a'],
        belongs: () => true,
      })
      expect(rows).to.deep.equal([])
    })

    it('filters class membership with belongs()', function () {
      expect(classGroupIdsForStudent('s1', ['g1', 'g2'], (id, gid) => gid === 'g2')).to.deep.equal(['g2'])
    })

    it('immediate watch can evaluate a computed that reads class groups declared first', function () {
      const classGroupIds = computed(() => ['class-a'])
      const rows = computed(() =>
        buildTeacherStudentRows({
          createdUserIds: [],
          joinedStudentIds: ['student-1'],
          classGroupIds: classGroupIds.value,
          belongs: () => true,
          getGroupName: () => 'Year 8A',
        }),
      )
      let seen
      watch(rows, value => { seen = value }, { immediate: true })
      expect(seen).to.have.length(1)
      expect(seen[0].id).to.equal('student-1')
      expect(seen[0].groupNames).to.equal('Year 8A')
    })
  })
}
