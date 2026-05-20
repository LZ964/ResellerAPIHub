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
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../lib/firebase';

interface ProfileData {
  displayName?: string;
  legalBusinessStatus: string;
  provincialRegistryNumber: string;
  gstHstNumber: string;
  qstNumber: string;
  provinceJurisdiction: string;
  canadianPresenceDeclared: boolean;
  legalRepresentativeName: string;
  legalRepresentativeEmail: string;
  addressStreet: string;
  addressCity: string;
  addressProvince: string;
  addressPostalCode: string;
}

export default function ProfileCompliance() {
  const [profile, setProfile] = useState<ProfileData>({
    displayName: '',
    legalBusinessStatus: 'individual',
    provincialRegistryNumber: '',
    gstHstNumber: '',
    qstNumber: '',
    provinceJurisdiction: 'Quebec',
    canadianPresenceDeclared: true,
    legalRepresentativeName: '',
    legalRepresentativeEmail: '',
    addressStreet: '',
    addressCity: '',
    addressProvince: 'QC',
    addressPostalCode: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setProfile(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        toast.error("Erreur de chargement du profil");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading("Mise à jour du profil de revente...");
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
      toast.success("Profil de conformité mis à jour pour le Canada !", { id: toastId });
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
    profile.addressPostalCode && 
    profile.legalRepresentativeName && 
    profile.legalRepresentativeEmail;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Oracle styled top Context Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-widest font-mono mb-1">
            <span>Console de revente</span>
            <span>&gt;</span>
            <span>Paramètres de facturation</span>
            <span>&gt;</span>
            <span className="text-blue-600 font-semibold">Identité Canada</span>
          </div>
          <h1 className="text-2xl font-bold font-sans text-gray-900 tracking-tight">Profil de Conformité Canadien</h1>
          <p className="text-gray-500 text-sm mt-1">Conformez votre cabinet de courtage de domaines aux exigences de l'ACEI (CIRA) et de l'ARC.</p>
        </div>

        <div>
          {isProfileComplete ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-100 text-sm font-semibold">
              <CheckCircle size={16} className="text-emerald-600" />
              Statut : Validé (Prestation active)
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-800 rounded-lg border border-amber-100 text-sm font-semibold">
              <AlertTriangle size={16} className="text-amber-600" />
              Statut : En attente d'informations requises
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50/70 border border-blue-100 p-6 rounded-2xl flex items-start gap-4">
        <ShieldCheck className="text-blue-600 shrink-0 mt-0.5 w-6 h-6" />
        <div className="space-y-1">
          <p className="font-bold text-blue-900 text-sm">Réglementation CIRA (Enregistrement de TLD .CA)</p>
          <p className="text-blue-800 text-xs leading-relaxed">
            Pour réserver des extensions canadiennes `.ca` ou opérer des facturations à l'intérieur du territoire souverain canadien, l'Autorité canadienne pour les enregistrements Internet exige une déclaration de présence locale valide et des structures d'identifiants fiscaux provinciaux / fédéraux conformes.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Business entity info */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Identity Block */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
              <FileText className="text-blue-600 w-5 h-5" />
              <h2 className="font-bold text-gray-950 text-base">Structure légale de l'entreprise</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Forme Juridique</label>
                <select
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={profile.legalBusinessStatus}
                  onChange={(e) => setProfile({ ...profile, legalBusinessStatus: e.target.value })}
                >
                  <option value="individual">Entreprise Individuelle (Travailleur autonome)</option>
                  <option value="corporation">Société par Actions / Incorporée (Inc.)</option>
                  <option value="sole_proprietor">Propriété Unique d'affaires</option>
                  <option value="partnership">Société de Personnes / S.E.N.C.</option>
                  <option value="non_profit">Organisme de Bienfaisance / Sans But Lucratif</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Province de Juridiction</label>
                <select
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={profile.provinceJurisdiction}
                  onChange={(e) => setProfile({ ...profile, provinceJurisdiction: e.target.value })}
                >
                  <option value="Quebec">Québec</option>
                  <option value="Ontario">Ontario</option>
                  <option value="Alberta">Alberta</option>
                  <option value="BC">Colombie-Britannique</option>
                  <option value="Other">Autre territoire canadien</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  N° Enregistrement Provincial 
                  <span className="text-gray-400 font-normal normal-case block text-[10px] mt-0.5">NEQ (Québec) ou OBR (Ontario)</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: 1178945621"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={profile.provincialRegistryNumber}
                  onChange={(e) => setProfile({ ...profile, provincialRegistryNumber: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Taxe Fédérale TPS / TVH
                  <span className="text-gray-400 font-normal normal-case block text-[10px] mt-0.5">Format: 9 chiffres RT 0001</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: 123456789 RT 0001"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={profile.gstHstNumber}
                  onChange={(e) => setProfile({ ...profile, gstHstNumber: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Taxe Provinciale TVQ / TVP
                  <span className="text-gray-400 font-normal normal-case block text-[10px] mt-0.5">Québec: 10 chiffres TQ 0001</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: 1234567890 TQ 0001"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={profile.qstNumber}
                  onChange={(e) => setProfile({ ...profile, qstNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <input
                id="cpr_checkbox"
                type="checkbox"
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={profile.canadianPresenceDeclared}
                onChange={(e) => setProfile({ ...profile, canadianPresenceDeclared: e.target.checked })}
              />
              <label htmlFor="cpr_checkbox" className="text-xs text-gray-600 leading-relaxed cursor-pointer select-none">
                <span className="font-bold text-gray-900 block mb-0.5">Présence Canadienne Exigée (CIRA CPR)</span>
                Je déclare sur l'honneur que le titulaire de ce compte satisfait pleinement aux critères d'admissibilité de la présence canadienne exigée par l'Autorité canadienne pour les enregistrements Internet (CIRA), y compris d'être citoyen canadien, résident permanent, ou une corporation légalement constituée au Canada.
              </label>
            </div>
          </div>

          {/* Legal Representative Details */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
              <UserIcon className="text-blue-600 w-5 h-5" />
              <h2 className="font-bold text-gray-950 text-base">Directeur / Représentant Légal Officiel</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Prénom & Nom du signataire</label>
                <input
                  type="text"
                  required
                  placeholder="Jean Tremblay"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={profile.legalRepresentativeName}
                  onChange={(e) => setProfile({ ...profile, legalRepresentativeName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Courriel d'affaires Direct</label>
                <input
                  type="email"
                  required
                  placeholder="j.tremblay@nomdedomaine.ca"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={profile.legalRepresentativeEmail}
                  onChange={(e) => setProfile({ ...profile, legalRepresentativeEmail: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Canadian Local Address */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
              <MapPin className="text-blue-600 w-5 h-5" />
              <h2 className="font-bold text-gray-950 text-base">Adresse physique et de facturation au Canada</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">No Civique, Rue et Suite</label>
                <input
                  type="text"
                  placeholder="1250 René-Lévesque Ouest, Suite 800"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={profile.addressStreet}
                  onChange={(e) => setProfile({ ...profile, addressStreet: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Ville</label>
                <input
                  type="text"
                  placeholder="Montréal"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={profile.addressCity}
                  onChange={(e) => setProfile({ ...profile, addressCity: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Province / Territoire</label>
                <select
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={profile.addressProvince}
                  onChange={(e) => setProfile({ ...profile, addressProvince: e.target.value })}
                >
                  {provinces.map(prov => (
                    <option key={prov.code} value={prov.code}>{prov.name} ({prov.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Code Postal</label>
                <input
                  type="text"
                  placeholder="H3B 4W8"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={profile.addressPostalCode}
                  onChange={(e) => setProfile({ ...profile, addressPostalCode: e.target.value })}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right column: Action summaries */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="font-bold text-gray-900 text-sm">Action de Validation</h3>
            <p className="text-gray-500 text-xs leading-relaxed">
              Assurez-vous que toutes les données déclarées correspondent rigoureusement à vos registres comptables et juridiques pour éviter toute interruption d'enregistrement.
            </p>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Sauvegarde..." : "Appliquer les Modifications"}
            </button>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-widest flex items-center gap-2">
              <HelpCircle size={14} className="text-blue-500" />
              Besoin de support ?
            </h4>
            <p className="text-gray-500 text-xs leading-relaxed">
              Pour des transferts de registres, fusions corporatives ou exemptions fiscales de taxes autochtones (Exemption de taxe de la Loi sur les Indiens) au Canada, veuillez contacter nos conseillers francophones régionaux basés au Canada.
            </p>
          </div>
        </div>

      </form>
    </div>
  );
}
