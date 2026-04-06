import assignments from '../store/assignments.js'

export default function assignmentGroupVisibilityTests() {
  describe('Assignment group visibility', function () {
    const makeToGetter = (state, groupMembership) => {
      const rootGetters = {
        'groups/belongs': (userId, groupId) => (groupMembership[groupId] || []).includes(userId)
      }

      return assignments.getters.to(state, {}, {}, rootGetters)
    }

    it('shows only the assignment for the group the student belongs to', function () {
      const studentId = 'student-a'
      const state = {
        assignment1: {
          group_id: 'group-1',
          item_id: 'content-1',
          assignment_type: 'teacher-to-student',
          assigner_id: 'teacher-1',
          archived: false
        },
        assignment2: {
          group_id: 'group-2',
          item_id: 'content-1',
          assignment_type: 'teacher-to-student',
          assigner_id: 'teacher-1',
          archived: false
        }
      }

      const visibleAssignments = makeToGetter(state, {
        'group-1': [studentId],
        'group-2': []
      })(studentId, 'teacher-to-student')

      expect(visibleAssignments).to.deep.equal(['assignment1'])
    })

    it('shows both assignment records when the student belongs to both groups', function () {
      const studentId = 'student-a'
      const state = {
        assignment1: {
          group_id: 'group-1',
          item_id: 'content-1',
          assignment_type: 'teacher-to-student',
          assigner_id: 'teacher-1',
          archived: false
        },
        assignment2: {
          group_id: 'group-2',
          item_id: 'content-1',
          assignment_type: 'teacher-to-student',
          assigner_id: 'teacher-1',
          archived: false
        }
      }

      const visibleAssignments = makeToGetter(state, {
        'group-1': [studentId],
        'group-2': [studentId]
      })(studentId, 'teacher-to-student')

      expect(visibleAssignments).to.have.members(['assignment1', 'assignment2'])
      expect(visibleAssignments).to.have.length(2)
    })

    it('ignores assignments for unrelated groups and assignment types', function () {
      const studentId = 'student-a'
      const state = {
        assignment1: {
          group_id: 'group-1',
          item_id: 'content-1',
          assignment_type: 'teacher-to-student',
          assigner_id: 'teacher-1',
          archived: false
        },
        assignment2: {
          group_id: 'group-2',
          item_id: 'content-2',
          assignment_type: 'teacher-to-student',
          assigner_id: 'teacher-1',
          archived: false
        },
        assignment3: {
          group_id: 'group-1',
          item_id: 'content-3',
          assignment_type: 'teacher-to-teacher',
          assigner_id: 'teacher-1',
          archived: false
        },
        assignment4: {
          group_id: 'group-1',
          item_id: 'content-4',
          assignment_type: 'teacher-to-student',
          assigner_id: 'teacher-1',
          archived: true
        }
      }

      const visibleAssignments = makeToGetter(state, {
        'group-1': [studentId],
        'group-2': []
      })(studentId, 'teacher-to-student')

      expect(visibleAssignments).to.deep.equal(['assignment1'])
    })
  })
}
