import { validate as isUUID } from 'uuid'

const LAST_LOGIN_THROTTLE_MS = 60 * 60 * 1000

/**
 * Persist a student's last-login timestamp on the shared `users` agent state
 * so teachers can see it on Admin / Classes.
 */
export async function recordLastLogin(userId) {
  if (!userId) return
  try {
    const usersState = await Agent.state('users')
    if (!usersState[userId]) return
    const lastLogin = usersState[userId].lastLogin
    if (lastLogin && Date.now() - new Date(lastLogin).getTime() < LAST_LOGIN_THROTTLE_MS) {
      return
    }
    usersState[userId].lastLogin = new Date().toISOString()
    await Agent.synced()
  } catch (error) {
    console.warn('[recordLastLogin] failed', userId, error)
  }
}

/**
 * Record login for the authenticated user and, when applicable, a UUID provider
 * (teacher-created students signing in with a login code).
 */
export async function recordAuthLastLogin({ user, provider }) {
  if (!user || provider === 'anonymous') return
  await recordLastLogin(user)
  if (isUUID(provider) && provider !== user) {
    await recordLastLogin(provider)
  }
}