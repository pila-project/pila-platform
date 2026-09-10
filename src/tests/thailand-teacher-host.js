import { isThailandTeacherHost, THAILAND_TEACHER_HOSTS } from '../utils/constants.js'

export default function thailandTeacherHostTests() {
  describe('teacher Trainer tab host gate (src/utils/constants.js)', function () {
    it('allows Thailand production and Thai gforce hosts', function () {
      expect(THAILAND_TEACHER_HOSTS).to.include('thailand.pilaproject.org')
      expect(isThailandTeacherHost('thailand.pilaproject.org')).to.equal(true)
      expect(isThailandTeacherHost('dev.gforcesolution.com')).to.equal(true)
      expect(isThailandTeacherHost('pila.gforcesolution.com')).to.equal(true)
      expect(isThailandTeacherHost('thaipilacreate.gforcesolution.com')).to.equal(true)
    })

    it('hides the tab on PILA International', function () {
      expect(isThailandTeacherHost('app.pilaproject.org')).to.equal(false)
      expect(isThailandTeacherHost('ui-dev.pilaproject.org')).to.equal(false)
      expect(isThailandTeacherHost('testing.pilaproject.org')).to.equal(false)
    })
  })
}
