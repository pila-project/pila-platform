import { localCache } from './local-cache.js'
import { resetContentLibraryState } from './useContentLibrary.js'

export async function logout(userId) {
  resetContentLibraryState()
  if (userId) {
    await localCache.clearUser(userId)
    localStorage.removeItem(`zkek-${userId}`)
  }
  Agent.logout()
}
