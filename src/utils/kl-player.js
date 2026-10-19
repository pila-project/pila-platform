import { KL_SEQUENCE_PLAYER_HOST } from './sequence-items.js'

/** Know Learning loads a non-UUID iframe src as a URL and keeps our postMessage bridge. */
export function klPlayerUrl(id) {
  return `https://${KL_SEQUENCE_PLAYER_HOST}/${id}`
}
