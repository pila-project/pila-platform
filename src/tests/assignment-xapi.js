import {
  assignmentXapiStatement,
  countAssignedStudents
} from '../assignment-xapi.js'

export default function assignmentXapiTests() {
  describe('Assignment xAPI statements', function () {
    it('creates an assigned statement for a sequence UUID', function () {
      const sequenceId = '11111111-1111-4111-8111-111111111111'
      const statement = assignmentXapiStatement(
        'teacher-id',
        sequenceId,
        ['class-b', 'class-a', 'class-b'],
        3
      )

      expect(statement).to.deep.equal({
        actor: 'teacher-id',
        authority: 'teacher-id',
        verb: 'assigned',
        object: sequenceId,
        extensions: {
          assignedClassIds: ['class-a', 'class-b'],
          numberOfStudentsAssigned: 3
        }
      })
    })

    it('deduplicates students assigned through overlapping classes', function () {
      const studentsByClass = {
        'class-a': ['student-1', 'student-2'],
        'class-b': ['student-2', 'student-3']
      }
      const membersForClass = classId => studentsByClass[classId] || []

      expect(
        countAssignedStudents(
          ['class-a', 'class-b', 'class-a'],
          membersForClass
        )
      ).to.equal(3)
      expect(countAssignedStudents([], membersForClass)).to.equal(0)
    })

    it('does not create a statement without a sequence UUID', function () {
      expect(assignmentXapiStatement('teacher-id', null, [], 0)).to.equal(null)
      expect(
        assignmentXapiStatement('teacher-id', 'https://example.com', [], 0)
      ).to.equal(null)
    })
  })
}
