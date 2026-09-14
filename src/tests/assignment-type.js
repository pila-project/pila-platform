import {
  ASSIGNMENT_TYPE_SLUGS,
  normalizeAssignmentType,
  assignmentTypeLabel,
  assignmentTypeBadgeClass,
  assignmentTypeOptions,
} from '../utils/assignment-type.js'

export default function assignmentTypeTests() {
  describe('assignment-type model (shipped src/utils/assignment-type.js)', function () {
    it('normalizes slug, English title-case, and localized labels', function () {
      expect(normalizeAssignmentType('homework')).to.equal('homework')
      expect(normalizeAssignmentType('Homework')).to.equal('homework')
      expect(normalizeAssignmentType('การบ้าน')).to.equal('homework')
      expect(normalizeAssignmentType('Assessment')).to.equal('assessment')
      expect(normalizeAssignmentType('การประเมิน')).to.equal('assessment')
      expect(normalizeAssignmentType('Practice')).to.equal('practice')
      expect(normalizeAssignmentType('ฝึกฝน')).to.equal('practice')
      expect(normalizeAssignmentType('Learning')).to.equal('learning')
      expect(normalizeAssignmentType('การเรียนรู้')).to.equal('learning')
      expect(normalizeAssignmentType('')).to.equal('')
      expect(normalizeAssignmentType(null)).to.equal('')
      expect(normalizeAssignmentType('not-a-type')).to.equal('')
    })

    it('exposes all canonical slugs for PSelect options', function () {
      expect([...ASSIGNMENT_TYPE_SLUGS]).to.deep.equal([
        'assessment',
        'practice',
        'homework',
        'learning',
      ])
      const opts = assignmentTypeOptions(slug => `L:${slug}`)
      expect(opts).to.deep.equal([
        { value: 'assessment', title: 'L:assessment' },
        { value: 'practice', title: 'L:practice' },
        { value: 'homework', title: 'L:homework' },
        { value: 'learning', title: 'L:learning' },
      ])
    })

    it('labels and badge classes go through the slug', function () {
      expect(assignmentTypeLabel('การบ้าน', s => s.toUpperCase())).to.equal('HOMEWORK')
      expect(assignmentTypeBadgeClass('Homework')).to.equal('assign-type-pill assign-type-homework')
      expect(assignmentTypeBadgeClass('unknown')).to.equal('assign-type-pill assign-type-default')
    })
  })
}
