import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { User, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import ApiTerminal from './ApiTerminal';
import { 
  LayoutDashboard, 
  Globe, 
  Lock, 
  Mail, 
  LogOut, 
  TrendingUp,
  User as UserIcon,
  Sparkles,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Building,
  Menu,
  Activity,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Book
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  user: User;
}

function SupportChat({ user }: { user: User }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          message: input,
          context: "Tu es l'agent de support technique de Sovereign Hub. Tu aides les utilisateurs à déboguer leurs noms de domaine, records DNS, certificats SSL et configurations email. Tu as une connaissance parfaite de l'API Sovereign Hub et du protocole Oracle Cloud Professionnel."
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4 pointer-events-none">
      {isOpen && (
        <div className="w-80 h-[450px] bg-white border border-gray-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto animate-in slide-in-from-bottom-10 duration-300">
          <div className="p-4 bg-oracle-red text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
              <span className="font-bold text-xs uppercase tracking-widest">Support Souverain</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded transition-colors cursor-pointer">
              <ChevronDown size={16} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-oracle-bg flex flex-col scroll-smooth">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 mb-3">
                  <ShieldCheck className="text-oracle-red w-6 h-6" />
                </div>
                <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1 italic">Agent ID: HUB-Support-01</p>
                <p className="text-[11px] text-gray-500 font-medium leading-relaxed">Prêt à déboguer vos domaines, DNS, SSL et emails en temps réel.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn(
                "max-w-[85%] p-3 text-[11px] font-bold leading-relaxed shadow-sm",
                m.role === 'user' 
                  ? "bg-oracle-red text-white rounded-2xl rounded-tr-sm self-end" 
                  : "bg-white text-gray-800 rounded-2xl rounded-tl-sm self-start border border-gray-100"
              )}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="self-start bg-white p-3 rounded-2xl rounded-tl-sm border border-gray-100 flex gap-1 items-center">
                <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce delay-100" />
                <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce delay-200" />
              </div>
            )}
          </div>

          <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-2xl border border-gray-100 px-3 py-1.5 focus-within:border-oracle-red/30 transition-all">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ex: Pourquoi mon SSL est invalide ?"
                className="flex-1 bg-transparent border-none outline-none text-[11px] font-bold text-gray-850 placeholder:text-gray-400"
              />
              <button 
                onClick={sendMessage}
                className="p-1.5 bg-oracle-red text-white rounded-xl hover:bg-oracle-red-dark transition-all cursor-pointer disabled:opacity-50"
                disabled={loading || !input.trim()}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-oracle-red text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all pointer-events-auto cursor-pointer border-4 border-white group"
      >
        <MessageSquare className={cn("w-6 h-6 transition-transform", isOpen ? "rotate-90" : "group-hover:scale-110")} />
        {!isOpen && (
          <div className="absolute -top-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
        )}
      </button>
    </div>
  );
}

