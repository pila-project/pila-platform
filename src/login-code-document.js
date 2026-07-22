import QRCode from 'qrcode'

const CODE_CHARACTER_SYMBOLS = {
  a: '0', b: '1', c: '2', d: '3', e: '4',
  f: '5', g: '6', h: '7', i: '8', j: '9',
  k: '★', l: '←', m: '↑', n: '↓', o: '→',
  p: '∞', q: '+', r: '−', s: '÷', t: '=',
  u: '♪', v: '▶', w: '■', x: '♥', y: '☺'
}

export async function loginCodeDocument({ name, loginCode }) {
  const qrCode = await QRCode.toString(loginCode, { type: 'svg', margin: 1 })
  const symbols = [...loginCode]
    .map(character => `<span>${escapeHtml(CODE_CHARACTER_SYMBOLS[character] || character)}</span>`)
    .join('')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Teacher login code - ${escapeHtml(name)}</title>
    <style>
      @page { margin: 0.5in; }
      body { margin: 0; font-family: Arial, sans-serif; color: #111; }
      main { box-sizing: border-box; max-width: 5in; margin: 0 auto; padding: 0.25in; text-align: center; }
      h1 { margin: 0 0 0.2in; font-size: 20pt; }
      svg { width: 2.5in; height: 2.5in; }
      .symbols { display: flex; justify-content: center; gap: 0.12in; margin-top: 0.2in; font-size: 24pt; }
      .symbols span { min-width: 0.22in; }
      .label { margin-top: 0.2in; color: #555; font-size: 10pt; }
      @media print { main { break-inside: avoid; } }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(name)}</h1>
      ${qrCode}
      <div class="symbols" aria-label="Login code">${symbols}</div>
      <div class="label">PILA teacher login code</div>
    </main>
  </body>
</html>`
}

export async function downloadLoginCode(credentials) {
  const html = await loginCodeDocument(credentials)
  const file = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeFilename(credentials.name)}-teacher-login-code.html`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function printLoginCode(credentials) {
  const html = await loginCodeDocument(credentials)
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.position = 'fixed'
  frame.style.left = '-10000px'
  frame.style.top = '0'
  frame.style.width = '1px'
  frame.style.height = '1px'
  frame.style.border = '0'

  const cleanup = () => frame.remove()
  frame.addEventListener('load', () => {
    const printWindow = frame.contentWindow
    printWindow.addEventListener('afterprint', cleanup, { once: true })
    printWindow.focus()
    printWindow.print()
    setTimeout(cleanup, 60_000)
  }, { once: true })

  frame.srcdoc = html
  document.body.appendChild(frame)
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function safeFilename(value) {
  return String(value)
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    || 'teacher'
}
