import { localCache } from './local-cache.js'
import { resetContentLibraryState } from './useContentLibrary.js'
import { clearPersistedUiLanguage } from '@/store/ui-language.js'
import {
  clearDecryptUserInfoCache,
  setSkipExpensiveDecrypt,
} from './decrypt-user-info-cache.js'

export async function logout(userId) {
  clearDecryptUserInfoCache()
  setSkipExpensiveDecrypt(false)
  clearPersistedUiLanguage()
  resetContentLibraryState()
  if (userId) {
    await localCache.clearUser(userId)
    localStorage.removeItem(`zkek-${userId}`)
  }
  Agent.logout()
}