export default function Layout({ user }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [profile, setProfile] = useState<any>({
    legalBusinessStatus: 'individual',
    canadianPresenceDeclared: true,
    legalRepresentativeName: '',
    addressProvince: 'QC'
  });

  useEffect(() => {
    async function fetchBriefProfile() {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (err) {
        console.warn("Failed loading fast profile overview in layout");
      }
    }
    fetchBriefProfile();
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.warn("Server logout log failed");
    }
    await signOut(auth);
    navigate('/auth');
  };

  const navItems = [
    { name: 'Aperçu Global', path: '/', icon: LayoutDashboard },
    { 
      name: 'Actifs & IA', 
      items: [
        { name: 'Domaines & DNS', path: '/domains', icon: Globe },
        { name: 'Idées de Marques IA', path: '/brainstorm', icon: Sparkles },
      ]
    },
    { 
      name: 'Services API', 
      items: [
        { name: 'Certificats SSL', path: '/ssl', icon: Lock },
        { name: 'Messagerie Pro', path: '/emails', icon: Mail },
        { name: 'Documentation', path: '/docs', icon: Book },
      ]
    },
    { 
      name: 'Support & Aide', 
      items: [
        { name: 'Agent IA Souverain', path: '/ai-assistant', icon: MessageSquare },
      ]
    },
    { 
      name: 'Compte & Facturation', 
      items: [
        { name: 'Profil Légal', path: '/profile', icon: Building },
        { name: 'Clefs d\'accès API', path: '/profile#keys', icon: Terminal },
      ]
    },
  ];

  // Map route path to human-readable breadcrumbs
  const getBreadcrumbs = () => {
    const path = location.pathname;
    const base = { name: "Console ResellerHub", path: "/" };
    
    if (path === '/') return [base, { name: "Tableau de Bord", path: "/" }];
    if (path === '/domains') return [base, { name: "Domaines & DNS", path: "/domains" }];
    if (path === '/ssl') return [base, { name: "Certificats SSL", path: "/ssl" }];
    if (path === '/emails') return [base, { name: "Messagerie", path: "/emails" }];
    if (path === '/brainstorm') return [base, { name: "Branding IA", path: "/brainstorm" }];
    if (path === '/ai-assistant') return [base, { name: "Support IA", path: "/ai-assistant" }];
    if (path === '/profile') return [base, { name: "Paramètres Profil", path: "/profile" }];
    return [base, { name: "Navigation", path: "#" }];
  };

  const breadcrumbs = getBreadcrumbs();
  const isProfileComplete = profile.addressStreet && profile.addressCity && profile.legalRepresentativeName;

  return (
    <div className="flex h-screen bg-oracle-bg font-sans text-[#212121] overflow-hidden">
      {/* Sidebar - Oracle Cloud Professional Dark Aesthetic */}
      <aside className="w-64 bg-oracle-sidebar text-gray-300 flex flex-col shrink-0 border-r border-[#313131]">
        {/* Brand Header */}
        <div className="p-6 bg-black border-b border-[#313131] flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="p-1.5 bg-oracle-red rounded text-white font-black shadow-lg shadow-black/50">
              <TrendingUp className="w-5 h-5 text-green-300" />
            </div>
            <div>
              <span className="font-bold text-base text-white tracking-tight uppercase">Sovereign HUB</span>
              <span className="block text-[8px] uppercase tracking-widest font-mono text-gray-500 font-black">Oracle Protocol v2.4</span>
            </div>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 py-6 px-3 space-y-6 overflow-y-auto">
          {navItems.map((group) => (
            <div key={group.name} className="space-y-1">
              <div className="px-3 mb-2 text-[9px] uppercase font-black text-gray-600 tracking-[0.2em] flex items-center justify-between">
                {group.name}
                <div className="w-1 h-1 bg-oracle-red rounded-full" />
              </div>
              {group.items ? (
                group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded transition-all duration-150 text-[11px] font-bold uppercase tracking-wider group",
                      isActive 
                        ? "bg-white/5 text-white border-l-4 border-oracle-red pl-2.5" 
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4 text-gray-600 group-hover:text-oracle-red transition-colors")} />
                    <span>{item.name}</span>
                  </NavLink>
                ))
              ) : group.path && group.icon ? (
                <NavLink
                  to={group.path}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded transition-all duration-150 text-[11px] font-bold uppercase tracking-wider group",
                    isActive 
                      ? "bg-white/5 text-white border-l-4 border-oracle-red pl-2.5" 
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <group.icon className={cn("w-4 h-4 text-gray-600 group-hover:text-oracle-red transition-colors")} />
                  <span>{group.name}</span>
                </NavLink>
              ) : null}
            </div>
          ))}
        </nav>

        {/* User context card */}
        <div className="p-4 bg-black border-t border-[#313131]">
          <div 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded bg-[#212121] border border-[#313131] mb-3 cursor-pointer hover:bg-[#252525] hover:border-oracle-red/30 transition-all group"
          >
            <div className="w-8 h-8 rounded bg-oracle-red flex items-center justify-center text-white font-bold text-xs shadow-inner">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-white truncate uppercase tracking-tighter">{user.displayName || 'Authorized Admin'}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Sovereign Gate</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-950/20 transition-all border border-transparent hover:border-red-900/30"
          >
            <LogOut className="w-3.5 h-3.5" />
            Déconnexion de la session
          </button>
        </div>
      </aside>

      {/* Main Body with Enterprise Top Bar (Oracle style) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header Row (Oracle White Professional Ribbon) */}
        <header className="h-14 bg-white border-b border-oracle-border shadow-sm flex items-center justify-between px-8 shrink-0 relative z-30">
          
          {/* Left: Breadcrumbs */}
          <div className="flex items-center gap-3 text-xs font-medium">
            <Menu className="w-4 h-4 text-gray-400 cursor-pointer lg:hidden" />
            <div className="flex items-center gap-2 text-gray-400">
              {breadcrumbs.map((crumb, idx) => (
                <div key={crumb.name} className="flex items-center gap-2">
                  {idx > 0 && <span className="opacity-30">/</span>}
                  <span 
                    onClick={() => navigate(crumb.path)}
                    className={cn(
                      "transition-colors cursor-pointer px-1 py-0.5 rounded",
                      idx === breadcrumbs.length - 1 
                        ? "text-oracle-red font-black" 
                        : "font-bold hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    {crumb.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
            
            <button 
              className="px-4 py-2 bg-gray-900 text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center gap-2.5 group hover:border-emerald-500/60 hover:bg-black transition-all shadow-lg active:scale-95 cursor-pointer"
              title="Console CLI api-control"
              onClick={() => setTerminalOpen(!terminalOpen)}
            >
              <div className="relative">
                <Terminal size={14} className="group-hover:scale-110 transition-transform" />
                <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.1em] font-mono">CLI_EXEC.SH</span>
            </button>

            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-gray-50 border border-oracle-border text-gray-600 rounded text-[9px] font-black uppercase tracking-[0.2em]">
              <ShieldCheck className="w-3.5 h-3.5 text-oracle-red" />
              Sovereign Instance
            </div>

            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-gray-50 border border-oracle-border rounded transition-all text-[11px] font-black text-gray-700 cursor-pointer uppercase tracking-tighter"
              >
                <div className="w-4 h-4 bg-oracle-red text-white font-bold flex items-center justify-center text-[8px] rounded-sm">
                  {profile.legalRepresentativeName?.[0]?.toUpperCase() || 'A'}
                </div>
                <span>{profile.legalRepresentativeName || user.email?.split('@')[0]}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {/* Functional Dropdown Menu */}
              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="border-b border-gray-100 pb-3 mb-3">
                      <p className="font-bold text-gray-900 text-sm">Gestion du Profil</p>
                      <p className="text-gray-400 text-[10px] truncate mt-0.5">{user.email}</p>
                    </div>

                    <div className="space-y-2.5">
                      <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-start gap-2.5">
                        {isProfileComplete ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                        )}
                        <div>
                          <p className="font-bold text-gray-800">État du compte</p>
                          <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                            {isProfileComplete 
                              ? `Profil vérifié sous le statut ${profile.legalBusinessStatus.toUpperCase()}.`
                              : "Complétez vos coordonnées obligatoires pour légaliser vos transactions."
                            }
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          navigate('/profile');
                        }}
                        className="w-full text-center py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition-colors"
                      >
                        Configurer l'identité d'Affaires
                      </button>

                      <button
                        onClick={handleLogout}
                        className="w-full text-center py-2 border border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50 font-bold rounded transition-colors"
                      >
                        Fermer la session
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>

        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-auto bg-oracle-bg flex flex-col">
          <div className="flex-1 max-w-7xl mx-auto p-8 h-full w-full">
            <Outlet />
          </div>
          
          {/* Footer - Professional Oracle Style */}
          <footer className="px-8 py-3 bg-white border-t border-oracle-border flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3.5 h-3.5 bg-oracle-red rounded-sm flex items-center justify-center">
                <TrendingUp size={9} className="text-white" />
              </div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                © 2026 Sovereign Reseller HUB Protocol. Proprietary System.
              </p>
            </div>
            <div className="flex items-center gap-4 text-[8px] font-black text-gray-400 uppercase tracking-tighter">
              <span className="hover:text-oracle-red cursor-pointer">SLA Core: Verified</span>
              <span className="w-1 h-1 bg-gray-200 rounded-full" />
              <span className="hover:text-oracle-red cursor-pointer">Compliance 2.4</span>
              <span className="w-1 h-1 bg-gray-200 rounded-full" />
              <span className="hover:text-oracle-red cursor-pointer">Global Access IP</span>
            </div>
          </footer>
        </main>
      </div>

      {/* Support floating chat */}
      <SupportChat user={user} />

      {/* Global Command Center / Terminal Overlay */}
      <ApiTerminal 
        isOpen={terminalOpen} 
        onOpen={() => setTerminalOpen(true)} 
        onClose={() => setTerminalOpen(false)} 
      />
    </div>
  );
}
