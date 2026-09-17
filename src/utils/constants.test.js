import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  INTERNATIONAL_HOSTS,
  THAILAND_TEACHER_HOSTS,
  SIMPLIFIED_STUDY_DOMAINS,
  HOST_TO_TITLE,
  isInternationalHost,
  isThailandTeacherHost,
  consentCopyVariant,
} from './constants.js'
import staticTranslations from '../store/staticTranslations.js'

const LANGS = ['de', 'en', 'es', 'fr', 'km', 'lv', 'nl', 'pl', 'pt', 'sk', 'th']

const NEW_SLUGS = [
  'all-saved-versions-of-your-answers-and-solutions',
  'conversations-with-ai-chatbots-designed-for-educ',
  'i-also-confirm-that-as-participation-in-pila-is',
  'i-confirm',
  'if-there-is-anything-in-this-text-you-do-not-und',
  'in-accordance-with-the-pila-personal-data-protec',
  'know-learning-keeps-this-data-secure-and-shares',
  'know-learning-the-company-that-created-and-manag',
  'the-types-of-activity-data-include',
  'where-you-click',
  'while-you-work-on-the-platform-certain-data-rega',
  'you-are-currently-logging-into-a-student-account',
  'your-teacher-will-be-able-to-see-your-progress-o',
  'your-teacher-will-see-progress-but-not-chatbot-c',
]

const RCT_STUDENT_SLUGS = [
  'you-are-about-to-create-a-student-account-on-pil',
  'the-kinds-of-activity-data-include',
  'your-clicks',
  'information-about-your-screen-and-device',
  'all-saved-versions-of-your-answers-solutions-inc',
  'know-learning-will-keep-this-data-safe-and-wont',
]

const RCT_TEACHER_SLUGS = [
  'per-the-pila-personal-data-protection-notice-or',
  'i-confirm-consent-collected',
]

describe('isInternationalHost', () => {
  it('includes production, ui-dev, testing, and expert localhost mapped International', () => {
    assert.ok(INTERNATIONAL_HOSTS.includes('app.pilaproject.org'))
    assert.ok(INTERNATIONAL_HOSTS.includes('ui-dev.pilaproject.org'))
    assert.ok(INTERNATIONAL_HOSTS.includes('testing.pilaproject.org'))
    assert.equal(isInternationalHost('app.pilaproject.org'), true)
    assert.equal(isInternationalHost('ui-dev.pilaproject.org'), true)
    assert.equal(isInternationalHost('testing.pilaproject.org'), true)
    assert.equal(HOST_TO_TITLE['f74e9cb3-2b53-4c85-9b0c-f1d61b032b3f.localhost:9898'], 'International')
    assert.equal(isInternationalHost('f74e9cb3-2b53-4c85-9b0c-f1d61b032b3f.localhost:9898'), true)
  })

  it('excludes Thailand, RCT, and other country hosts', () => {
    assert.equal(isInternationalHost('thailand.pilaproject.org'), false)
    assert.equal(isInternationalHost('dev.gforcesolution.com'), false)
    assert.equal(isInternationalHost('france-rct-2025.pilaproject.org'), false)
    assert.equal(isInternationalHost('deutschland-rct-2026.pilaproject.org'), false)
    assert.equal(isInternationalHost('cambodia.pilaproject.org'), false)
  })
})

describe('UIUX-245 admin chrome host gates', () => {
  function trainersTabVisible(host) {
    return !SIMPLIFIED_STUDY_DOMAINS.includes(host) && !isInternationalHost(host)
  }
  function createTeacherVisible(host) {
    return SIMPLIFIED_STUDY_DOMAINS.includes(host)
  }

  it('hides Trainers and Create teacher / encryption on International hosts', () => {
    for (const host of ['app.pilaproject.org', 'ui-dev.pilaproject.org', 'testing.pilaproject.org']) {
      assert.equal(isInternationalHost(host), true, host)
      assert.equal(trainersTabVisible(host), false, host)
      assert.equal(createTeacherVisible(host), false, host)
    }
  })

  it('keeps Trainers, hides Create teacher / encryption on Thailand + gforce', () => {
    for (const host of THAILAND_TEACHER_HOSTS) {
      assert.equal(isInternationalHost(host), false, host)
      assert.equal(isThailandTeacherHost(host), true, host)
      assert.equal(trainersTabVisible(host), true, host)
      assert.equal(createTeacherVisible(host), false, host)
    }
  })

  it('hides Trainers, keeps Create teacher / encryption on RCT / SIMPLIFIED_STUDY_DOMAINS', () => {
    assert.ok(SIMPLIFIED_STUDY_DOMAINS.includes('france-rct-2025.pilaproject.org'))
    assert.ok(SIMPLIFIED_STUDY_DOMAINS.includes('deutschland-rct-2026.pilaproject.org'))
    for (const host of SIMPLIFIED_STUDY_DOMAINS) {
      assert.equal(isInternationalHost(host), false, host)
      assert.equal(trainersTabVisible(host), false, host)
      assert.equal(createTeacherVisible(host), true, host)
    }
  })

  it('keeps Trainers, hides Create teacher / encryption on Cambodia', () => {
    const host = 'cambodia.pilaproject.org'
    assert.equal(isInternationalHost(host), false)
    assert.equal(isThailandTeacherHost(host), false)
    assert.equal(SIMPLIFIED_STUDY_DOMAINS.includes(host), false)
    assert.equal(trainersTabVisible(host), true)
    assert.equal(createTeacherVisible(host), false)
  })

  it('does not put International hosts into SIMPLIFIED_STUDY_DOMAINS', () => {
    for (const host of INTERNATIONAL_HOSTS) {
      assert.equal(SIMPLIFIED_STUDY_DOMAINS.includes(host), false, host)
    }
    assert.equal(SIMPLIFIED_STUDY_DOMAINS.includes('app.pilaproject.org'), false)
    assert.equal(SIMPLIFIED_STUDY_DOMAINS.includes('ui-dev.pilaproject.org'), false)
    assert.equal(SIMPLIFIED_STUDY_DOMAINS.includes('testing.pilaproject.org'), false)
  })
})

