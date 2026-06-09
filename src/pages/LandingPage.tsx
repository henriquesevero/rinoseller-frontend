import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function IconChart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}
function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
function IconBox() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  )
}
function IconReceipt() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}
function IconWhatsApp() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.526 5.845L.057 23.492a.5.5 0 0 0 .606.625l5.796-1.517A11.954 11.954 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.028-1.384l-.36-.214-3.732.978.995-3.63-.235-.374A9.818 9.818 0 1 1 12 21.818z"/>
    </svg>
  )
}
function IconMoney() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  )
}
function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}
function IconCheck() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

const FEATURES = [
  {
    icon: <IconUsers />,
    title: 'Gestão de Clientes',
    desc: 'Cadastro completo com histórico de compras, dívidas em aberto, limite de crédito e recebimentos registrados.',
  },
  {
    icon: <IconReceipt />,
    title: 'Pedidos & Orçamentos',
    desc: 'Crie orçamentos, converta em pedidos, acompanhe status e compartilhe PDFs direto pelo WhatsApp.',
  },
  {
    icon: <IconBox />,
    title: 'Controle de Estoque',
    desc: 'Monitore produtos, categorias e kits. Alertas automáticos para itens com estoque baixo ou zerado.',
  },
  {
    icon: <IconMoney />,
    title: 'Financeiro Completo',
    desc: 'Faturamento, despesas, aportes, retiradas e capital disponível. Relatórios por período exportáveis em PDF.',
  },
  {
    icon: <IconChart />,
    title: 'Visão Geral',
    desc: 'Dashboard com ranking de clientes, gráfico de faturamento e alertas — tudo em uma tela, acessível do celular.',
  },
  {
    icon: <IconWhatsApp />,
    title: 'Integração WhatsApp',
    desc: 'Envie PDFs de pedidos e orçamentos diretamente pelo WhatsApp com uma mensagem personalizada.',
  },
]

const STEPS = [
  { n: '01', title: 'Crie sua conta', desc: 'Cadastro em menos de 2 minutos. Sem cartão de crédito.' },
  { n: '02', title: 'Configure seus produtos', desc: 'Importe ou cadastre seu catálogo com preços e estoque.' },
  { n: '03', title: 'Comece a vender', desc: 'Emita pedidos, controle dívidas e gere relatórios profissionais.' },
]

const PLANS = [
  {
    name: 'Base',
    price: 'R$ 29',
    period: 'por mês',
    desc: 'Para quem está começando.',
    highlight: false,
    items: [
      { label: 'Até 50 clientes',        enabled: true  },
      { label: 'Até 100 pedidos/mês',    enabled: true  },
      { label: 'Controle de estoque',    enabled: true  },
      { label: 'Relatórios em PDF',      enabled: false },
      { label: 'Integração WhatsApp',    enabled: false },
      { label: 'Suporte',    enabled: false },
    ],
    cta: 'Assinar Base',
    to: '/register',
  },
  {
    name: 'Profissional',
    price: 'R$ 99',
    period: 'por mês',
    desc: 'Para vendedores em crescimento.',
    highlight: true,
    items: [
      { label: 'Clientes ilimitados',      enabled: true },
      { label: 'Pedidos ilimitados',       enabled: true },
      { label: 'Todas as funcionalidades', enabled: true },
      { label: 'Relatórios em PDF',        enabled: true },
      { label: 'Integração WhatsApp',      enabled: true },
      { label: 'Suporte',      enabled: true },
    ],
    cta: 'Assinar agora',
    to: '/register',
  },
  {
    name: 'IA',
    price: 'R$ 149',
    period: 'por mês',
    desc: 'Automatize suas vendas com inteligência artificial.',
    highlight: false,
    soon: true,
    items: [
      { label: 'Tudo do Profissional',          enabled: true },
      { label: 'Chatbot para WhatsApp',         enabled: true },
      { label: 'Integração com Instagram',      enabled: true },
      { label: 'Catálogo automático via chat',  enabled: true },
      { label: 'Respostas com IA',              enabled: true },
      { label: 'Relatórios com insights de IA', enabled: true },
    ],
    cta: 'Em breve',
    to: '#',
  },
]

