import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  User as UserIcon, 
  FileText, 
  Save, 
  Loader2, 
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Key,
  Plus,
  Trash2,
  Mail,
  ShieldAlert,
  Wallet,
  CreditCard,
  History,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';

interface ProfileData {
  displayName?: string;
  email2fa?: string;
  legalBusinessStatus: string;
  taxId: string;
  country: string;
  legalRepresentativeName: string;
  legalRepresentativeEmail: string;
  addressStreet: string;
  addressCity: string;
  addressPostalCode: string;
  apiApproved?: boolean;
  apiRequest?: {
    projectName: string;
    useCase: string;
    estimatedVolume: string;
  };
}

interface ApiKey {
  id: string;
  key: string;
  name: string;
  permissions: string;
  createdAt: any;
}

interface Invoice {
  id: string;
  item: string;
  total: number;
  status: string;
  date: string;
}

export default function ProfileCompliance() {
  const [activeTab, setActiveTab] = useState('legal');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#keys') setActiveTab('keys');
    else if (hash === '#billing') setActiveTab('billing');
    else if (hash === '#security') setActiveTab('security');
    else setActiveTab('legal');
  }, [window.location.hash]);

  const [profile, setProfile] = useState<ProfileData>({
    displayName: '',
    email2fa: '',
    legalBusinessStatus: 'individual',
    taxId: '',
    country: 'International',
    legalRepresentativeName: '',
    legalRepresentativeEmail: '',
    addressStreet: '',
    addressCity: '',
    addressPostalCode: '',
    apiApproved: false
  });

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [balance, setBalance] = useState(0);
  const [depositAmount, setDepositAmount] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [funding, setFunding] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaire, setQuestionnaire] = useState({
    projectName: '',
    useCase: '',
    estimatedVolume: '100-1000'
  });

  useEffect(() => {
    async function loadData() {
      try {
        const token = await auth.currentUser?.getIdToken();
        const [profRes, keysRes, balRes, invRes] = await Promise.all([
          fetch('/api/profile', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/keys', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/billing/balance', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/paymenter/invoices', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (profRes.ok) {
          const profData = await profRes.json();
          setProfile(prev => ({ ...prev, ...profData }));
        }
        if (keysRes.ok) setKeys(await keysRes.json());
        if (balRes.ok) {
          const b = await balRes.json();
          setBalance(b.balance);
        }
        if (invRes.ok) setInvoices(await invRes.json());
      } catch (err) {
        toast.error("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('app-state-update', handleUpdate);
    return () => window.removeEventListener('app-state-update', handleUpdate);
  }, []);

  const handleDeposit = async () => {
    if (depositAmount < 50) {
      toast.error("Le dépôt minimum est de 50.00$");
      return;
    }
    setFunding(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: depositAmount })
      });
      
      const data = await res.json();
      if (data.url) {
        // Store amount in local storage to finalize after redirect
        localStorage.setItem('pending_deposit', depositAmount.toString());
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Échec de l'initialisation Stripe");
      }
    } catch (err) {
      toast.error("Connexion serveur perdue");
    } finally {
      setFunding(false);
    }
  };

  useEffect(() => {
    const finalizeDeposit = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === 'true') {
        const pending = localStorage.getItem('pending_deposit');
        if (pending) {
          try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch('/api/billing/deposit', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ amount: Number(pending), method: 'credit_card' })
            });
            if (res.ok) {
              const data = await res.json();
              setBalance(data.balance);
              toast.success(`Apport de ${pending}$ validé par le protocole.`);
              localStorage.removeItem('pending_deposit');
              // Clear URL params
              window.history.replaceState({}, '', window.location.pathname + window.location.hash);
            }
          } catch (err) {
            console.error("Finalization error", err);
          }
        }
      }
    };
    finalizeDeposit();
  }, []);

  const handleCreateKey = async () => {
    if (balance < 50) {
      toast.error("Solde insuffisant (50$ requis).");
      return;
    }
    if (!profile.apiApproved) {
      toast.error("Approbation API requise.");
      return;
    }
    setGeneratingKey(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: 'Default CLI Key', permissions: '1,2,3,4,5' })
      });
      if (res.ok) {
        const newKeyData = await res.json();
        toast.success(`Clef générée: ${newKeyData.key}`);
        const listRes = await fetch('/api/keys', { headers: { 'Authorization': `Bearer ${token}` } });
        setKeys(await listRes.json());
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la génération");
      }
    } finally {
      setGeneratingKey(false);
    }
  };

  const submitQuestionnaire = async () => {
    if (!questionnaire.projectName || !questionnaire.useCase) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ apiRequest: questionnaire })
      });
      if (res.ok) {
        setProfile(prev => ({ ...prev, apiRequest: questionnaire }));
        toast.success("Demande d'accès transmise à la gouvernance HUB.");
        setShowQuestionnaire(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadWHMCS = async () => {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch('/api/whmcs/module', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sovereign_whmcs_v1.zip';
      a.click();
      toast.success("Module WHMCS prêt au format .ZIP");
    } else {
      toast.error("Erreur de téléchargement.");
    }
  };

  const handleDeleteKey = async (id: string) => {
    const token = await auth.currentUser?.getIdToken();
    await fetch(`/api/keys/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setKeys(keys.filter(k => k.id !== id));
    toast.success("Clef révoquée");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading("Mise à jour du profil...");
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });

      if (!response.ok) throw new Error("Erreur de sauvegarde");
      toast.success("Profil mis à jour !", { id: toastId });
    } catch (err) {
      toast.error("Échec de la mise à jour", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
      </div>
    );
  }

  const isProfileComplete = 
    profile.addressStreet && 
    profile.addressCity && 
    profile.legalRepresentativeName && 
    profile.legalRepresentativeEmail;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Top Context Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-[0.2em] font-mono mb-1.5">
            <span>Réseau</span>
            <span>/</span>
            <span className="text-blue-600 font-bold">Profil Client</span>
          </div>
          <h1 className="text-2xl font-bold font-sans text-gray-900 tracking-tight">Paramètres du Profil</h1>
          <p className="text-gray-500 text-sm mt-1">Gérez votre identité numérique, vos clefs API et votre sécurité 2FA.</p>
        </div>

        <div>
          {isProfileComplete ? (
            <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-xs font-bold uppercase tracking-wider">
              <CheckCircle size={14} className="text-emerald-500" />
              Compte Vérifié
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-4 py-2 bg-amber-50 text-amber-700 rounded-full border border-amber-100 text-xs font-bold uppercase tracking-wider">
              <AlertTriangle size={14} className="text-amber-500" />
              Profil Incomplet
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Tab Sidebar */}
        <div className="flex flex-col gap-2">
          {[
            { id: 'legal', name: 'Identité Légale', icon: FileText },
            { id: 'billing', name: 'Facturation & Fonds', icon: Wallet },
            { id: 'keys', name: 'Accès API HUB', icon: Key },
            { id: 'security', name: 'Sécurité & 2FA', icon: ShieldAlert },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                window.location.hash = tab.id;
              }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                activeTab === tab.id 
                  ? "bg-oracle-red text-white shadow-lg shadow-oracle-red/20" 
                  : "bg-white text-gray-400 hover:bg-gray-50 border border-gray-100"
              )}
            >
              <tab.icon size={16} />
              {tab.name}
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-8 animate-in slide-in-from-right-4 duration-300">
          
          {activeTab === 'keys' && (
            <>
              {/* API Approval & Questionnaire Section */}
              {!profile.apiApproved && (
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-50 pb-5">
                    <div className="p-2 bg-oracle-red/10 text-oracle-red rounded-lg">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-950 text-base italic uppercase tracking-tighter">Approbation Sovereign API</h2>
                      <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">Étape obligatoire d'audit de sécurité</p>
                    </div>
                  </div>

                  {profile.apiRequest ? (
                    <div className="p-10 border-2 border-dashed border-gray-100 rounded-3xl text-center space-y-4">
                      <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                        <Loader2 size={32} />
                      </div>
                      <h3 className="text-lg font-black text-gray-900 uppercase italic">Candidature en cours...</h3>
                      <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
                        Votre projet <strong>"{profile.apiRequest.projectName}"</strong> a été soumis pour analyse. La gouvernance HUB valide généralement les accès sous 24h.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="p-5 bg-oracle-bg border border-oracle-border rounded-xl">
                        <p className="text-xs text-gray-600 leading-relaxed font-medium">
                          Pour garantir la pérennité du réseau HUB, chaque partenaire doit auditer son cas d'usage. L'accès API nécessite un solde minimum de <strong>50.00$</strong> et une validation manuelle.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nom du projet / Plateforme</label>
                          <input
                            type="text"
                            placeholder="EX: Dashboard Billing Canada"
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white transition-all outline-none"
                            value={questionnaire.projectName}
                            onChange={(e) => setQuestionnaire({ ...questionnaire, projectName: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ulisitation prévue (En détails)</label>
                          <textarea
                            placeholder="Décrivez comment vous allez utiliser nos endpoints..."
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white transition-all outline-none min-h-[100px]"
                            value={questionnaire.useCase}
                            onChange={(e) => setQuestionnaire({ ...questionnaire, useCase: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Volume mensuel d'opérations</label>
                          <select
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white transition-all outline-none"
                            value={questionnaire.estimatedVolume}
                            onChange={(e) => setQuestionnaire({ ...questionnaire, estimatedVolume: e.target.value })}
                          >
                            <option value="100-1000">100 - 1,000</option>
                            <option value="1000-10000">1,000 - 10,000</option>
                            <option value="unlimited">Partenaire Entreprise (&gt;10,000)</option>
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={submitQuestionnaire}
                        disabled={saving}
                        className="w-full py-4 bg-oracle-red text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-oracle-red/20 hover:bg-oracle-red-dark transition-all"
                      >
                        Soumettre ma Candidature API
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* API Keys Management - Logic gated by approval and balance */}
              <div className={cn(
                "bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 transition-all",
                (!profile.apiApproved || balance < 50) && "opacity-40 pointer-events-none grayscale"
              )}>
                <div className="flex items-center justify-between border-b border-gray-50 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <Key size={20} />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-950 text-base italic uppercase tracking-tighter">Clefs API HUB</h2>
                      <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">Tokens de sécurité programmatique</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateKey}
                    disabled={generatingKey || !profile.apiApproved || balance < 50}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    {generatingKey ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Nouveau Token
                  </button>
                </div>

                {balance < 50 && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 flex items-center gap-2 text-[10px] font-bold uppercase">
                    <AlertTriangle size={14} />
                    Solde minimum de 50.00$ requis pour activer le bouton de génération.
                  </div>
                )}

                <div className="space-y-3">
                  {keys.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 italic text-[10px] border border-dashed border-gray-100 rounded-xl uppercase font-bold tracking-widest">Aucun token actif détecté.</div>
                  ) : (
                    keys.map(k => (
                      <div key={k.id} className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between group">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-900 flex items-center gap-2 uppercase">
                            {k.name}
                            <span className="text-[8px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-400 font-black tracking-widest">HTTPS/TLS v2.0</span>
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[9px] text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-black">
                              {k.key}
                            </p>
                            <button 
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(k.key);
                                toast.success("Clef copiée !");
                              }}
                              className="text-[9px] text-gray-500 hover:text-oracle-red underline font-black uppercase tracking-widest transition-colors"
                            >
                              Copier
                            </button>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            if (confirm("Révoquer cet accès immédiatement ? Cette action est irréversible.")) handleDeleteKey(k.id);
                          }}
                          className="p-2 text-gray-300 hover:text-oracle-red hover:bg-oracle-red/10 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Gateway Connect Section - MOVED FROM DASHBOARD */}
              <div className="bg-[#0a0a0a] p-8 rounded-2xl text-white shadow-xl relative overflow-hidden group border border-oracle-red/20">
                <div className="absolute top-0 right-0 p-4 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                  <TrendingUp size={120} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-oracle-red/20 border border-oracle-red/30 rounded flex items-center justify-center text-oracle-red">
                      <Plus size={20} />
                    </div>
                    <div>
                      <h3 className="font-black tracking-tighter uppercase italic text-lg">Connect <span className="text-oracle-red">Gateway</span></h3>
                      <p className="text-[8px] text-gray-500 font-black tracking-[0.3em] uppercase">Module Registrar v1.0.2</p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs mb-6 leading-relaxed max-w-sm font-medium">
                    Intégrez le flux Sovereign ResellerHUB directement dans votre panneau WHMCS. Gérez les domaines et SSL automatiquement pour vos clients.
                  </p>
                  <button 
                    onClick={handleDownloadWHMCS}
                    className="bg-oracle-red text-white px-8 py-3 rounded text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-oracle-red/30 hover:bg-white hover:text-oracle-red transition-all cursor-pointer flex items-center gap-2 group-hover:translate-x-2 border border-transparent hover:border-oracle-red"
                  >
                    Télécharger Module (.ZIP)
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-950 text-base italic uppercase tracking-tighter">Sécurité & 2FA</h2>
                  <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">Protocoles d'accès critique</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2.5">Email de secours pour le 2FA</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input
                      type="email"
                      placeholder="2fa-auth@votre-domaine.com"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                      value={profile.email2fa}
                      onChange={(e) => setProfile({ ...profile, email2fa: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Billing Card - Moved to center for balance tab */}
              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-50 pb-5">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-950 text-base">Portefeuille Souverain</h2>
                    <p className="text-[10px] text-gray-400 font-medium">Gestion du crédit disponible</p>
                  </div>
                </div>

                <div className="bg-[#0c0c0c] p-10 rounded-3xl text-white relative overflow-hidden border border-gray-800">
                  <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                    <TrendingUp size={120} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] mb-2">Solde Autorisé</p>
                    <h2 className="text-5xl font-black tracking-tighter flex items-baseline gap-2">
                      {balance.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                      <span className="text-xl text-green-500 opacity-50 underline decoration-green-900">CAD</span>
                    </h2>
                    <div className="mt-6 flex items-center gap-4">
                      <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-[9px] font-black uppercase tracking-widest">
                        Status: Active
                      </div>
                      <div className="px-3 py-1 bg-white/5 border border-white/10 text-gray-400 rounded text-[9px] font-black uppercase tracking-widest">
                        Tier 1 Reseller
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Montant à verser</label>
                    <div className="relative group">
                      <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                      <input 
                        type="number"
                        min="50"
                        step="10"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeposit}
                    disabled={funding}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
                  >
                    {funding ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                    Confirmer l'apport
                  </button>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-4">
                  <HelpCircle className="text-blue-400 shrink-0" size={16} />
                  <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                    Un dépôt initial de <strong>50.00$</strong> est requis pour l'activation souveraine de votre compte. Les fonds sont utilisables pour l'achat de domaines, SSL et services API pro.
                  </p>
                </div>

                {/* Invoice History Section */}
                <div className="space-y-4 pt-6">
                  <div className="flex items-center gap-3">
                    <History size={18} className="text-gray-400" />
                    <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">historique des factures</h3>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-[10px]">
                      <thead className="bg-gray-100 text-gray-500 font-black uppercase tracking-widest">
                        <tr>
                          <th className="px-4 py-3">ID Facture</th>
                          <th className="px-4 py-3">Désignation</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Montant</th>
                          <th className="px-4 py-3">État</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {invoices.length === 0 ? (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 font-bold uppercase tracking-widest">Aucune facture enregistrée.</td></tr>
                        ) : (
                          invoices.map(inv => (
                            <tr key={inv.id} className="hover:bg-white transition-colors group">
                              <td className="px-4 py-3 font-mono font-bold text-blue-600">#{inv.id}</td>
                              <td className="px-4 py-3 font-black text-gray-900 group-hover:text-oracle-red transition-colors">{inv.item}</td>
                              <td className="px-4 py-3 font-bold text-gray-500">{inv.date}</td>
                              <td className="px-4 py-3 font-black text-gray-900">{inv.total}$ CAD</td>
                              <td className="px-4 py-3 uppercase tracking-tighter">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full font-black border",
                                  inv.status === 'Payé' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                )}>
                                  {inv.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'legal' && (
            <>
              {/* Identity Block */}
              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-50 pb-5">
                  <div className="p-2 bg-gray-50 text-gray-600 rounded-lg">
                    <FileText size={20} />
                  </div>
                  <h2 className="font-bold text-gray-950 text-base">Identité d'Affaires</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Forme Juridique</label>
                    <select
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                      value={profile.legalBusinessStatus}
                      onChange={(e) => setProfile({ ...profile, legalBusinessStatus: e.target.value })}
                    >
                      <option value="individual">Entreprise Individuelle</option>
                      <option value="corporation">Société / Compagnie</option>
                      <option value="non_profit">Organisation Sans But Lucratif</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Pays / Région</label>
                    <input
                      type="text"
                      placeholder="International"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                      value={profile.country}
                      onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Représentant Légal</label>
                    <input
                      type="text"
                      required
                      placeholder="Nom complet"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                      value={profile.legalRepresentativeName}
                      onChange={(e) => setProfile({ ...profile, legalRepresentativeName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Courriel Contact</label>
                    <input
                      type="email"
                      required
                      placeholder="contact@domaine.com"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                      value={profile.legalRepresentativeEmail}
                      onChange={(e) => setProfile({ ...profile, legalRepresentativeEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Adresse</label>
                    <input
                      type="text"
                      placeholder="123 Rue de la Technologie"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                      value={profile.addressStreet}
                      onChange={(e) => setProfile({ ...profile, addressStreet: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Ville</label>
                    <input
                      type="text"
                      placeholder="Lumière"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                      value={profile.addressCity}
                      onChange={(e) => setProfile({ ...profile, addressCity: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Code Postal</label>
                    <input
                      type="text"
                      placeholder="75001"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                      value={profile.addressPostalCode}
                      onChange={(e) => setProfile({ ...profile, addressPostalCode: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">ID Fiscal / No Entreprise</label>
                    <input
                      type="text"
                      placeholder="EX: 12345678"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                      value={profile.taxId}
                      onChange={(e) => setProfile({ ...profile, taxId: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right column: Sticky Summary Action */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 sticky top-6">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <CheckCircle size={16} className="text-blue-500" />
              Confirmation
            </h3>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Toutes les modifications apportées à l'onglet <strong>{activeTab.toUpperCase()}</strong> sont soumises à la validation souveraine avant propagation.
            </p>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-oracle-red text-white rounded-xl text-sm font-bold hover:bg-oracle-red-dark transition-all shadow-lg shadow-oracle-red/20 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Mettre à jour
            </button>
            <div className="pt-2 text-center">
              <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">Protocol Sync v2.4</p>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