describe('consentCopyVariant', () => {
  it('returns international / thailand / legacy (RCT unchanged)', () => {
    assert.equal(consentCopyVariant('app.pilaproject.org'), 'international')
    assert.equal(consentCopyVariant('ui-dev.pilaproject.org'), 'international')
    assert.equal(consentCopyVariant('testing.pilaproject.org'), 'international')
    assert.equal(consentCopyVariant('f74e9cb3-2b53-4c85-9b0c-f1d61b032b3f.localhost:9898'), 'international')
    for (const host of THAILAND_TEACHER_HOSTS) {
      assert.equal(consentCopyVariant(host), 'thailand', host)
    }
    for (const host of SIMPLIFIED_STUDY_DOMAINS) {
      assert.equal(consentCopyVariant(host), 'legacy', host)
    }
    assert.equal(consentCopyVariant('cambodia.pilaproject.org'), 'legacy')
  })
})

describe('Emma consent slugs', () => {
  it('adds new strings in every UI language', () => {
    for (const slug of NEW_SLUGS) {
      const entry = staticTranslations[slug]
      assert.ok(entry, `missing slug ${slug}`)
      for (const lang of LANGS) {
        assert.equal(typeof entry[lang], 'string', `${slug}.${lang}`)
        assert.ok(entry[lang].trim().length > 0, `${slug}.${lang} empty`)
      }
    }
  })

  it('keeps Emma International EN wording', () => {
    assert.equal(
      staticTranslations['you-are-currently-logging-into-a-student-account'].en,
      'You are currently logging into a student account on the Platform for Innovative Learning Assessments (PILA).',
    )
    assert.equal(
      staticTranslations['while-you-work-on-the-platform-certain-data-rega'].en,
      'While you work on the platform, certain data regarding your usage will be recorded.',
    )
    assert.equal(
      staticTranslations['the-types-of-activity-data-include'].en,
      'The types of activity data include:',
    )
    assert.equal(staticTranslations['where-you-click'].en, 'where you click')
    assert.equal(
      staticTranslations['all-saved-versions-of-your-answers-and-solutions'].en,
      'all saved versions of your answers and solutions',
    )
    assert.equal(
      staticTranslations['know-learning-the-company-that-created-and-manag'].en,
      'Know Learning, the company that created and manages PILA, will keep this data secure. Some of this data may be processed (but never stored) by Google Cloud Platform to ensure the platform functions correctly.',
    )
    assert.equal(
      staticTranslations['your-teacher-will-be-able-to-see-your-progress-o'].en,
      'Your teacher will be able to see your progress on individual exercises via their teacher account. Within PILA, only your teacher can see your name.',
    )
    assert.equal(
      staticTranslations['if-there-is-anything-in-this-text-you-do-not-und'].en,
      'If there is anything in this text you do not understand or anything that makes you uncomfortable, please tell your teacher before you start using PILA.',
    )
    assert.equal(staticTranslations['i-confirm'].en, 'I confirm.')
    assert.ok(!staticTranslations['know-learning-the-company-that-created-and-manag'].en.includes('OpenAI'))
    assert.equal(
      staticTranslations['in-accordance-with-the-pila-personal-data-protec'].en,
      'In accordance with the PILA Personal Data Protection Notice, I confirm that, before allowing students to use PILA, I and/or my institution have provided any required privacy notices and obtained any parental/legal guardian and/or student consent or authorisation required by applicable law.',
    )
    assert.equal(
      staticTranslations['i-also-confirm-that-as-participation-in-pila-is'].en,
      'I also confirm that, as participation in PILA is voluntary, I will respect any request from students or their parent/legal guardian to stop participating and promptly request the erasure of the student’s data held in connection with PILA.',
    )
    assert.equal(
      staticTranslations['conversations-with-ai-chatbots-designed-for-educ'].en,
      'conversations with AI chatbots designed for educational use (if available)',
    )
  })

  it('keeps RCT student and add-student EN copy unchanged', () => {
    assert.ok(
      staticTranslations['you-are-about-to-create-a-student-account-on-pil'].en.includes('OpenAI'),
    )
    assert.equal(
      staticTranslations['information-about-your-screen-and-device'].en,
      'information about your screen and device',
    )
    assert.equal(
      staticTranslations['the-kinds-of-activity-data-include'].en,
      'The kinds of activity data include:',
    )
    assert.equal(
      staticTranslations['i-confirm-consent-collected'].en,
      'I confirm that I collected the necessary consent',
    )
    assert.ok(
      staticTranslations['per-the-pila-personal-data-protection-notice-or'].en.startsWith(
        'Per the PILA Personal Data Protection Notice',
      ),
    )
    for (const slug of [...RCT_STUDENT_SLUGS, ...RCT_TEACHER_SLUGS]) {
      assert.ok(staticTranslations[slug], slug)
    }
  })
})
