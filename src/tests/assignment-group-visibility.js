import assignments from '../store/assignments.js'
import { ASSIGNMENT_STATUS, isStudentVisibleAssignment } from '../utils/assignment-status.js'

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

  describe('Student assignment status visibility', function () {
    const now = Date.parse('2026-09-17T12:00:00')

    it('hides Draft even when a class is assigned', function () {
      expect(isStudentVisibleAssignment(
        { status: ASSIGNMENT_STATUS.DRAFT },
        { hasAssignedGroups: true, now }
      )).to.equal(false)
    })

    it('hides future Scheduled even when a class is assigned', function () {
      expect(isStudentVisibleAssignment(
        {
          status: ASSIGNMENT_STATUS.SCHEDULED,
          scheduledDate: '2099-01-01',
          scheduledTime: '08:00',
        },
        { hasAssignedGroups: true, now }
      )).to.equal(false)
    })

    it('shows Scheduled that is due as effective Published', function () {
      expect(isStudentVisibleAssignment(
        {
          status: ASSIGNMENT_STATUS.SCHEDULED,
          scheduledDate: '2020-01-01',
          scheduledTime: '08:00',
        },
        { hasAssignedGroups: true, now }
      )).to.equal(true)
    })

    it('shows Published', function () {
      expect(isStudentVisibleAssignment(
        { status: ASSIGNMENT_STATUS.PUBLISHED },
        { hasAssignedGroups: true, now }
      )).to.equal(true)
    })

    it('shows legacy missing status with groups as Published', function () {
      expect(isStudentVisibleAssignment(
        {},
        { hasAssignedGroups: true, now }
      )).to.equal(true)
    })

    it('hides missing status with no groups', function () {
      expect(isStudentVisibleAssignment(
        {},
        { hasAssignedGroups: false, now }
      )).to.equal(false)
    })
  })
}