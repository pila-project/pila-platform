import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  decodeCsvBytes,
  splitCsvLines,
  detectCsvDelimiter,
  parseCsvLine,
  isUnreadableName,
  isCsvHeaderRow,
} from './csv-import.js'

const THAI_LABELS = {
  nameLabels: ['name', 'ชื่อ', 'Name'],
  gradeLabels: ['grade', 'ระดับชั้น', 'Grade'],
}

const STUDENTS = [
  ['สมชาย ใจดี', 'ชาย', '4'],
  ['สมหญิง รักเรียน', 'หญิง', '4'],
  ['ธนากร มีสุข', 'กร', '5'],
]

function readFixture(name) {
  return readFileSync(new URL(`./fixtures/csv-import/${name}`, import.meta.url))
}

function parsedTable(bytes, decodeOptions) {
  const decoded = decodeCsvBytes(bytes, decodeOptions)
  assert.notEqual(decoded.text.charCodeAt(0), 0xfeff)
  const lines = splitCsvLines(decoded.text)
  const delimiter = detectCsvDelimiter(lines[0])
  const table = lines.map(line => parseCsvLine(line, delimiter))
  const header = isCsvHeaderRow(table[0], THAI_LABELS)
  return {
    ...decoded,
    delimiter,
    header,
    rows: header ? table.slice(1) : table,
  }
}

describe('decodeCsvBytes fixtures', () => {
  it('reads UTF-8 Thai names and grades', () => {
    const parsed = parsedTable(readFixture('utf8.csv'))
    assert.equal(parsed.encoding, 'utf-8')
    assert.equal(parsed.delimiter, ',')
    assert.equal(parsed.header, true)
    assert.deepEqual(parsed.rows, STUDENTS)
  })

  it('strips a UTF-8 BOM and still reads Thai names', () => {
    const parsed = parsedTable(readFixture('utf8-bom.csv'))
    assert.equal(parsed.encoding, 'utf-8')
    assert.equal(parsed.delimiter, ',')
    assert.equal(parsed.header, true)
    assert.deepEqual(parsed.rows, STUDENTS)
    assert.equal(parsed.text, decodeCsvBytes(readFixture('utf8.csv')).text)
  })

  it('reads UTF-16LE BOM comma-separated Thai', () => {
    const parsed = parsedTable(readFixture('utf16le-bom-comma.csv'))
    assert.equal(parsed.encoding, 'utf-16le')
    assert.equal(parsed.delimiter, ',')
    assert.equal(parsed.header, true)
    assert.deepEqual(parsed.rows, STUDENTS)
  })

  it('reads UTF-16LE BOM tab-separated Thai (Excel Unicode Text)', () => {
    const parsed = parsedTable(readFixture('utf16le-bom-tab.csv'))
    assert.equal(parsed.encoding, 'utf-16le')
    assert.equal(parsed.delimiter, '\t')
    assert.equal(parsed.header, true)
    assert.deepEqual(parsed.rows, STUDENTS)
  })

  it('falls back to windows-874 for Thai bytes that are not UTF-8', () => {
    const parsed = parsedTable(readFixture('windows-874.csv'), { fallbackEncoding: 'windows-874' })
    assert.equal(parsed.encoding, 'windows-874')
    assert.equal(parsed.delimiter, ',')
    assert.equal(parsed.header, true)
    assert.deepEqual(parsed.rows, STUDENTS)
  })

  it('decodes the windows-874 fixture as windows-1252 without an explicit fallback', () => {
    const parsed = parsedTable(readFixture('windows-874.csv'))
    assert.equal(parsed.encoding, 'windows-1252')
    assert.equal(/[\u0E00-\u0E7F]/.test(parsed.text), false)
  })

  it('detects an English header and still reads Thai names', () => {
    const parsed = parsedTable(readFixture('english-header-utf8.csv'))
    assert.equal(parsed.encoding, 'utf-8')
    assert.equal(parsed.delimiter, ',')
    assert.equal(parsed.header, true)
    assert.deepEqual(parsed.rows, STUDENTS)
  })

  it('treats every name in the cp1252 round-trip and the ticket file as unreadable', () => {
    for (const file of ['excel-cp1252-roundtrip.csv', 'ticket-uiux-300.csv']) {
      const parsed = parsedTable(readFixture(file))
      assert.equal(parsed.header, true, file)
      assert.ok(parsed.rows.length > 0, file)
      for (const row of parsed.rows) {
        assert.equal(isUnreadableName(row[0]), true, `${file}: ${row[0]}`)
      }
    }
    const ticket = parsedTable(readFixture('ticket-uiux-300.csv'))
    assert.equal(ticket.rows[0][0], '??????????1')
  })
})

describe('isCsvHeaderRow', () => {
  it('matches Thai or English name and grade cells exactly', () => {
    assert.equal(isCsvHeaderRow(['ชื่อ', 'ชื่อเล่น', 'ระดับชั้น'], THAI_LABELS), true)
    assert.equal(isCsvHeaderRow(['Name', 'Nickname', 'Grade'], THAI_LABELS), true)
    assert.equal(isCsvHeaderRow(['นักเรียน', 'ชื่อเล่น', 'Grade'], {
      nameLabels: ['name'],
      gradeLabels: ['grade'],
    }), true)
    assert.equal(isCsvHeaderRow(['\uFEFFname', 'nickname', 'grade'], {
      nameLabels: ['Name'],
      gradeLabels: ['Grade'],
    }), true)
  })

  it('does not treat ชื่อเล่น as the name column', () => {
    assert.equal(isCsvHeaderRow(['ชื่อเล่น', 'x', 'y'], {
      nameLabels: ['ชื่อ', 'name'],
      gradeLabels: ['ระดับชั้น', 'grade'],
    }), false)
  })
})

