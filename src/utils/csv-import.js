/** Pure CSV decode/parse helpers for teacher student import. No Vue. */

function asBytes(input) {
  if (input instanceof Uint8Array) return input
  return new Uint8Array(input)
}

function withoutLeadingBom(text) {
  if (text.charCodeAt(0) === 0xfeff) return text.slice(1)
  return text
}

/**
 * Sniff a BOM, otherwise strict UTF-8, otherwise `fallbackEncoding`.
 * An unsupported fallback label decodes as windows-1252.
 * @param {ArrayBuffer | Uint8Array} input
 * @param {{ fallbackEncoding?: string }} [options]
 * @returns {{ text: string, encoding: 'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1252' | 'windows-874' | string }}
 */
export function decodeCsvBytes(input, { fallbackEncoding = 'windows-1252' } = {}) {
  const bytes = asBytes(input)
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return {
      text: withoutLeadingBom(new TextDecoder('utf-8').decode(bytes.subarray(3))),
      encoding: 'utf-8',
    }
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return {
      text: withoutLeadingBom(new TextDecoder('utf-16le').decode(bytes.subarray(2))),
      encoding: 'utf-16le',
    }
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return {
      text: withoutLeadingBom(new TextDecoder('utf-16be').decode(bytes.subarray(2))),
      encoding: 'utf-16be',
    }
  }
  try {
    return {
      text: withoutLeadingBom(new TextDecoder('utf-8', { fatal: true }).decode(bytes)),
      encoding: 'utf-8',
    }
  } catch {
    let encoding = fallbackEncoding
    let decoder
    try {
      decoder = new TextDecoder(encoding)
    } catch {
      encoding = 'windows-1252'
      decoder = new TextDecoder(encoding)
    }
    return {
      text: withoutLeadingBom(decoder.decode(bytes)),
      encoding,
    }
  }
}

/** Non-blank lines. Blank means empty after trim. */
export function splitCsvLines(text) {
  return String(text ?? '').split(/\r\n|\r|\n/).filter(line => line.trim())
}

function delimiterCounts(line) {
  let tabs = 0
  let commas = 0
  let semis = 0
  let inQuotes = false
  const source = String(line ?? '')
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (inQuotes) {
      if (ch === '"' && source[i + 1] === '"') i++
      else if (ch === '"') inQuotes = false
      continue
    }
    if (ch === '"') inQuotes = true
    else if (ch === '\t') tabs++
    else if (ch === ',') commas++
    else if (ch === ';') semis++
  }
  return { tabs, commas, semis }
}

/** Tab wins ties with comma. Semicolon only when the line has neither. */
export function detectCsvDelimiter(firstLine) {
  const { tabs, commas, semis } = delimiterCounts(firstLine)
  if (tabs > 0 && tabs >= commas) return '\t'
  if (commas === 0 && tabs === 0 && semis > 0) return ';'
  return ','
}

/** Quote rules match the previous manage-classes parser, including trim. */
export function parseCsvLine(line, delimiter = ',') {
  const cols = []
  let current = ''
  let inQuotes = false
  const source = String(line ?? '')
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (inQuotes) {
      if (ch === '"' && source[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      cols.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cols.push(current.trim())
  return cols
}

/**
 * Mojibake / replacement names from the wrong Excel encoding.
 * True when '?' or U+FFFD appears and there is no letter, or those marks
 * are at least half of the non-whitespace characters.
 */
export function isUnreadableName(name) {
  const trimmed = String(name ?? '').trim()
  if (!/[?\uFFFD]/.test(trimmed)) return false
  if (!/\p{L}/u.test(trimmed)) return true
  const compact = trimmed.replace(/\s+/g, '')
  const badCount = compact.match(/[?\uFFFD]/gu)?.length ?? 0
  return badCount * 2 >= compact.length
}

function headerCell(value, stripBom) {
  let text = String(value ?? '')
  if (stripBom && text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  return text.trim().toLowerCase()
}

function headerLabels(labels) {
  return (labels || [])
    .map(label => String(label ?? '').trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Exact cell match. First cell against name labels, or third cell against
 * grade labels. Substring match would treat ชื่อเล่น as ชื่อ.
 */
export function isCsvHeaderRow(cols, { nameLabels, gradeLabels } = {}) {
  const cells = cols || []
  const first = headerCell(cells[0], true)
  const third = headerCell(cells[2], false)
  const names = headerLabels(nameLabels)
  const grades = headerLabels(gradeLabels)
  return (first !== '' && names.includes(first)) || (third !== '' && grades.includes(third))
}
