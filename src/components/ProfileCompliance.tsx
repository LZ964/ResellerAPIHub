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
  ShieldAlert
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const token = await auth.currentUser?.getIdToken();
        const [profRes, keysRes] = await Promise.all([
          fetch('/api/profile', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/keys', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (profRes.ok) {
          const profData = await profRes.json();
          setProfile(prev => ({ ...prev, ...profData }));
        }
        if (keysRes.ok) setKeys(await keysRes.json());
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

  const provinces = [
    { code: 'QC', name: 'Québec' },
    { code: 'ON', name: 'Ontario' },
    { code: 'BC', name: 'Colombie-Britannique' },
    { code: 'AB', name: 'Alberta' },
    { code: 'NS', name: 'Nouvelle-Écosse' },
    { code: 'NB', name: 'Nouveau-Brunswick' },
    { code: 'MB', name: 'Manitoba' },
    { code: 'PE', name: 'Île-du-Prince-Édouard' },
    { code: 'SK', name: 'Saskatchewan' },
    { code: 'NL', name: 'Terre-Neuve-et-Labrador' },
    { code: 'YT', name: 'Yukon' },
    { code: 'NT', name: 'Territoires du Nord-Ouest' },
    { code: 'NU', name: 'Nunavut' }
  ];

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
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Courriel Principal</label>
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
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
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
