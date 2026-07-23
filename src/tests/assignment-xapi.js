import { assignmentXapiStatement } from '../assignment-xapi.js'

export default function assignmentXapiTests() {
  describe('Assignment xAPI statements', function () {
    it('creates an assigned statement for a sequence UUID', function () {
      const sequenceId = '11111111-1111-4111-8111-111111111111'
      const statement = assignmentXapiStatement(
        'teacher-id',
        sequenceId,
        ['class-b', 'class-a', 'class-b']
      )

      expect(statement).to.deep.equal({
        actor: 'teacher-id',
        authority: 'teacher-id',
        verb: 'assigned',
        object: sequenceId,
        extensions: {
          assignedClassIds: ['class-a', 'class-b']
        }
      })
    })

    it('does not create a statement without a sequence UUID', function () {
      expect(assignmentXapiStatement('teacher-id', null, [])).to.equal(null)
      expect(assignmentXapiStatement('teacher-id', 'https://example.com', [])).to.equal(null)
    })
  })
}
