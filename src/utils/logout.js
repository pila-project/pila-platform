import { localCache } from './local-cache.js'

export async function logout(userId) {
  if (userId) {
    await localCache.clearUser(userId)
    localStorage.removeItem(`zkek-${userId}`)
  }
  Agent.logout()
}
