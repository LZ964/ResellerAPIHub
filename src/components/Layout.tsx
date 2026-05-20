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
  ShieldCheck,
  Building,
  Menu,
  Activity,
  CheckCircle2,
  AlertCircle,
  Terminal
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  user: User;
}

export default function Layout({ user }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
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
    await signOut(auth);
    navigate('/auth');
  };

  const navItems = [
    { name: 'Tableau de bord', path: '/', icon: LayoutDashboard },
    { name: 'Domaines & DNS', path: '/domains', icon: Globe },
    { name: 'Certificats SSL', path: '/ssl', icon: Lock },
    { name: 'Comptes Emails pro', path: '/emails', icon: Mail },
    { name: 'Idées de Marques IA', path: '/brainstorm', icon: Sparkles },
    { name: 'Conseiller IA Souverain', path: '/ai-assistant', icon: MessageSquare },
    { name: 'Profil & Conformité CA', path: '/profile', icon: Building },
  ];

  // Map route path to human-readable breadcrumbs (OVH / Oracle Style)
  const getBreadcrumbs = () => {
    const path = location.pathname;
    const base = "Console Cloud Reseller";
    if (path === '/') return [base, "Aperçu de l'Activité"];
    if (path === '/domains') return [base, "Nommage & Infrastructures DNSZone"];
    if (path === '/ssl') return [base, "Sécurisation & Certificats SSL"];
    if (path === '/emails') return [base, "Messagerie Professionnelle Souveraine"];
    if (path === '/brainstorm') return [base, "Générateur AI de Marques"];
    if (path === '/ai-assistant') return [base, "Assistant d'Architecture"];
    if (path === '/profile') return [base, "Paramètres & Conformité Nationale Canada"];
    return [base, "Console"];
  };

  const breadcrumbs = getBreadcrumbs();
  const isProfileComplete = profile.addressStreet && profile.addressCity && profile.legalRepresentativeName;

  return (
    <div className="flex h-screen bg-[#F4F6F9] font-sans text-gray-900 overflow-hidden">
      {/* Sidebar - Inspired by OVH dark deep blue aesthetic */}
      <aside className="w-64 bg-[#0F213A] text-gray-300 flex flex-col shrink-0 border-r border-[#1B2F4A]">
        {/* Brand Header */}
        <div className="p-6 bg-[#0B1A2F] border-b border-[#1A2E47] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white font-black shadow-inner shadow-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-white tracking-tight uppercase">ResellerHub</span>
              <span className="block text-[9px] uppercase tracking-wider font-mono text-blue-400 font-semibold">Sovereign Cloud v3</span>
            </div>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          <div className="px-3 mb-2 text-[10px] uppercase font-bold text-gray-500 tracking-widest">
            Services & Reventes
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-150 text-xs font-semibold uppercase tracking-wider",
                isActive 
                  ? "bg-[#1E3A5F] text-white border-l-4 border-blue-500 pl-2.5" 
                  : "text-gray-400 hover:bg-[#162A43] hover:text-white"
              )}
            >
              <item.icon className={cn("w-4 h-4 text-gray-400 group-hover:text-white")} />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* User context card & quick sign-out links */}
        <div className="p-4 bg-[#0B1A2F] border-t border-[#1B304C]">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#14263E] border border-[#1C3352] mb-3">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.displayName || 'Utilisateur'}</p>
              <span className="inline-block text-[9px] font-mono text-emerald-400 font-bold bg-emerald-950 px-1.5 rounded border border-emerald-900 mt-0.5">
                CANADA RESELLER
              </span>
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
        
        {/* Top Header Row (Dual Blue/Gray Oracle Ribbon) */}
        <header className="h-14 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-8 shrink-0 relative z-30">
          
          {/* Left: Breadcrumbs */}
          <div className="flex items-center gap-3 text-xs font-medium">
            <Menu className="w-4 h-4 text-gray-400 cursor-pointer lg:hidden" />
            <div className="flex items-center gap-2.5 text-gray-500">
              {breadcrumbs.map((crumb, idx) => (
                <div key={crumb} className="flex items-center gap-2.5">
                  {idx > 0 && <span className="text-gray-300 font-mono">/</span>}
                  <span className={idx === breadcrumbs.length - 1 ? "text-gray-900 font-bold" : "font-semibold hover:text-gray-700 cursor-pointer"}>
                    {crumb}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Functional Profile dropdown + Canadian Validation Status */}
          <div className="flex items-center gap-6">
            
            {/* Terminal Trigger Button (Top Right as requested) */}
            <button 
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer border border-transparent hover:border-blue-100 flex items-center gap-2 group"
              title="Terminal api-control"
              onClick={() => {
                // Focus logic will be handled by the component's internal state
                // Since moving it to top right, it might be better as a purely fixed button or a header icon
              }}
            >
              <Terminal size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline text-gray-400 group-hover:text-blue-600">CLI</span>
            </button>

            {/* Sovereign Canada Shield Indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-md text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Prestation Canada-Souveraine
            </div>

            {/* Profile Menu Trigger */}
            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-all text-xs font-semibold text-gray-700 cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-[10px]">
                  {profile.legalRepresentativeName?.[0]?.toUpperCase() || 'C'}
                </div>
                <span>{profile.legalRepresentativeName || user.email}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {/* Functional Dropdown Menu */}
              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="border-b border-gray-100 pb-3 mb-3">
                      <p className="font-bold text-gray-900 text-sm">Gestion du Profil Canadien</p>
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
                          <p className="font-bold text-gray-800">Conformité Juridique</p>
                          <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                            {isProfileComplete 
                              ? `Enregistré sous ${profile.legalBusinessStatus.toUpperCase()} (${profile.addressProvince})`
                              : "Complétez vos coordonnées canadiennes obligatoires pour légaliser vos transactions."
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
        <main className="flex-1 overflow-auto bg-[#F4F6F9]">
          <div className="max-w-7xl mx-auto p-8 h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Command Center / Terminal Overlay */}
      <ApiTerminal />
    </div>
  );
}
