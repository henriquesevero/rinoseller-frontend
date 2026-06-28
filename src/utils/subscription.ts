import type { AuthUser } from '../contexts/AuthContext'

export function hasAccess(user: AuthUser | null): boolean {
  if (!user) return false
  if (user.subscription_active) return true
  if (user.plan === 'trial' && user.trial_ends_at) {
    return new Date(user.trial_ends_at).getTime() > Date.now()
  }
  return false
}

export function trialDaysLeft(user: AuthUser | null): number {
  if (!user?.trial_ends_at) return 0
  const ms = new Date(user.trial_ends_at).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}
