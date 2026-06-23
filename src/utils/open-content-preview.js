import { getContentMetadata } from '@/utils/content-cache.js'

export const SEQUENCE_CONTENT_TYPE = 'application/json;type=sequence'

export function isSequenceContentMeta(meta) {
  return meta?.active_type === SEQUENCE_CONTENT_TYPE
}

export async function isSequenceContentId(id) {
  if (!id) return false
  try {
    const meta = await getContentMetadata(id)
    return isSequenceContentMeta(meta)
  } catch {
    return false
  }
}

/**
 * Route a content id to PreviewModal (items/assignments) or SequencePreviewModal (sequences).
 * Pass reactive refs; only the matching modal ref is set (the other is cleared).
 */
export async function openContentPreview(id, { previewing, sequenceToPreview } = {}) {
  if (!id) return

  let isSequence = false
  try {
    const meta = await getContentMetadata(id)
    isSequence = isSequenceContentMeta(meta)
  } catch (e) {
    console.warn('[openContentPreview] metadata failed', id, e)
  }

  if (isSequence && sequenceToPreview) {
    sequenceToPreview.value = id
    if (previewing) previewing.value = null
    return
  }

  if (previewing) {
    previewing.value = id
    if (sequenceToPreview) sequenceToPreview.value = null
    return
  }

  if (isSequence && sequenceToPreview) {
    sequenceToPreview.value = id
  }
}