/**
 * Reads a published Teacher Academy module.
 * Know Learning stores { name, picture, state }. state.config is the Accingo
 * module: sections, columns, and widgets. The same object is what /module/api
 * returns. Series are not part of this document.
 *
 * Saved answers for these modules use her colon FQN
 * (sectionId:columnId:widgetId). Older runs that stored a section key or a
 * bare widget id still resolve through legacyKeys.
 */

export const ACCINGO_ASSET_ORIGIN = 'https://pila-teacher-academy.accingo.co'

const SUMMARY_TYPES = new Set([
  'score',
  'timeSpent',
  'status',
  'questionBreakdown',
])

const QUIZ_TYPES = new Set([
  'multipleChoice',
  'trueFalse',
  'shortAnswer',
  'likertScale',
  'fillInTheBlank',
  'dropIntoPlace',
])

const INTERACTIVE_TYPES = new Set([
  'checklist',
  'pairUp',
  'flipCard',
  'accordion',
  'carousel',
  'feedbackLoop',
  'causalChain',
])

const IFRAME_ATTRS = new Set([
  'width',
  'height',
  'title',
  'frameborder',
  'allow',
  'referrerpolicy',
  'name',
  'loading',
])

const SUPPORTED_IFRAME_LANGS = new Set(['en', 'th'])

export function prefixAccingoImage(url) {
  if (typeof url !== 'string') return ''
  if (url.startsWith('/images/')) return `${ACCINGO_ASSET_ORIGIN}${url}`
  return url
}

