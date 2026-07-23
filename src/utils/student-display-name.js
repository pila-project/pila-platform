/**
 * Teacher-facing preferred student label.
 * When a nickname is set: "Nickname (Full Name)".
 * Collapses to a single string when nickname equals name (case-insensitive).
 *
 * @param {{ name?: string, nickname?: string } | null | undefined} info
 * @returns {string}
 */
export function formatStudentPreferredName(info) {
  if (!info || typeof info !== 'object') return ''
  const name = String(info.name ?? '').trim()
  const nickname = String(info.nickname ?? '').trim()
  if (!nickname) return name
  if (!name) return nickname
  if (nickname.toLowerCase() === name.toLowerCase()) return name
  return `${nickname} (${name})`
}

/**
 * Lowercased haystack for student name search (preferred + legal + nickname).
 * @param {{ name?: string, nickname?: string } | null | undefined} info
 * @returns {string}
 */
export function studentNameSearchText(info) {
  if (!info || typeof info !== 'object') return ''
  const name = String(info.name ?? '').trim()
  const nickname = String(info.nickname ?? '').trim()
  const preferred = formatStudentPreferredName(info)
  return [preferred, name, nickname].filter(Boolean).join(' ').toLowerCase()
}
