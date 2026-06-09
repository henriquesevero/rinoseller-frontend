import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'

/* ── Icons ──────────────────────────────────────────────────────────── */
const IconGrid = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
  </svg>
)
const IconBox = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)
const IconDollar = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)
const IconBook = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
)
const IconUsers = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconShoppingBag = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
)
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)
const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
)
const IconFileText = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)
const IconClipboard = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>
)
const IconUserCog = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <circle cx="19" cy="8" r="2"/>
    <path d="M17.5 7.5l-1 1M20.5 7.5l1 1M17.5 8.5l-1-1M20.5 8.5l1-1"/>
  </svg>
)
const IconEye = ({ open }: { open: boolean }) => open ? (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)
const IconSun = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)
const IconMoon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

/* ── Types ─────────────────────────────────────────────────────────── */
type NavItem    = { to: string; label: string; icon: React.ReactNode; end?: boolean }
type NavSection = { label: string; items: NavItem[] }

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Geral',
    items: [{ to: '/dashboard', label: 'Visão Geral', icon: <IconGrid />, end: true }],
  },
  {
    label: 'Vendas',
    items: [
      { to: '/dashboard/orcamentos',    label: 'Orçamentos',       icon: <IconFileText />  },
      { to: '/dashboard/pedidos-venda', label: 'Pedidos de Venda',  icon: <IconClipboard /> },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { to: '/dashboard/produtos',   label: 'Produtos',   icon: <IconBox />    },
      { to: '/dashboard/clientes',   label: 'Clientes',   icon: <IconUsers />  },
      { to: '/dashboard/financeiro', label: 'Financeiro', icon: <IconDollar /> },
    ],
  },
  {
    label: 'Canal Digital',
    items: [
      { to: '/dashboard/catalogos', label: 'Catálogos', icon: <IconBook />        },
      { to: '/dashboard/loja',      label: 'Loja',      icon: <IconShoppingBag /> },
    ],
  },
]

/* ── Nav link ──────────────────────────────────────────────────────── */
function NavItemLink({ item, onClose }: { item: NavItem; onClose: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
          isActive
            ? 'bg-[#28AEA4]/10 text-[#1d9992] dark:bg-[#28AEA4]/10 dark:text-[#28AEA4]'
            : 'text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/[0.05] dark:text-gray-500 dark:hover:text-gray-200 dark:hover:bg-white/[0.05]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={isActive ? 'text-[#28AEA4]' : ''}>
            {item.icon}
          </span>
          {item.label}
        </>
      )}
    </NavLink>
  )
}

/* ── Layout ────────────────────────────────────────────────────────── */
export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { logout, user } = useAuth()
  const { hideValues, toggleHideValues, theme, toggleTheme } = useSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const isOverview = location.pathname === '/dashboard'

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }
  const closeSidebar = () => setSidebarOpen(false)

  const initial = (user?.name ?? 'V').charAt(0).toUpperCase()

  return (
    <div className="flex h-screen bg-[#f5f5f7] dark:bg-[#080808] overflow-hidden text-[#1d1d1f] dark:text-white">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/75 z-20 lg:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-[220px] flex flex-col
          bg-white dark:bg-[#0c0c0c]
          border-r border-black/[0.07] dark:border-[#1c1c1c]
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-5 border-b border-black/[0.07] dark:border-[#1c1c1c]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#28AEA4] flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <p className="text-[#1d1d1f] dark:text-white font-semibold text-[13px] leading-tight">RinoSeller</p>
              <p className="text-[#8e8e93] dark:text-[#28AEA4]/60 text-[10px] tracking-widest uppercase mt-0.5">Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto scrollbar-hide">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <p className="text-[10px] text-[#aeaeb2] dark:text-gray-600 uppercase tracking-[0.18em] px-3 mb-1 font-semibold">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <NavItemLink key={item.to} item={item} onClose={closeSidebar} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 pt-3 border-t border-black/[0.07] dark:border-[#1c1c1c] space-y-1">

          {user?.role === 'admin' && (
            <NavItemLink
              item={{ to: '/dashboard/usuarios', label: 'Usuários', icon: <IconUserCog /> }}
              onClose={closeSidebar}
            />
          )}

          {/* User badge */}
          <div className="mx-1 my-2 px-3 py-2.5 rounded-xl bg-[#f5f5f7] dark:bg-[#141414]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#28AEA4]/15 border border-[#28AEA4]/30 flex items-center justify-center flex-shrink-0">
                <span className="text-[#28AEA4] font-bold text-xs">{initial}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[#1d1d1f] dark:text-white text-[12px] font-semibold truncate leading-tight">
                  {user?.name ?? 'Vendedor'}
                </p>
                <p className="text-[#8e8e93] dark:text-gray-600 text-[10px] capitalize">
                  {user?.role === 'admin' ? 'Admin' : 'Vendedor'}
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          {!isOverview && (
            <div className="flex items-center gap-1.5 px-1 pb-1">
              <button
                onClick={toggleHideValues}
                title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium
                           text-[#6e6e73] dark:text-gray-500
                           hover:bg-black/[0.05] dark:hover:bg-white/[0.05]
                           hover:text-[#1d1d1f] dark:hover:text-gray-200
                           transition-all"
              >
                <IconEye open={!hideValues} />
                {hideValues ? 'Mostrar' : 'Ocultar'}
              </button>
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium
                           text-[#6e6e73] dark:text-gray-500
                           hover:bg-black/[0.05] dark:hover:bg-white/[0.05]
                           hover:text-[#1d1d1f] dark:hover:text-gray-200
                           transition-all"
              >
                {theme === 'dark' ? <IconSun /> : <IconMoon />}
                {theme === 'dark' ? 'Claro' : 'Escuro'}
              </button>
            </div>
          )}

          <NavItemLink
            item={{ to: '/dashboard/perfil', label: 'Minha conta', icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            )}}
            onClose={closeSidebar}
          />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium
                       text-[#8e8e93] dark:text-gray-600
                       hover:text-red-500 dark:hover:text-red-400
                       hover:bg-red-50 dark:hover:bg-red-950/20
                       transition-all"
          >
            <IconLogout />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-[220px] flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-4 px-4 py-3.5
                        bg-white dark:bg-[#0c0c0c]
                        border-b border-black/[0.07] dark:border-[#1c1c1c]
                        flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-[#6e6e73] dark:text-gray-500 hover:text-[#1d1d1f] dark:hover:text-white transition-colors p-0.5 -ml-0.5"
          >
            <IconMenu />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#28AEA4] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-[#1d1d1f] dark:text-white font-semibold text-sm tracking-tight">RinoSeller</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto bg-[#f5f5f7] dark:bg-[#1a1a1c]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
