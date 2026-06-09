import { createContext, useContext, useState, useEffect } from 'react'

interface SettingsCtx {
  hideValues: boolean
  toggleHideValues: () => void
  theme: 'dark' | 'light'
  toggleTheme: () => void
}

const Ctx = createContext<SettingsCtx>({} as SettingsCtx)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [hideValues, setHideValues] = useState(() =>
    localStorage.getItem('korav_hide') === 'true'
  )
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('korav_theme')
    return saved === 'dark' || saved === 'light' ? saved : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light') {
      root.classList.add('light')
      root.classList.remove('dark')
    } else {
      root.classList.remove('light')
      root.classList.add('dark')
    }
  }, [theme])

  const toggleHideValues = () =>
    setHideValues(v => { localStorage.setItem('korav_hide', String(!v)); return !v })

  const toggleTheme = () =>
    setTheme(t => { const n = t === 'dark' ? 'light' : 'dark'; localStorage.setItem('korav_theme', n); return n })

  return (
    <Ctx.Provider value={{ hideValues, toggleHideValues, theme, toggleTheme }}>
      {children}
    </Ctx.Provider>
  )
}

export const useSettings = () => useContext(Ctx)