function safeIframeUrl(source) {
  if (source.startsWith('/') && !source.startsWith('//')) return true
  try {
    const parsed = new URL(source)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function iframeSrc(url, lang) {
  const source = typeof url === 'string' ? url.trim() : ''
  if (!safeIframeUrl(source)) return ''
  if (!source.includes('{language}')) return source
  const short = String(lang || '').split(/[-_]/)[0].toLowerCase()
  if (!SUPPORTED_IFRAME_LANGS.has(short)) return source
  return source.replaceAll('{language}', short)
}

export function iframeAttributes(attributes) {
  const out = {}
  for (const attribute of attributes || []) {
    const key = String(attribute?.key || '').trim()
    if (!key || key.toLowerCase() === 'src') continue
    if (key.toLowerCase().startsWith('on')) continue
    if (key.toLowerCase() === 'allowfullscreen') {
      const value = String(attribute?.value ?? '').trim().toLowerCase()
      out.allowfullscreen = value === '' || value === 'true' || value === '1'
      continue
    }
    const name = key.toLowerCase()
    if (!IFRAME_ATTRS.has(name)) continue
    out[name] = String(attribute?.value ?? '')
  }
  return out
}

function plain(value, lang = 'en') {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  const short = String(lang || 'en').split(/[-_]/)[0].toLowerCase()
  if (typeof value[short] === 'string' && value[short].trim()) return value[short]
  if (typeof value.en === 'string') return value.en
  const first = Object.values(value).find((entry) => typeof entry === 'string' && entry.trim())
  return first || ''
}

function prefixLocalized(value) {
  if (typeof value === 'string') return prefixAccingoImage(value)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value || ''
  const out = {}
  for (const [lang, text] of Object.entries(value)) {
    out[lang] = typeof text === 'string' ? prefixAccingoImage(text) : text
  }
  return out
}

function configFrom(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (raw.state?.config && typeof raw.state.config === 'object') return raw.state.config
  if (raw.config && typeof raw.config === 'object') return raw.config
  if (Array.isArray(raw.sections)) return raw
  return null
}

export function isPublishedAccingoModule(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  if (raw.state != null) {
    if (typeof raw.state !== 'object' || Array.isArray(raw.state)) return false
    if (raw.state.appId !== 'module') return false
  }
  const config = configFrom(raw)
  return Boolean(config && Array.isArray(config.sections) && config.sections.length)
}

function overlayChild(overlay, item) {
  if (!overlay || typeof overlay !== 'object' || Array.isArray(overlay)) return undefined
  if (item && typeof item === 'object' && item.id != null && overlay[item.id] != null) return overlay[item.id]
  return undefined
}

function localize(source, langs) {
  const stringOverlays = {}
  for (const [lang, overlay] of Object.entries(langs || {})) {
    if (typeof overlay === 'string') stringOverlays[lang] = overlay
  }
  if (typeof source === 'string') {
    return Object.keys(stringOverlays).length ? { en: source, ...stringOverlays } : source
  }
  if (Array.isArray(source)) {
    return source.map((item) => {
      const childLangs = {}
      for (const [lang, overlay] of Object.entries(langs || {})) {
        const picked = overlayChild(overlay, item)
        if (picked !== undefined) childLangs[lang] = picked
      }
      return localize(item, childLangs)
    })
  }
  if (source && typeof source === 'object') {
    const propLangs = {}
    const unwrapProps = source.props && typeof source.props === 'object' && !Array.isArray(source.props)
    if (unwrapProps) {
      for (const [lang, overlay] of Object.entries(langs || {})) {
        if (!overlay || typeof overlay !== 'object' || Array.isArray(overlay)) continue
        propLangs[lang] = overlay.props && typeof overlay.props === 'object' ? overlay.props : overlay
      }
    }
    const keys = new Set(Object.keys(source))
    const out = {}
    for (const key of keys) {
      if (key === 'props' && unwrapProps) {
        out.props = localize(source.props, propLangs)
        continue
      }
      const childLangs = {}
      for (const [lang, overlay] of Object.entries(langs || {})) {
        if (overlay && typeof overlay === 'object' && !Array.isArray(overlay) && overlay[key] !== undefined) {
          childLangs[lang] = overlay[key]
        }
      }
      out[key] = localize(source[key], childLangs)
    }
    return out
  }
  return source
}

function optionEntries(options) {
  if (Array.isArray(options)) {
    return options.map((option, index) => ({
      id: String(option?.id ?? index),
      text: option?.displayName ?? option?.text ?? option?.label ?? '',
      feedback: option?.feedback || '',
    }))
  }
  if (options && typeof options === 'object') {
    return Object.entries(options).map(([id, option]) => ({
      id,
      text: option?.displayName ?? option?.text ?? option?.label ?? '',
      feedback: option?.feedback || '',
    }))
  }
  return []
}

function correctIds(correctAnswer) {
  if (correctAnswer == null || correctAnswer === '') return []
  if (typeof correctAnswer === 'boolean') return [correctAnswer ? 'true' : 'false']
  const list = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]
  return list.map((entry) => String(entry)).filter((entry) => entry !== '')
}

function readRate(props) {
  const rate = Number(props?.rate)
  if (!Number.isFinite(rate) || rate <= 0) return 0
  return rate
}

function joinFqn(prefix, id) {
  const part = String(id || '')
  return prefix ? `${prefix}:${part}` : part
}

function quizChrome(props) {
  return {
    title: props.title || '',
    badge: props.badge || '',
    subtitle: props.subtitle || '',
    header: props.header || '',
    caption: props.caption || '',
    feedback: props.feedback || '',
    successFeedback: props.successFeedback || '',
    failureFeedback: props.failureFeedback || '',
    optional: props.optional === true,
    rate: readRate(props),
    requireInteraction: props.requireInteraction === true,
  }
}

function choiceCheck(raw, type, fqn, props) {
  let options = optionEntries(props.options)
  if (type === 'trueFalse' && !options.length) {
    options = [
      { id: 'true', text: 'True', feedback: props.optionFeedback?.true || '' },
      { id: 'false', text: 'False', feedback: props.optionFeedback?.false || '' },
    ]
  } else if (type === 'trueFalse' && props.optionFeedback) {
    options = options.map((option) => ({
      ...option,
      feedback: option.feedback || props.optionFeedback?.[option.id] || '',
    }))
  }
  const ids = correctIds(props.correctAnswer)
  const marked = options.map((option) => ({
    id: option.id,
    text: option.text,
    feedback: option.feedback || '',
    correct: ids.includes(option.id),
  }))
  return {
    ...quizChrome(props),
    id: String(raw.id || ''),
    fqn,
    type,
    kind: 'choice',
    multi: Array.isArray(props.correctAnswer),
    hasCorrect: ids.length > 0,
    prompt: props.question || props.prompt || props.title || '',
    options: marked,
  }
}

function blankEntries(blanks) {
  return (Array.isArray(blanks) ? blanks : []).map((blank) => ({
    id: String(blank?.id || ''),
    inputType: blank?.inputType === 'dropdown' ? 'dropdown' : 'text',
    correctAnswer: blank?.correctAnswer || '',
    options: optionEntries(blank?.options),
  })).filter((blank) => blank.id)
}

function itemWidgets(items, prefix, normalize) {
  const list = Array.isArray(items)
    ? items
    : (items && typeof items === 'object' ? Object.entries(items).map(([id, item]) => ({ id, ...item })) : [])
  return list.map((item) => ({
    id: String(item.id || ''),
    title: item.title || item.label || '',
    widgets: (Array.isArray(item.widgets) ? item.widgets : []).map((widget) => (
      normalize(widget, joinFqn(prefix, item.id))
    )).filter(Boolean),
    markdown: item.markdown || '',
  }))
}

function sideItems(items) {
  const list = Array.isArray(items) ? items : []
  return list.map((item, index) => ({
    id: String(item?.id ?? index),
    title: item?.label || item?.title || item?.displayName || '',
  }))
}

function normalizeWidget(raw, prefix) {
  if (!raw || typeof raw !== 'object' || !raw.type) return null
  const props = raw.props && typeof raw.props === 'object' ? raw.props : raw
  const id = String(raw.id || '')
  const fqn = joinFqn(prefix, id)
  let type = raw.type
  if (type === 'likert') type = 'likertScale'
  if (type === 'summary_image') type = 'image'
  const chrome = quizChrome(props)

  if (type === 'multipleChoice' || type === 'trueFalse') return choiceCheck(raw, type, fqn, props)
  if (type === 'markdown') return { id, fqn, type, markdown: props.markdown || '', header: chrome.header, caption: chrome.caption }
  if (type === 'alert') {
    const level = String(props.level || '').toLowerCase()
    const kind = level === 'warning' || level === 'tip' || level === 'success' ? 'tip' : 'insight'
    return { id, fqn, type, title: props.title || '', description: props.description || '', kind, level }
  }
  if (type === 'image') {
    return { id, fqn, type, url: prefixLocalized(props.url || ''), alt: props.alt || '', uuid: props.uuid || '' }
  }
  if (type === 'iframe') {
    return {
      id,
      fqn,
      type,
      url: props.url || props.src || '',
      title: props.title || '',
      caption: props.caption || '',
      attributes: Array.isArray(props.attributes) ? props.attributes : [],
    }
  }
  if (type === 'mascot') return { id, fqn, type, message: props.message || '' }
  if (type === 'shortAnswer') {
    return { ...chrome, id, fqn, type, kind: 'text', hasCorrect: false, prompt: props.question || props.prompt || '' }
  }
  if (type === 'fillInTheBlank') {
    const blanks = blankEntries(props.blanks)
    return {
      ...chrome,
      id,
      fqn,
      type,
      kind: 'blanks',
      hasCorrect: blanks.some((blank) => blank.inputType === 'dropdown' && blank.correctAnswer),
      prompt: props.question || props.prompt || '',
      blanks,
    }
  }
  if (type === 'likertScale') {
    return { ...chrome, id, fqn, type, kind: 'scale', hasCorrect: false, prompt: props.question || props.prompt || '', min: 1, max: 5 }
  }
  if (type === 'checklist') {
    const items = optionEntries(props.items || props.options)
    return {
      id,
      fqn,
      type,
      prompt: props.title || props.prompt || '',
      subtitle: props.subtitle || '',
      items,
      requireInteraction: chrome.requireInteraction,
    }
  }
  if (type === 'accordion' || type === 'carousel' || type === 'flipCard' || type === 'feedbackLoop') {
    return {
      id,
      fqn,
      type,
      header: props.header || props.title || '',
      caption: props.caption || '',
      requireInteraction: chrome.requireInteraction,
      items: itemWidgets(props.items, fqn, normalizeWidget),
    }
  }
  if (type === 'columns') {
    const columns = (props.columns || []).map((column) => ({
      id: String(column.id || ''),
      width: Number(column.width) || 12,
      widgets: (column.widgets || []).map((widget) => (
        normalizeWidget(widget, joinFqn(fqn, column.id))
      )).filter(Boolean),
    }))
    return { id, fqn, type, columns }
  }
  if (type === 'pairUp') {
    const left = sideItems(props.leftItems)
    const right = sideItems(props.rightItems)
    const fromItems = sideItems(props.items)
    return {
      id,
      fqn,
      type,
      prompt: props.prompt || props.question || props.title || '',
      leftItems: left.length ? left : fromItems,
      rightItems: right,
      correctAnswer: Array.isArray(props.correctAnswer) ? props.correctAnswer : null,
      requireInteraction: chrome.requireInteraction,
      items: left.length ? left.concat(right) : fromItems,
    }
  }
  if (type === 'causalChain') {
    return {
      id,
      fqn,
      type,
      prompt: props.prompt || props.question || props.title || '',
      requireInteraction: chrome.requireInteraction,
      items: itemWidgets(props.items || props.steps || props.nodes, fqn, normalizeWidget),
    }
  }
  if (type === 'dropIntoPlace') {
    const items = itemWidgets(props.items, fqn, normalizeWidget)
    const correctAnswer = Array.isArray(props.correctAnswer) ? props.correctAnswer : null
    return {
      ...chrome,
      id,
      fqn,
      type,
      kind: 'place',
      hasCorrect: Boolean(correctAnswer && correctAnswer.length),
      prompt: props.question || props.prompt || props.title || '',
      items,
      correctAnswer,
    }
  }
  if (type === 'artifacts') {
    const items = Array.isArray(props.items) ? props.items : []
    return { id, fqn, type, items }
  }
  if (SUMMARY_TYPES.has(type)) return { id, fqn, type }
  return { id, fqn, type, prompt: props.question || props.title || props.prompt || '' }
}

function walk(widgets, visit) {
  for (const widget of widgets || []) {
    visit(widget)
    for (const column of widget.columns || []) walk(column.widgets, visit)
    for (const item of widget.items || []) walk(item.widgets, visit)
  }
}

function sectionColumns(section) {
  return (section?.columns || []).map((column) => {
    const columnId = String(column?.id || '')
    const prefix = joinFqn(String(section?.id || ''), columnId)
    return {
      id: columnId,
      width: Number(column?.width) || 12,
      widgets: (column?.widgets || []).map((raw) => normalizeWidget(raw, prefix)).filter(Boolean),
    }
  })
}

function isQuiz(widget) {
  return Boolean(widget) && QUIZ_TYPES.has(widget.type)
}

function collectQuizzes(columns) {
  const found = []
  for (const column of columns) walk(column.widgets, (widget) => {
    if (isQuiz(widget)) found.push(widget)
  })
  return found
}

function withoutFqn(widgets, fqn) {
  return (widgets || []).flatMap((widget) => {
    if (widget.fqn === fqn) return []
    const next = { ...widget }
    if (widget.columns) {
      next.columns = widget.columns.map((column) => ({
        ...column,
        widgets: withoutFqn(column.widgets, fqn),
      }))
    }
    if (widget.items) {
      next.items = widget.items.map((item) => ({
        ...item,
        widgets: withoutFqn(item.widgets, fqn),
      }))
    }
    return [next]
  })
}

function contentMinutes(section, summary) {
  if (summary) return 0
  const value = Number(section?.estimatedMinutes)
  if (section?.estimatedMinutes != null && section.estimatedMinutes !== '' && Number.isFinite(value) && value >= 0) {
    return value
  }
  return 2
}

function isSummarySection(section) {
  return section?.isSummary === true
}

function interactionSpec(widget) {
  if (!widget?.requireInteraction || !INTERACTIVE_TYPES.has(widget.type)) return null
  if (widget.type === 'checklist') {
    return {
      fqn: widget.fqn,
      id: widget.id,
      type: widget.type,
      itemIds: (widget.items || []).map((item) => item.id),
      needed: (widget.items || []).length,
    }
  }
  if (widget.type === 'pairUp') {
    const left = widget.leftItems?.length || 0
    const right = widget.rightItems?.length || 0
    return { fqn: widget.fqn, id: widget.id, type: widget.type, itemIds: [], needed: Math.min(left, right) }
  }
  if (widget.type === 'flipCard') {
    const count = widget.items?.length || 0
    return { fqn: widget.fqn, id: widget.id, type: widget.type, itemIds: [], needed: Math.max(0, count - 1) }
  }
  const itemIds = (widget.items || [])
    .filter((item) => widget.type === 'carousel' || widget.type === 'accordion' || (item.widgets || []).length > 0)
    .map((item) => item.id)
  return { fqn: widget.fqn, id: widget.id, type: widget.type, itemIds, needed: itemIds.length }
}

function bodyFromColumns(columns) {
  const filled = columns.filter((column) => column.widgets.length)
  if (filled.length <= 1) return filled[0]?.widgets || []
  return [{
    id: 'section-columns',
    fqn: 'section-columns',
    type: 'columns',
    columns: filled,
  }]
}

function firstMarkdown(widgets) {
  let found = null
  walk(widgets, (widget) => {
    if (!found && widget.type === 'markdown' && plain(widget.markdown)) found = widget.markdown
  })
  return found
}

function excerpt(markdown) {
  if (markdown == null) return ''
  const source = typeof markdown === 'string' ? { en: markdown } : markdown
  if (!source || typeof source !== 'object') return ''
  const out = {}
  for (const [lang, text] of Object.entries(source)) {
    if (typeof text !== 'string') continue
    const body = text.replace(/^#{1,6}\s+.*$/gm, ' ').replace(/\s+/g, ' ').trim()
    out[lang] = body.slice(0, 180)
  }
  return plain(out) ? out : ''
}

function fileName(item) {
  if (typeof item?.name === 'string' || (item?.name && typeof item.name === 'object')) return item.name
  return item?.id || 'Download'
}

function sameSet(left, right) {
  if (left.length !== right.length) return false
  const have = new Set(left)
  return right.every((value) => have.has(value))
}

export function readStoredAnswer(runstate, fqn, legacyKeys) {
  const answers = runstate?.answers || {}
  if (fqn && Object.prototype.hasOwnProperty.call(answers, fqn) && answers[fqn] != null) return answers[fqn]
  for (const key of legacyKeys || []) {
    if (key && Object.prototype.hasOwnProperty.call(answers, key) && answers[key] != null) return answers[key]
  }
  return undefined
}

export function quizStatus(check, answer) {
  if (!check) return 'unanswered'
  if (check.kind === 'choice') {
    const selected = Array.isArray(answer) ? answer : (answer == null ? [] : [answer])
    if (!selected.length || selected.some((index) => !Number.isInteger(index))) return 'unanswered'
    if (!check.hasCorrect) return 'completed'
    const chosen = selected.map((index) => check.options?.[index]?.id).filter(Boolean)
    const expected = (check.options || []).filter((option) => option.correct).map((option) => option.id)
    return sameSet(chosen, expected) ? 'completed' : 'incorrect'
  }
  if (check.kind === 'text') return String(answer || '').trim() ? 'completed' : 'unanswered'
  if (check.kind === 'scale') return Number.isFinite(Number(answer)) ? 'completed' : 'unanswered'
  if (check.kind === 'blanks') {
    const blanks = check.blanks || []
    if (!blanks.length) return 'unanswered'
    const values = answer && typeof answer === 'object' ? answer : {}
    if (!blanks.every((blank) => String(values[blank.id] || '').trim())) return 'unanswered'
    if (!check.hasCorrect) return 'completed'
    const graded = blanks.filter((blank) => blank.inputType === 'dropdown' && blank.correctAnswer)
    return graded.every((blank) => values[blank.id] === blank.correctAnswer) ? 'completed' : 'incorrect'
  }
  if (check.kind === 'place') {
    const count = check.items?.length || 0
    const placements = answer && typeof answer === 'object' ? answer : {}
    if (!count) return 'completed'
    for (let slot = 0; slot < count; slot += 1) {
      if (placements[String(slot)] == null || placements[String(slot)] === '') return 'unanswered'
    }
    if (!check.hasCorrect) return 'completed'
    const pairs = check.correctAnswer || []
    for (let slot = 0; slot < count; slot += 1) {
      const card = String(placements[String(slot)])
      const match = pairs.some((pair) => String(pair.leftId) === String(slot) && String(pair.rightId) === card)
      if (!match) return 'incorrect'
    }
    return 'completed'
  }
  return answer == null ? 'unanswered' : 'completed'
}

export function interactionDone(spec, answer) {
  if (!spec) return true
  if (spec.type === 'checklist') {
    if (!spec.itemIds.length) return true
    const checked = new Set(Array.isArray(answer) ? answer : [])
    return spec.itemIds.every((id) => checked.has(id))
  }
  if (spec.type === 'pairUp') {
    if (!spec.needed) return true
    const pairs = Array.isArray(answer?.pairs) ? answer.pairs : (Array.isArray(answer) ? answer : [])
    return pairs.length >= spec.needed
  }
  if (spec.type === 'flipCard') {
    const flipped = Number(answer?.flipped ?? answer ?? 0)
    return flipped >= (spec.needed || 0)
  }
  if (!spec.itemIds.length) return true
  const viewed = new Set(Array.isArray(answer?.viewedItemIds) ? answer.viewedItemIds : (Array.isArray(answer) ? answer : []))
  if (answer?.currentId) viewed.add(answer.currentId)
  return spec.itemIds.every((id) => viewed.has(id))
}

function sectionChecks(section) {
  return Array.isArray(section?.checks) ? section.checks : []
}

export function accingoBlocked(module, sectionKey, runstate) {
  const section = module?.sections?.[sectionKey]
  if (!section) return 'unknown-section'
  for (const check of sectionChecks(section)) {
    if (check.optional) continue
    const answer = readStoredAnswer(runstate, check.fqn, check.legacyKeys)
    if (quizStatus(check, answer) === 'unanswered') return 'check-required'
  }
  for (const spec of section.interactions || []) {
    const answer = readStoredAnswer(runstate, spec.fqn, [spec.id])
    if (!interactionDone(spec, answer)) return 'interaction-required'
  }
  if (module.correctnessFeedback === 'onDemand' && section.needsReveal) {
    if (runstate?.checkedSections?.[sectionKey] !== true) return 'reveal-required'
  }
  return null
}

export function accingoScore(module, runstate) {
  let max = 0
  let earned = 0
  let rated = false
  for (const key of Object.keys(module?.sections || {})) {
    for (const check of sectionChecks(module.sections[key])) {
      if (!(check.rate > 0)) continue
      rated = true
      max += check.rate
      const answer = readStoredAnswer(runstate, check.fqn, check.legacyKeys)
      if (quizStatus(check, answer) === 'completed') earned += check.rate
    }
  }
  if (!rated) return { scoreRaw: null, scoreMin: null, scoreMax: null, scoreScaled: null }
  return { scoreRaw: earned, scoreMin: 0, scoreMax: max, scoreScaled: max ? earned / max : 0 }
}

export function accingoNeedsReview(module, runstate) {
  for (const key of Object.keys(module?.sections || {})) {
    for (const check of sectionChecks(module.sections[key])) {
      const answer = readStoredAnswer(runstate, check.fqn, check.legacyKeys)
      if (quizStatus(check, answer) === 'incorrect') return true
    }
  }
  return false
}

export function accingoProgress(module, runstate) {
  const keys = Object.keys(module?.sections || {}).sort((a, b) => Number(a) - Number(b))
  const weights = keys.map((key) => {
    const minutes = Number(module.sections[key]?.estimatedMinutes)
    return Number.isFinite(minutes) && minutes >= 0 ? minutes : 2
  })
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  if (!total) return 0
  let done = 0
  const cursor = Math.max(Number(runstate?.sectionIndex) || 0, Number(runstate?.maxSectionIndex) || 0)
  const frontier = Math.min(Math.max(0, cursor), Math.max(0, keys.length - 1))
  keys.forEach((key, index) => {
    if (runstate?.continued?.[key]) {
      done += weights[index]
      return
    }
    if (index !== frontier) return
    const required = sectionChecks(module.sections[key]).filter((check) => !check.optional)
    if (!required.length) return
    const answered = required.filter((check) => (
      quizStatus(check, readStoredAnswer(runstate, check.fqn, check.legacyKeys)) !== 'unanswered'
    )).length
    done += (answered / required.length) * (weights[index] / 2)
  })
  return Math.min(1, done / total)
}

export function accingoBreakdown(module, runstate) {
  const rows = []
  const keys = Object.keys(module?.sections || {}).sort((a, b) => Number(a) - Number(b))
  for (const key of keys) {
    for (const check of sectionChecks(module.sections[key])) {
      const answer = readStoredAnswer(runstate, check.fqn, check.legacyKeys)
      const status = quizStatus(check, answer)
      if (status === 'unanswered') continue
      rows.push({
        prompt: check.prompt,
        correct: status === 'completed' && check.hasCorrect === true,
        poll: check.hasCorrect !== true,
        status,
        rate: check.rate || 0,
      })
    }
  }
  return rows
}

export function readAccingoModule(raw, id) {
  if (!isPublishedAccingoModule(raw)) return null
  const config = configFrom(raw)
  if (!config || !Array.isArray(config.sections) || !config.sections.length) return null
  const langs = {}
  for (const [lang, tree] of Object.entries(config.translations || {})) {
    if (lang !== 'en' && tree && typeof tree === 'object') langs[lang] = tree
  }
  const localized = localize(config, langs)
  const lesson = []
  let summaryMarkdown = ''
  let reflection = null
  const downloads = []
  const seenDownloads = new Set()
  function addDownload(item) {
    const key = String(item?.id || item?.url || '')
    if (key && seenDownloads.has(key)) return
    if (key) seenDownloads.add(key)
    downloads.push({
      name: fileName(item),
      url: item?.url || '',
      type: item?.type || '',
      size: item?.size || '',
      id: item?.id || '',
    })
  }
  for (const artifactId of config.artifacts || []) {
    if (typeof artifactId === 'string' && artifactId.trim()) addDownload({ id: artifactId.trim(), name: artifactId.trim() })
  }
  for (const section of localized.sections) {
    const columns = sectionColumns(section)
    walk(columns.flatMap((column) => column.widgets), (widget) => {
      if (widget.type !== 'artifacts') return
      for (const item of widget.items || []) addDownload(item)
    })
    const summary = isSummarySection(section)
    if (summary) {
      const widgets = columns.flatMap((column) => column.widgets)
      const markdown = firstMarkdown(widgets)
      if (markdown) summaryMarkdown = markdown
      walk(widgets, (widget) => {
        if (!reflection && widget.type === 'shortAnswer' && plain(widget.prompt)) {
          reflection = { kind: 'text', prompt: widget.prompt }
        }
      })
      continue
    }
    const quizzes = collectQuizzes(columns)
    const quizColumns = columns.filter((column) => column.widgets.length === 1 && isQuiz(column.widgets[0]))
    const filled = columns.filter((column) => column.widgets.length)
    const sidebar = quizColumns.length === 1 && filled.length > 1 ? quizColumns[0].widgets[0] : null
    const bodyColumns = sidebar
      ? columns.map((column) => ({ ...column, widgets: withoutFqn(column.widgets, sidebar.fqn) }))
      : columns
    const interactions = []
    walk(bodyColumns.flatMap((column) => column.widgets), (widget) => {
      const spec = interactionSpec(widget)
      if (spec) interactions.push(spec)
    })
    const needsReveal = quizzes.some((quiz) => quiz.hasCorrect === true)
    const page = {
      id: String(section.id || lesson.length),
      label: section.label || '',
      nextLabel: section.nextLabel || '',
      previousLabel: section.previousLabel || '',
      estimatedMinutes: contentMinutes(section, false),
      title: section.label || '',
      widgets: bodyFromColumns(bodyColumns),
      check: null,
      checks: quizzes,
      interactions,
      needsReveal,
    }
    if (sidebar) page.check = sidebar
    lesson.push(page)
  }
  if (!lesson.length) return null
  const sections = {}
  lesson.forEach((section, index) => {
    const key = String(index)
    if (section.check) section.check.legacyKeys = [key, section.check.id].filter(Boolean)
    for (const check of section.checks || []) {
      check.legacyKeys = section.check && check.fqn === section.check.fqn
        ? [key, check.id].filter(Boolean)
        : [check.id].filter(Boolean)
    }
    sections[key] = section
  })
  const minutes = lesson.reduce((sum, section) => sum + (section.estimatedMinutes || 0), 0)
  const title = localized.title || raw?.state?.name || raw?.name || ''
  const description = excerpt(firstMarkdown(lesson[0].widgets))
  const picture = raw?.picture || raw?.state?.picture || ''
  return {
    id: id || raw?.state?.uuid || raw?.uuid || '',
    format: 'accingo',
    name: title,
    description,
    cover: picture,
    durationMinutes: minutes || null,
    correctnessFeedback: localized.correctnessFeedback || config.correctnessFeedback || 'summaryOnly',
    defaultLanguage: localized.defaultLanguage || config.defaultLanguage || 'en',
    sections,
    downloads,
    reflection,
    summaryMarkdown,
    related: [],
    tools: [],
  }
}