describe('isUnreadableName', () => {
  it('flags replacement and question-mark names only', () => {
    assert.equal(isUnreadableName('??????????1'), true)
    assert.equal(isUnreadableName('?????'), true)
    assert.equal(isUnreadableName('\uFFFD\uFFFD x'), true)
    assert.equal(isUnreadableName('Ann?'), false)
    assert.equal(isUnreadableName('สมชาย'), false)
    assert.equal(isUnreadableName('สมหญิง รักเรียน'), false)
    assert.equal(isUnreadableName('សុខា'), false)
    assert.equal(isUnreadableName(''), false)
    assert.equal(isUnreadableName('??ab'), true)
    assert.equal(isUnreadableName('?abc'), false)
  })
})

describe('parseCsvLine and detectCsvDelimiter', () => {
  it('keeps a comma inside quotes and unescapes doubled quotes', () => {
    assert.deepEqual(parseCsvLine('"Smith, John",JJ,4'), ['Smith, John', 'JJ', '4'])
    assert.deepEqual(parseCsvLine('"Ann ""A""",nick,4'), ['Ann "A"', 'nick', '4'])
  })

  it('uses semicolon only when the header has no comma or tab', () => {
    const lines = splitCsvLines('name;nickname;grade\r\nสมชาย ใจดี;ชาย;4\r\n')
    assert.equal(detectCsvDelimiter(lines[0]), ';')
    assert.deepEqual(parseCsvLine(lines[1], ';'), ['สมชาย ใจดี', 'ชาย', '4'])
    assert.equal(detectCsvDelimiter('"Smith, John";JJ;4'), ';')
    assert.equal(detectCsvDelimiter('name;nickname;grade'), ';')
  })

  it('keeps comma when the header is comma-separated even if a name contains semicolons', () => {
    const header = 'name,nickname,grade'
    assert.equal(detectCsvDelimiter(header), ',')
    assert.deepEqual(parseCsvLine('Ann;Bee,nick,4', detectCsvDelimiter(header)), ['Ann;Bee', 'nick', '4'])
  })

  it('prefers tab when a header has at least as many tabs as commas', () => {
    assert.equal(detectCsvDelimiter('name\tnickname\tgrade'), '\t')
    assert.equal(detectCsvDelimiter('a\tb,c'), '\t')
    assert.equal(detectCsvDelimiter('a,b,c\td'), ',')
  })
})

describe('UTF-16BE and invalid UTF-8', () => {
  it('decodes a constructed UTF-16BE BOM file', () => {
    const text = 'ชื่อ,ชื่อเล่น,ระดับชั้น\nสมชาย ใจดี,ชาย,4\nสมหญิง รักเรียน,หญิง,4\nธนากร มีสุข,กร,5\n'
    const le = Buffer.from(text, 'utf16le')
    le.swap16()
    const bytes = Buffer.concat([Buffer.from([0xfe, 0xff]), le])
    const parsed = parsedTable(bytes)
    assert.equal(parsed.encoding, 'utf-16be')
    assert.equal(parsed.delimiter, ',')
    assert.equal(parsed.header, true)
    assert.deepEqual(parsed.rows, STUDENTS)
  })

  it('falls back to windows-1252 for invalid UTF-8 that is not the Thai fixture', () => {
    const bytes = new Uint8Array([0x80, 0x41])
    const decoded = decodeCsvBytes(bytes)
    assert.equal(decoded.encoding, 'windows-1252')
    assert.equal(decoded.text.includes('สมชาย'), false)
    assert.notEqual(decoded.text, '')
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    assert.equal(decodeCsvBytes(arrayBuffer).encoding, 'windows-1252')
  })

  it('decodes Latin-1 names as windows-1252 by default', () => {
    // Müller,Mü,4\r\nJosé,Jo,5 — ü = 0xFC, é = 0xE9
    const bytes = new Uint8Array([
      0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72, 0x2c, 0x4d, 0xfc, 0x2c, 0x34, 0x0d, 0x0a,
      0x4a, 0x6f, 0x73, 0xe9, 0x2c, 0x4a, 0x6f, 0x2c, 0x35,
    ])
    const decoded = decodeCsvBytes(bytes)
    assert.equal(decoded.encoding, 'windows-1252')
    const lines = splitCsvLines(decoded.text)
    assert.deepEqual(parseCsvLine(lines[0]), ['Müller', 'Mü', '4'])
    assert.deepEqual(parseCsvLine(lines[1]), ['José', 'Jo', '5'])
    assert.equal(isUnreadableName('Müller'), false)
    assert.equal(isUnreadableName('José'), false)
    assert.equal(isUnreadableName(lines[0].split(',')[0]), false)
  })

  it('uses windows-1252 when the fallback label is unsupported', () => {
    const bytes = new Uint8Array([
      0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72, 0x2c, 0x4d, 0xfc, 0x2c, 0x34, 0x0d, 0x0a,
      0x4a, 0x6f, 0x73, 0xe9, 0x2c, 0x4a, 0x6f, 0x2c, 0x35,
    ])
    const decoded = decodeCsvBytes(bytes, { fallbackEncoding: 'not-a-real-encoding' })
    assert.equal(decoded.encoding, 'windows-1252')
    const lines = splitCsvLines(decoded.text)
    assert.deepEqual(parseCsvLine(lines[0]), ['Müller', 'Mü', '4'])
    assert.deepEqual(parseCsvLine(lines[1]), ['José', 'Jo', '5'])
  })
})