const FAQS = [
  {
    q: 'Preciso de cartão de crédito para começar?',
    a: 'Não. O plano Básico é gratuito para sempre, sem necessidade de cartão. Você só informa dados de pagamento ao assinar um plano pago.',
  },
  {
    q: 'Posso mudar de plano depois?',
    a: 'Sim, a qualquer momento. Se fizer upgrade, a diferença é cobrada proporcionalmente. Se fizer downgrade, o novo valor passa a valer no próximo ciclo.',
  },
  {
    q: 'Meus dados ficam seguros?',
    a: 'Todos os dados são armazenados com criptografia e backups automáticos. Você tem controle total e pode exportar ou excluir suas informações quando quiser.',
  },
  {
    q: 'O sistema funciona no celular?',
    a: 'Sim. O RinoSeller é totalmente responsivo e funciona bem em qualquer dispositivo — celular, tablet ou computador, direto pelo navegador.',
  },
  {
    q: 'Como funciona o envio de PDFs pelo WhatsApp?',
    a: 'Ao finalizar um pedido ou orçamento, você clica em "Enviar pelo WhatsApp". O sistema gera o PDF automaticamente e abre o WhatsApp com a mensagem e o arquivo prontos para enviar.',
  },
  {
    q: 'Tenho suporte se tiver dúvidas?',
    a: 'Sim. No plano Básico o suporte é por e-mail. No Profissional o atendimento é prioritário, com resposta mais rápida.',
  },
]

