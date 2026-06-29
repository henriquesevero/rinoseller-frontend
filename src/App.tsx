import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LandingPage } from './pages/LandingPage'
import { CatalogPage } from './pages/CatalogPage'
import { AdminPage } from './pages/AdminPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { DashboardLayout } from './pages/DashboardLayout'
import { OverviewPage } from './pages/dashboard/OverviewPage'
import { ProdutosPage } from './pages/dashboard/ProdutosPage'
import { FinanceiroPage } from './pages/dashboard/FinanceiroPage'
import { CatalogosPage } from './pages/dashboard/CatalogosPage'
import { TabelasPage } from './pages/dashboard/TabelasPage'
import { ClientesPage } from './pages/dashboard/ClientesPage'
import { ClienteDetalhePage } from './pages/dashboard/ClienteDetalhePage'
import OrcamentosPage from './pages/dashboard/OrcamentosPage'
import PedidosVendaPage from './pages/dashboard/PedidosVendaPage'
import UsuariosPage from './pages/dashboard/UsuariosPage'
import PerfilPage from './pages/dashboard/PerfilPage'
import { CobrancaPage } from './pages/dashboard/CobrancaPage'

export default function App() {
  return (
    <SettingsProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing page */}
          <Route path="/" element={<LandingPage />} />

          {/* Catálogo público — acessado pelas cabeleireiras */}
          <Route path="/catalogo" element={<CatalogPage />} />

          {/* Admin legado — mantido para compatibilidade */}
          <Route path="/admin" element={<AdminPage />} />

          {/* Portal do vendedor */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
          <Route path="/verificar-email" element={<VerifyEmailPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route path="produtos" element={<ProdutosPage />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="clientes/:id" element={<ClienteDetalhePage />} />
            <Route path="orcamentos" element={<OrcamentosPage />} />
            <Route path="pedidos-venda" element={<PedidosVendaPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="financeiro" element={<FinanceiroPage />} />
            <Route path="catalogos" element={<CatalogosPage />} />
            <Route path="tabelas" element={<TabelasPage />} />
            <Route path="perfil" element={<PerfilPage />} />
            <Route path="cobranca" element={<CobrancaPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </SettingsProvider>
  )
}
