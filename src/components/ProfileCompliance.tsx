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
}

interface ApiKey {
  id: string;
  key: string;
  name: string;
  permissions: string;
  createdAt: any;
}

export default function ProfileCompliance() {
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
    addressPostalCode: ''
  });

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [balance, setBalance] = useState(0);
  const [depositAmount, setDepositAmount] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [funding, setFunding] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const token = await auth.currentUser?.getIdToken();
        const [profRes, keysRes, balRes] = await Promise.all([
          fetch('/api/profile', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/keys', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/billing/balance', { headers: { 'Authorization': `Bearer ${token}` } })
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
      const res = await fetch('/api/billing/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: depositAmount, method: 'credit_card' })
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        toast.success(`Dépôt de ${depositAmount}$ réussi !`);
        setDepositAmount(50);
        window.dispatchEvent(new CustomEvent('app-state-update'));
      } else {
        const data = await res.json();
        toast.error(data.error || "Échec du dépôt");
      }
    } catch (err) {
      toast.error("Connexion serveur perdue");
    } finally {
      setFunding(false);
    }
  };

  const handleCreateKey = async () => {
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
      }
    } finally {
      setGeneratingKey(false);
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

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-8">
          
          {/* 2FA Security Section */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-50 pb-5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h2 className="font-bold text-gray-950 text-base">Sécurité & 2FA</h2>
                <p className="text-[10px] text-gray-400 font-medium">Authentification double facteur par email</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2.5">Email de secours pour le 2FA</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="email"
                    placeholder="2fa-auth@votre-domaine.com"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-11 pr-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                    value={profile.email2fa}
                    onChange={(e) => setProfile({ ...profile, email2fa: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* API Keys Management */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Key size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-950 text-base">Clefs API</h2>
                  <p className="text-[10px] text-gray-400 font-medium">Accès programmatique automatisé</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCreateKey}
                disabled={generatingKey}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              >
                {generatingKey ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Générer une clef
              </button>
            </div>

            <div className="space-y-3">
              {keys.length === 0 ? (
                <div className="text-center py-8 text-gray-400 italic text-xs">Aucune clef API active.</div>
              ) : (
                keys.map(k => (
                  <div key={k.id} className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-900">{k.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">Key: {k.key.substring(0, 10)}****************</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleDeleteKey(k.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

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
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
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
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
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
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
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
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
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
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  value={profile.addressStreet}
                  onChange={(e) => setProfile({ ...profile, addressStreet: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Ville</label>
                <input
                  type="text"
                  placeholder="Lumière"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
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
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  value={profile.addressPostalCode}
                  onChange={(e) => setProfile({ ...profile, addressPostalCode: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">ID Fiscal / No Entreprise</label>
                <input
                  type="text"
                  placeholder="EX: 12345678"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  value={profile.taxId}
                  onChange={(e) => setProfile({ ...profile, taxId: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Billing Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Wallet size={20} />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Gestion du Solde</h3>
            </div>

            <div className="bg-gray-900 p-6 rounded-2xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp size={60} />
              </div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5">Solde Actuel</p>
              <h2 className="text-3xl font-black tracking-tighter">
                {balance.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
              </h2>
            </div>

            <div className="space-y-4">
              <div className="relative">
                < DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input 
                  type="number"
                  min="50"
                  step="10"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                />
              </div>
              <button
                type="button"
                onClick={handleDeposit}
                disabled={funding}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
              >
                {funding ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                Alimenter le Compte
              </button>
              <p className="text-[9px] text-center text-gray-400 font-medium">
                Dépôt minimum de 50.00$ requis pour les opérations API.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 sticky top-6">
            <h3 className="font-bold text-gray-900 text-sm">Action de Validation</h3>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              La mise à jour de votre profil impacte immédiatement les informations de facturation et les registres WHOIS.
            </p>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Sauvegarder
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
