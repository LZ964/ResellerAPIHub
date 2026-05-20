import { ShieldCheck, Lock, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { auth } from '../lib/firebase';

const SSL_PLANS = [
  { id: 'positive_ssl', name: 'PositiveSSL', provider: 'Sectigo', type: 'DV', domains: '1 Domaine', price: 15.99, description: 'Certificat entrée de gamme idéal pour les blogs et petits sites.' },
  { id: 'comodo_essential', name: 'EssentialSSL', provider: 'Comodo', type: 'DV', domains: '1 Domaine', price: 29.99, description: 'Certificat standard avec une garantie plus élevée.' },
  { id: 'sectigo_wildcard', name: 'Wildcard SSL', provider: 'Sectigo', type: 'DV', domains: 'Illimité (*.domaine.com)', price: 89.00, description: 'Protégez tous vos sous-domaines avec un seul certificat.' },
];

export default function SSLReseller() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleOrder = async (planId: string, planName: string, price: number) => {
    const domain = window.prompt("Entrez le nom de domaine pour ce certificat (ex: monentreprise.com):");
    if (!domain?.trim()) return;

    const confirmation = window.confirm(`Commander le certificat ${planName} pour ${domain} au tarif de ${price} € ?`);
    if (!confirmation) return;

    setLoading(planId);
    const toastId = toast.loading(`Création de l'ordre pour ${domain}...`);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/paymenter/ssl/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId, domain })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Une erreur est survenue");

      toast.success(`Certificat ${planName} commandé avec succès !`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Impossible de passer cette commande.', { id: toastId });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Certificats SSL</h1>
          <p className="text-gray-500 mt-1">Sécurisez les sites de vos clients avec des certificats de confiance.</p>
        </div>
        <div className="bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-600" />
          <span className="text-emerald-700 text-sm font-bold uppercase tracking-wider">Partenaire Certifié</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SSL_PLANS.map((plan) => (
          <div key={plan.id} className="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-xl hover:shadow-gray-100 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 text-gray-50 opacity-10 group-hover:opacity-100 transition-opacity translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 duration-500 pointer-events-none">
              <Lock size={140} />
            </div>

            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded uppercase tracking-widest">{plan.type}</span>
                  <span className="text-xs text-gray-400 font-medium">{plan.provider}</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{plan.name}</h3>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-blue-600 tracking-tighter">{plan.price} €</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-1">HT / AN</p>
              </div>
            </div>

            <p className="text-gray-500 text-sm mb-8 leading-relaxed max-w-xs">{plan.description}</p>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>Format {plan.domains}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>Ré-émission illimitée</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>Compatible 99.9% des navigateurs</span>
              </div>
            </div>

            <button 
              disabled={loading !== null}
              onClick={() => handleOrder(plan.id, plan.name, plan.price)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-blue-100 active:scale-95 disabled:opacity-50"
            >
              {loading === plan.id ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Commande en cours...
                </>
              ) : (
                <>
                  Commander ce certificat
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
