// Skill names the old sequence player already translates for a Candli close.
const THAI_SKILL = {
  addition: 'บวก',
  subtraction: 'ลบ',
  multiplication: 'คูณ',
  division: 'หาร',
  comparison: 'การเปรียบเทียบ',
  'conversion of volume': 'การแปลงหน่วยปริมาตร',
  perimeter: 'เส้นรอบรูป',
  'math reasoning': 'การให้เหตุผลทางคณิตศาสตร์',
  compute: 'คำนวณ',
  equation: 'สมการ',
  area: 'พื้นที่',
  general: 'ทั่วไป',
  attempts: 'ลองใหม่',
  observe: 'สังเกต',
  infer: 'สรุปความหมาย',
  explain: 'อธิบาย',
  compare: 'เปรียบเทียบ',
  experiment: 'การทดลอง',
  hypothesise: 'การตั้งสมมติฐาน',
  analyse: 'การวิเคราะห์',
  strategise: 'การวางกลยุทธ์',
  strategize: 'การวางกลยุทธ์',
}

/** "compute:addition +" becomes the skill word the student should read. */
export function competencySkillWord(key) {
  const tail = String(key ?? '').split(':').pop() || ''
  return tail
    .replace(/[+\-×÷*/=]+$/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function competencyScoreLabel(key, language = 'en') {
  const word = competencySkillWord(key)
  if (!word) return String(key ?? '')
  const lang = String(language || 'en').split(/[-_]/)[0]
  if (lang === 'th' && THAI_SKILL[word.toLowerCase()]) return THAI_SKILL[word.toLowerCase()]
  return word.split(' ').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

/** One segment per point. 1/3 is one filled section and two empty ones. */
export function competencyScoreSections(row) {
  const total = Math.max(0, Math.round(Number(row?.[1]) || 0))
  const filled = Math.max(0, Math.min(total, Math.round(Number(row?.[0]) || 0)))
  return { filled, total }
}
