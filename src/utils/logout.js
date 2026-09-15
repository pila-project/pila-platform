import { localCache } from './local-cache.js'
import { resetContentLibraryState } from './useContentLibrary.js'
import { clearPersistedUiLanguage } from '@/store/ui-language.js'

export async function logout(userId) {
  clearPersistedUiLanguage()
  resetContentLibraryState()
  if (userId) {
    await localCache.clearUser(userId)
    localStorage.removeItem(`zkek-${userId}`)
  }
  Agent.logout()
}
