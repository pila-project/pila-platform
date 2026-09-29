/**
 * Reads a published Teacher Academy module.
 * Know Learning stores { name, picture, state }. state.config is the Accingo
 * module: sections, columns, and widgets. The same object is what /module/api
 * returns. Series are not part of this document.
 */

const SUMMARY_TYPES = new Set([
  'score',
  'timeSpent',
  'status',
  'questionBreakdown',
  'summary_image',
  'summary_markdown',
  'summary_metrics',
])

const SCORED_TYPES = new Set(['multipleChoice', 'trueFalse'])

function plain(value, lang = 'en') {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  const short = String(lang || 'en').split(/[-_]/)[0].toLowerCase()
  if (typeof value[short] === 'string' && value[short].trim()) return value[short]
  if (typeof value.en === 'string') return value.en
  const first = Object.values(value).find((entry) => typeof entry === 'string' && entry.trim())
  return first || ''
}

function configFrom(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (raw.state?.config && typeof raw.state.config === 'object') return raw.state.config
  if (raw.config && typeof raw.config === 'object') return raw.config
  if (Array.isArray(raw.sections)) return raw
  return null
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
    }))
  }
  if (options && typeof options === 'object') {
    return Object.entries(options).map(([id, option]) => ({
      id,
      text: option?.displayName ?? option?.text ?? option?.label ?? '',
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

function choiceWidget(raw, type) {
  const props = raw.props && typeof raw.props === 'object' ? raw.props : raw
  let options = optionEntries(props.options)
  if (type === 'trueFalse' && !options.length) {
    options = [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' },
    ]
  }
  const ids = correctIds(props.correctAnswer)
  const marked = options.map((option) => ({
    text: option.text,
    correct: ids.includes(option.id),
  }))
  return {
    id: String(raw.id || ''),
    type,
    badge: props.badge || '',
    prompt: props.question || props.prompt || props.title || '',
    options: marked,
    scored: SCORED_TYPES.has(type) && marked.some((option) => option.correct),
    feedback: props.successFeedback || props.feedback || '',
  }
}

function nestedWidgets(list) {
  return (Array.isArray(list) ? list : []).map(normalizeWidget).filter(Boolean)
}

function itemWidgets(items) {
  const list = Array.isArray(items)
    ? items
    : (items && typeof items === 'object' ? Object.entries(items).map(([id, item]) => ({ id, ...item })) : [])
  return list.map((item) => ({
    id: String(item.id || ''),
    title: item.title || item.label || '',
    widgets: nestedWidgets(item.widgets || item.columns || []),
    markdown: item.markdown || '',
  }))
}

function normalizeWidget(raw) {
  if (!raw || typeof raw !== 'object' || !raw.type) return null
  const props = raw.props && typeof raw.props === 'object' ? raw.props : raw
  const id = String(raw.id || '')
  const type = raw.type
  if (type === 'multipleChoice' || type === 'trueFalse') return choiceWidget(raw, type)
  if (type === 'markdown') return { id, type, markdown: props.markdown || '' }
  if (type === 'alert') {
    const level = String(props.level || '').toLowerCase()
    return {
      id,
      type,
      title: props.title || '',
      description: props.description || '',
      kind: level === 'warning' || level === 'tip' ? 'tip' : 'insight',
    }
  }
  if (type === 'image' || type === 'summary_image') {
    return { id, type: 'image', url: props.url || '', alt: props.alt || '', uuid: props.uuid || '' }
  }
  if (type === 'iframe') return { id, type, url: props.url || props.src || '', title: props.title || '' }
  if (type === 'mascot') return { id, type, message: props.message || '' }
  if (type === 'shortAnswer') return { id, type, prompt: props.question || props.prompt || '', caption: props.caption || '' }
  if (type === 'fillInTheBlank') return { id, type, prompt: props.question || props.prompt || props.markdown || '' }
  if (type === 'likert') {
    return {
      id,
      type,
      prompt: props.question || props.prompt || '',
      min: Number(props.min ?? 1),
      max: Number(props.max ?? 5),
    }
  }
  if (type === 'checklist') {
    return { id, type, prompt: props.title || props.prompt || '', items: optionEntries(props.items || props.options) }
  }
  if (type === 'accordion' || type === 'carousel' || type === 'flipCard' || type === 'feedbackLoop') {
    return { id, type, header: props.header || props.title || '', items: itemWidgets(props.items) }
  }
  if (type === 'columns') {
    const columns = (props.columns || []).map((column) => ({
      id: String(column.id || ''),
      width: Number(column.width) || 12,
      widgets: nestedWidgets(column.widgets),
    }))
    return { id, type, columns }
  }
  if (type === 'pairUp' || type === 'causalChain' || type === 'dropIntoPlace') {
    return {
      id,
      type,
      prompt: props.prompt || props.question || props.title || '',
      items: itemWidgets(props.items || props.pairs || props.steps || props.nodes),
    }
  }
  if (type === 'artifacts') {
    const items = Array.isArray(props.items) ? props.items : []
    return { id, type, items }
  }
  if (SUMMARY_TYPES.has(type)) return { id, type }
  return { id, type, prompt: props.question || props.title || props.prompt || '' }
}

function walk(widgets, visit) {
  for (const widget of widgets || []) {
    visit(widget)
    for (const column of widget.columns || []) walk(column.widgets, visit)
    for (const item of widget.items || []) walk(item.widgets, visit)
  }
}

function listScored(widgets) {
  const found = []
  walk(widgets, (widget) => {
    if (widget.scored) found.push(widget)
  })
  return found
}

function withoutWidget(widgets, id) {
  return (widgets || []).flatMap((widget) => {
    if (widget.id === id && widget.scored) return []
    const next = { ...widget }
    if (widget.columns) {
      next.columns = widget.columns.map((column) => ({
        ...column,
        widgets: withoutWidget(column.widgets, id),
      }))
    }
    if (widget.items) {
      next.items = widget.items.map((item) => ({
        ...item,
        widgets: withoutWidget(item.widgets, id),
      }))
    }
    return [next]
  })
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

function sectionWidgets(section) {
  const widgets = []
  for (const column of section?.columns || []) {
    for (const raw of column?.widgets || []) {
      const widget = normalizeWidget(raw)
      if (widget) widgets.push(widget)
    }
  }
  return widgets
}

function isSummary(section, widgets) {
  if (String(section?.id || '').toLowerCase().includes('summary')) return true
  if (!widgets.length) return false
  const types = []
  walk(widgets, (widget) => types.push(widget.type))
  return types.some((type) => SUMMARY_TYPES.has(type))
    && types.every((type) => SUMMARY_TYPES.has(type) || type === 'image' || type === 'markdown' || type === 'artifacts' || type === 'shortAnswer' || type === 'columns')
}

function fileName(item) {
  if (typeof item?.name === 'string' || (item?.name && typeof item.name === 'object')) return item.name
  return item?.id || 'Download'
}

export function readAccingoModule(raw, id) {
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
  for (const section of localized.sections) {
    const widgets = sectionWidgets(section)
    walk(widgets, (widget) => {
      if (widget.type !== 'artifacts') return
      for (const item of widget.items || []) {
        downloads.push({
          name: fileName(item),
          url: item.url || '',
          type: item.type || '',
          size: item.size || '',
          id: item.id || '',
        })
      }
    })
    if (isSummary(section, widgets)) {
      const markdown = firstMarkdown(widgets)
      if (markdown) summaryMarkdown = markdown
      walk(widgets, (widget) => {
        if (!reflection && widget.type === 'shortAnswer' && plain(widget.prompt)) {
          reflection = { kind: 'text', prompt: widget.prompt }
        }
      })
      continue
    }
    const scored = listScored(widgets)
    const single = scored.length === 1 ? scored[0] : null
    const beside = single ? withoutWidget(widgets, single.id) : widgets
    const useSidebar = Boolean(single) && beside.length > 0
    const body = useSidebar ? beside : widgets
    const page = {
      id: String(section.id || lesson.length),
      estimatedMinutes: section.estimatedMinutes == null || section.estimatedMinutes === ''
        ? null
        : (Number.isFinite(Number(section.estimatedMinutes)) ? Number(section.estimatedMinutes) : null),
      title: '',
      widgets: body,
      check: null,
    }
    if (useSidebar) {
      page.check = { prompt: single.prompt, options: single.options }
    } else if (scored.length) {
      page.checks = scored.map((widget) => ({
        id: widget.id,
        prompt: widget.prompt,
        options: widget.options,
      }))
    }
    lesson.push(page)
  }
  if (!lesson.length) return null
  const sections = {}
  lesson.forEach((section, index) => {
    sections[String(index)] = section
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
    defaultLanguage: localized.defaultLanguage || 'en',
    sections,
    downloads,
    reflection,
    summaryMarkdown,
    related: [],
    tools: [],
  }
}
