/**
 * Explore taxonomy vs catalogue (UIUX-143 / 144).
 *
 * Catalogue (host tagPartition + PILA_TAG) answers “is this PILA content here?”
 * Taxonomy answers “what is this item about?” and must match the tagging modal.
 *
 * Matches trunk: simplified/RCT uses the host partition + simplified root;
 * app/Thai uses 'PILA Tag Hierarchy' + competencies + other-tags.
 */
import {
  SIMPLIFIED_STUDY_DOMAINS,
  COMPETENCY_HIERARCHY_ROOT,
} from './constants.js'

export const TAG_HIERARCHY_PARTITION = 'PILA Tag Hierarchy'
export const SIMPLIFIED_TAG_ROOT = 'f760dad0-f133-11ee-804e-27f76a81958c'
export const OTHER_TAGS_HIERARCHY_ROOT = '3241cb20-94ff-11f1-836c-fb0d26641e20'

export function isSimplifiedExploreHost(host = typeof window !== 'undefined' ? window.location.host : '') {
  return SIMPLIFIED_STUDY_DOMAINS.includes(host)
}

export function exploreTaxonomy(hostTagPartition, host = typeof window !== 'undefined' ? window.location.host : '') {
  if (isSimplifiedExploreHost(host)) {
    return {
      partition: hostTagPartition,
      roots: [SIMPLIFIED_TAG_ROOT],
      allowTagging: false,
    }
  }
  return {
    partition: TAG_HIERARCHY_PARTITION,
    roots: [COMPETENCY_HIERARCHY_ROOT, OTHER_TAGS_HIERARCHY_ROOT],
    allowTagging: true,
  }
}