const HERO_LINES = ['Venda mais.', 'Controle tudo.']
const HERO_FULL  = HERO_LINES.join('\n')

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [typed,   setTyped]   = useState('')
  const [cursorOn, setCursorOn] = useState(true)

  useEffect(() => {
    if (typed.length >= HERO_FULL.length) return
    const t = setTimeout(() => setTyped(HERO_FULL.slice(0, typed.length + 1)), 65)
    return () => clearTimeout(t)
  }, [typed])

  useEffect(() => {
    const t = setInterval(() => setCursorOn(v => !v), 530)
    return () => clearInterval(t)
  }, [])

  const line1 = typed.split('\n')[0] ?? ''
  const line2 = typed.split('\n')[1] ?? ''
  const showCursorOnLine2 = typed.includes('\n')

  return (
    <div className="min-h-screen bg-[#080808] text-white antialiased">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.22; }
        }
        .preview-float { animation: float 6s ease-in-out infinite; }
        .fade-up { animation: fadeUp 0.7s ease forwards; }
        .glow-animate { animation: glow-pulse 4s ease-in-out infinite; }
      `}</style>

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#28AEA4] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="font-bold text-[15px] tracking-tight text-gray-900">RinoSeller</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/login"    className="text-sm text-gray-500 hover:text-gray-900 px-4 py-2 rounded-lg transition-colors">Entrar</Link>
            <Link to="/register" className="text-sm font-semibold bg-[#28AEA4] hover:bg-[#3cbdb6] text-white px-4 py-2 rounded-lg transition-colors">Criar conta</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 flex flex-col lg:flex-row items-center gap-12">

          {/* Left — text */}
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 bg-[#28AEA4]/10 border border-[#28AEA4]/25 rounded-full px-4 py-1.5 text-xs font-semibold text-[#28AEA4] mb-8 tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#28AEA4] animate-pulse" />
              Seu Portal de gestão de vendas
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-[68px] font-extrabold leading-[1.05] tracking-tight mb-6 min-h-[2.2em]">
              <span>
                {line1}
                {!showCursorOnLine2 && (
                  <span className={`inline-block w-[3px] h-[0.85em] bg-white ml-1 align-middle rounded-sm transition-opacity ${cursorOn ? 'opacity-100' : 'opacity-0'}`} />
                )}
              </span>
              {typed.includes('\n') && (
                <>
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#28AEA4] via-[#4ecdc4] to-[#6edbd5]">
                    {line2}
                    <span className={`inline-block w-[3px] h-[0.75em] bg-[#28AEA4] ml-1 align-middle rounded-sm transition-opacity ${cursorOn ? 'opacity-100' : 'opacity-0'}`} />
                  </span>
                </>
              )}
            </h1>

            <p className="text-lg text-gray-400 max-w-md mb-10 leading-relaxed">
              Pedidos, clientes, estoque e finanças em um único lugar.
              Rápido, simples e feito para vendedores de verdade.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 bg-[#28AEA4] hover:bg-[#3cbdb6] text-white font-bold px-7 py-3.5 rounded-xl text-sm transition-all hover:shadow-[0_0_32px_rgba(40,174,164,0.4)]"
              >
                Começar agora <IconArrow />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white font-semibold px-7 py-3.5 rounded-xl text-sm transition-all"
              >
                Já tenho conta
              </Link>
            </div>
          </div>

          {/* Right — Dashboard preview */}
          <div className="flex-1 min-w-0 w-full preview-float relative">
            {/* Glow backdrop */}
            <div className="absolute inset-0 rounded-2xl bg-[#28AEA4]/10 blur-2xl scale-95 translate-y-4 pointer-events-none" />

            <div className="relative bg-[#0d0d0d] border border-white/[0.1] rounded-2xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(40,174,164,0.12)]">
              {/* Browser bar */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.07] bg-[#080808]">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                <div className="flex-1 mx-4 bg-white/[0.04] border border-white/[0.06] rounded-md h-5 flex items-center px-3 gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#28AEA4]/60" />
                  <span className="text-[10px] text-gray-600">rinoseller.app/dashboard</span>
                </div>
              </div>

              {/* Dashboard layout with sidebar */}
              <div className="flex">
                {/* Mini sidebar */}
                <div className="hidden sm:flex w-14 bg-[#080808] border-r border-white/[0.05] flex-col items-center py-4 gap-4">
                  <div className="w-7 h-7 rounded-lg bg-[#28AEA4] flex items-center justify-center mb-2">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  </div>
                  {[
                    <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
                    <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></>,
                    <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></>,
                    <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
                  ].map((paths, i) => (
                    <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${i === 0 ? 'bg-[#28AEA4]/15 text-[#28AEA4]' : 'text-gray-700'}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{paths}</svg>
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="flex-1 p-4 space-y-3 bg-[#0a0a0a]">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-2 w-16 bg-white/[0.07] rounded mb-1.5" />
                      <div className="h-3.5 w-24 bg-white/[0.12] rounded" />
                    </div>
                    <div className="flex gap-1.5">
                      {['7d','30d','3m'].map((l, i) => (
                        <div key={l} className={`h-6 px-2.5 rounded-lg text-[9px] flex items-center font-semibold ${i === 0 ? 'bg-[#28AEA4] text-white' : 'bg-white/[0.05] text-gray-600'}`}>{l}</div>
                      ))}
                    </div>
                  </div>

                  {/* Metric cards */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Faturamento', val: 'R$ 18.420', color: 'text-[#28AEA4]', trend: '+12%' },
                      { label: 'Em Aberto',   val: 'R$ 3.200',  color: 'text-blue-400',   trend: '4 pedidos' },
                      { label: 'Clientes',    val: '47',         color: 'text-white',       trend: '+3 novos' },
                      { label: 'Aguardando',  val: '5',          color: 'text-yellow-400',  trend: 'orçamentos' },
                    ].map(c => (
                      <div key={c.label} className="bg-[#111111] border border-white/[0.06] rounded-xl p-3">
                        <p className="text-[8px] font-semibold text-gray-600 uppercase tracking-wider mb-1">{c.label}</p>
                        <p className={`text-sm font-bold tabular-nums leading-none whitespace-nowrap ${c.color}`}>{c.val}</p>
                        <p className="text-[8px] text-gray-600 mt-1">{c.trend}</p>
                      </div>
                    ))}
                  </div>

                  {/* Chart + ranking */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 bg-[#111111] border border-white/[0.06] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[8px] font-semibold text-gray-600 uppercase tracking-wider">Evolução</p>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#28AEA4]" />
                          <span className="text-[8px] text-gray-600">Faturamento</span>
                        </div>
                      </div>
                      <svg viewBox="0 0 220 52" className="w-full" style={{ height: 52 }}>
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#28AEA4" stopOpacity="0.2"/>
                            <stop offset="100%" stopColor="#28AEA4" stopOpacity="0"/>
                          </linearGradient>
                          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#28AEA4" stopOpacity="0.4"/>
                            <stop offset="60%" stopColor="#28AEA4"/>
                            <stop offset="100%" stopColor="#6edbd5"/>
                          </linearGradient>
                        </defs>
                        <polygon points="0,44 28,38 55,40 82,26 110,30 138,16 165,20 192,8 220,10 220,52 0,52" fill="url(#chartGrad)"/>
                        <polyline points="0,44 28,38 55,40 82,26 110,30 138,16 165,20 192,8 220,10" fill="none" stroke="url(#lineGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="220" cy="10" r="3" fill="#6edbd5"/>
                        <circle cx="220" cy="10" r="5" fill="#6edbd5" opacity="0.25"/>
                      </svg>
                    </div>
                    <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-3">
                      <p className="text-[8px] font-semibold text-gray-600 uppercase tracking-wider mb-2">Top Clientes</p>
                      <div className="space-y-2">
                        {[
                          { name: 'Ana Souza',  val: 'R$ 4.200' },
                          { name: 'Claudia M.', val: 'R$ 3.100' },
                          { name: 'Renata F.',  val: 'R$ 2.800' },
                        ].map((r, i) => (
                          <div key={r.name} className="flex items-center gap-1.5">
                            <span className="text-[8px] text-[#28AEA4]/50 w-3 font-bold">{i+1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] text-gray-300 truncate">{r.name}</p>
                              <p className="text-[8px] text-[#28AEA4] font-semibold tabular-nums">{r.val}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Funcionalidades ── */}
      <section id="funcionalidades" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Tudo que você precisa,<br />em um só lugar.</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="group bg-[#0f0f0f] hover:bg-[#131313] border border-white/[0.07] hover:border-[#28AEA4]/30 rounded-2xl p-6 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-[#28AEA4]/10 text-[#28AEA4] flex items-center justify-center mb-4 group-hover:bg-[#28AEA4]/15 transition-colors">
                {f.icon}
              </div>
              <h3 className="font-bold text-white text-[15px] mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section id="como-funciona" className="border-t border-white/[0.06] py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-[38px] md:text-[44px] font-semibold text-gray-200 leading-snug max-w-3xl mx-auto">
              Um fluxo simples, do início ao fim — <span className="text-[#28AEA4]">sem complicações, sem planilhas,</span> com <span className="text-[#28AEA4]">automação inteligente.</span>
            </h2>
          </div>
          <div className="flex flex-col max-w-lg mx-auto">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex gap-6">
                {/* Indicador + linha */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="relative w-12 h-12 rounded-full bg-[#28AEA4] flex items-center justify-center shadow-[0_0_20px_rgba(40,174,164,0.3)] hover:shadow-[0_0_40px_rgba(40,174,164,0.7)] transition-all duration-300 cursor-default">
                    <span className="text-sm font-extrabold text-white">{s.n}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-px flex-1 my-3 bg-gradient-to-b from-[#28AEA4]/50 to-[#28AEA4]/05 min-h-[40px]" />
                  )}
                </div>
                {/* Texto */}
                <div className={`flex-1 pt-2.5 ${i < STEPS.length - 1 ? 'mb-3' : ''}`}>
                  <h3 className="font-bold text-white text-base mb-1.5">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planos ── */}
      <section id="planos" className="border-t border-white/[0.06] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Simples e transparente.</h2>
            <p className="text-gray-500 mt-3 text-sm">Sem surpresas. Cancele quando quiser.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {PLANS.map(p => (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-2xl p-7 transition-all ${
                  p.highlight
                    ? 'bg-white border-2 border-[#28AEA4] shadow-[0_24px_64px_rgba(40,174,164,0.2)]'
                    : p.soon
                    ? 'bg-[#0f0f0f] border border-white/[0.07] opacity-70'
                    : 'bg-[#0f0f0f] border border-white/[0.07]'
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#28AEA4] text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full">
                    Mais popular
                  </div>
                )}
                {p.soon && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-white/10 border border-white/20 text-gray-300 text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full backdrop-blur-sm">
                    Em breve
                  </div>
                )}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <p className={`text-xs font-bold uppercase tracking-widest ${p.highlight ? 'text-[#28AEA4]' : 'text-gray-500'}`}>{p.name}</p>
                    {p.soon && (
                      <span className="text-[9px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/20 rounded px-1.5 py-0.5 uppercase tracking-wide">IA</span>
                    )}
                  </div>
                  <div className="flex items-end gap-1.5 mb-1">
                    <span className={`text-4xl font-extrabold tracking-tight ${p.highlight ? 'text-gray-900' : ''}`}>{p.price}</span>
                    {p.period !== 'para sempre' && <span className={`text-sm mb-1.5 ${p.highlight ? 'text-gray-400' : 'text-gray-500'}`}>{p.period}</span>}
                  </div>
                  {p.period === 'para sempre' && <span className={`text-xs ${p.highlight ? 'text-gray-400' : 'text-gray-500'}`}>{p.period}</span>}
                  <p className="text-sm mt-2 text-gray-500">{p.desc}</p>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {p.items.map(item => {
                    const enabled = typeof item === 'string' ? true : item.enabled
                    const label   = typeof item === 'string' ? item : item.label
                    return (
                      <li key={label} className={`flex items-center gap-2.5 text-sm ${!enabled ? 'opacity-40' : p.highlight ? 'text-gray-700' : 'text-gray-300'}`}>
                        {enabled ? (
                          <span className={`flex-shrink-0 ${p.highlight ? 'text-[#28AEA4]' : p.soon ? 'text-purple-400' : 'text-gray-600'}`}><IconCheck /></span>
                        ) : (
                          <span className="flex-shrink-0 text-gray-600">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </span>
                        )}
                        <span>{label}</span>
                      </li>
                    )
                  })}
                </ul>

                {p.soon ? (
                  <div className="w-full text-center py-3 rounded-xl text-sm font-bold bg-white/[0.04] border border-white/[0.07] text-gray-600 cursor-not-allowed select-none">
                    Em breve
                  </div>
                ) : (
                  <Link
                    to={p.to}
                    className={`w-full text-center py-3 rounded-xl text-sm font-bold transition-all ${
                      p.highlight
                        ? 'bg-[#28AEA4] hover:bg-[#3cbdb6] text-white hover:shadow-[0_0_24px_rgba(40,174,164,0.4)]'
                        : 'bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white'
                    }`}
                  >
                    {p.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t border-white/[0.06] py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-bold text-[#28AEA4] uppercase tracking-[0.2em] mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Dúvidas? A gente responde.</h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((item, i) => (
              <div
                key={i}
                className="bg-[#0f0f0f] border border-white/[0.07] rounded-2xl overflow-hidden transition-colors hover:border-white/[0.12]"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-sm font-semibold text-white">{item.q}</span>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className={`flex-shrink-0 text-[#28AEA4] transition-transform duration-300 ${openFaq === i ? 'rotate-90' : ''}`}
                  >
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-gray-400 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} RinoSeller. Todos os direitos reservados.</p>
            <div className="flex items-center gap-5 mt-2 text-sm text-gray-500">
              <Link to="/termos"      className="hover:text-gray-300 transition-colors">Termos de uso</Link>
              <Link to="/privacidade" className="hover:text-gray-300 transition-colors">Política de privacidade</Link>
            </div>
          </div>
          <p className="text-sm text-gray-500 sm:text-right">
            LGPD, suporte e dúvidas em geral<br />
            <a href="mailto:contato@rinoseller.com" className="hover:text-gray-300 transition-colors">contato@rinoseller.com</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
