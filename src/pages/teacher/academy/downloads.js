export function describeDownload(file, text) {
  const url = file?.url || ''
  const declared = String(file?.type || '').toLowerCase()
  const lower = `${declared} ${url}`.toLowerCase()
  let kind = 'File'
  if (lower.includes('pdf')) kind = 'PDF'
  else if (lower.includes('video') || /\.(mp4|webm|mov|m4v)(\?|$)/.test(lower)) kind = 'Video'
  return {
    name: text(file?.name) || file?.id || url,
    url,
    id: file?.id || '',
    kind,
    size: file?.size || '',
  }
}

export function openDownloads(files) {
  for (const file of files || []) {
    if (file?.url) window.open(file.url, '_blank', 'noopener')
    else if (file?.id && typeof Agent !== 'undefined' && Agent.download) Agent.download(file.id).direct()
  }
}
