import { Mail, CheckCircle2, Star, ChevronRight, Zap, Loader2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { auth } from '../lib/firebase';

const EMAIL_PLANS = [
  { id: 'starter', name: 'Starter Email', storage: '5 GB', accounts: '1 Compte', price: 0.99, features: ['Webmail inclus', 'IMAP/POP3/SMTP', 'Anti-Spam basic'] },
  { id: 'business', name: 'Business Pro', storage: '25 GB', accounts: '5 Comptes', price: 4.99, features: ['Webmail Premium', 'Mobile Sync', 'Advanced Security', 'Domain Alias'] },
  { id: 'enterprise', name: 'Enterprise Hub', storage: '100 GB', accounts: '20 Comptes', price: 12.99, features: ['Team Collaboration', 'Admin Console', 'Vip Support', 'Archive 10 years'] },
];

export default function EmailReseller() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleOrder = async (planId: string, planName: string, price: number) => {
    const domain = window.prompt("Entrez le nom de domaine pour ce service email (ex: monentreprise.com):");
    if (!domain?.trim()) return;

    const confirmation = window.confirm(`Commander le plan Email "${planName}" rattaché à ${domain} pour ${price} €/mois ?`);
    if (!confirmation) return;

    setLoading(planId);
    const toastId = toast.loading(`Création du compte de messagerie pour ${domain}...`);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/paymenter/emails/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId, domain })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Une erreur est survenue");

      toast.success(`Plan email ${planName} commandé avec succès !`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Impossible de finaliser cette commande.', { id: toastId });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Hébergement Email</h1>
          <p className="text-gray-500 mt-1">Solutions emails professionnelles pour vos clients.</p>
        </div>
        <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg border border-purple-100 font-bold text-sm tracking-wide">
          <Zap size={18} fill="currentColor" />
          ACTIVATION INSTANTANÉE
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {EMAIL_PLANS.map((plan, idx) => (
          <div 
            key={plan.id} 
            className={`relative bg-white rounded-2xl border ${idx === 1 ? 'border-blue-600 ring-4 ring-blue-50' : 'border-gray-100'} p-8 flex flex-col hover:-translate-y-1 transition-all duration-300`}
          >
            {idx === 1 && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                <Star size={10} fill="white" />
                Le Plus Populaire
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-1 tracking-tight">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mt-4">
                <span className="text-4xl font-black text-gray-900">{plan.price} €</span>
                <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">/ mois</span>
              </div>
            </div>

            <div className="space-y-6 flex-1">
              <div className="pb-6 border-b border-gray-50">
                <div className="flex items-center gap-3 text-gray-900 font-bold mb-2">
                  <div className={`p-2 rounded-lg ${idx === 1 ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                    <Mail size={16} />
                  </div>
                  <span className="text-sm">{plan.accounts}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-900 font-bold">
                  <div className={`p-2 rounded-lg ${idx === 1 ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                    <Zap size={16} />
                  </div>
                  <span className="text-sm">{plan.storage} de stockage</span>
                </div>
              </div>

              <div className="space-y-3 pb-8">
                {plan.features.map(feat => (
                  <div key={feat} className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    {feat}
                  </div>
                ))}
              </div>
            </div>

            <button 
              disabled={loading !== null}
              onClick={() => handleOrder(plan.id, plan.name, plan.price)}
              className={`w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 group active:scale-95 ${
                idx === 1 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-100' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {loading === plan.id ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Finalisation...
                </>
              ) : (
                <>
                  Choisir ce plan
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Feature Highlight */}
      <div className="bg-white rounded-3xl border border-gray-100 p-10 flex flex-col md:flex-row items-center gap-10">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
            Messagerie Professionnelle
          </div>
          <h2 className="text-4xl font-black text-gray-900 leading-tight tracking-tighter">
            Proposez votre propre plateforme d'emails
          </h2>
          <p className="text-gray-500 text-lg leading-relaxed">
            Notre solution est 100% marque blanche. Vos clients ne voient que votre logo et vos couleurs sur le webmail, renforçant ainsi votre image de marque.
          </p>
          <div className="flex gap-4">
            <button className="bg-gray-900 text-white px-8 py-4 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors shadow-xl shadow-gray-200 flex items-center gap-2">
              Détails de l'Offre
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
