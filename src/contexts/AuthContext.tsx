import { createContext, useContext, useState, type ReactNode } from 'react'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'seller'
  active: boolean
}

interface AuthCtx {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  login(email: string, password: string): Promise<{ ok: boolean; error?: string; code?: string }>
  logout(): void
}

const Ctx = createContext<AuthCtx | null>(null)

const TOKEN_KEY = 'korav_token'
const USER_KEY  = 'korav_user'

function loadStored(): { user: AuthUser | null; token: string | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const raw   = localStorage.getItem(USER_KEY)
    if (token && raw) return { token, user: JSON.parse(raw) as AuthUser }
  } catch { /* ignore */ }
  return { user: null, token: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = loadStored()
  const [user,  setUser]  = useState<AuthUser | null>(stored.user)
  const [token, setToken] = useState<string | null>(stored.token)

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error ?? 'Erro ao autenticar', code: data.code }

      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      setToken(data.token)
      setUser(data.user as AuthUser)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Sem conexão com o servidor' }
    }
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <Ctx.Provider value={{ user, token, isAuthenticated: !!token, login, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth deve estar dentro de AuthProvider')
  return ctx
}
