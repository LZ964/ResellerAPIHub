import { useState } from 'react';
import { Sparkles, Globe, ArrowRight, Loader2, Lightbulb, Search, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { auth } from '../lib/firebase';

interface Suggestion {
  name: string;
  domain: string;
  explanation: string;
}

export default function AIBrainstorm() {
  const [businessType, setBusinessType] = useState('');
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const handleBrainstorm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessType) return;

    setLoading(true);
    setSuggestions([]);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/ai/brainstorm', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ businessType, keywords }),
      });

      if (!response.ok) throw new Error('Erreur lors du brainstorming');
      const data = await response.json();
      setSuggestions(data.suggestions || []);
      toast.success('Suggestions générées !');
    } catch (err: any) {
      toast.error(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (domain: string) => {
    const confirmation = window.confirm(`Voulez-vous enregistrer le nom de domaine ${domain} pour $12.99 ?`);
    if (!confirmation) return;

    const toastId = toast.loading(`Enregistrement de ${domain}...`);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/paymenter/domains/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ domain, price: 12.99 })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur d'enregistrement");

      toast.success(`Nom de domaine ${domain} enregistré avec succès !`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Impossible d'acquérir ce domaine", { id: toastId });
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 text-purple-700 text-sm font-medium border border-purple-100">
          <Sparkles size={16} />
          Brainstorming IA
        </div>
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Trouvez le nom parfait</h1>
        <p className="text-gray-600 max-w-xl mx-auto text-lg">
          Laissez notre IA analyser votre vision et vous suggérer des noms de marque et des domaines percutants pour la pérennité de votre projet.
        </p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-100 border border-gray-100">
        <form onSubmit={handleBrainstorm} className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Votre vision / type de business</label>
            <input
              type="text"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="Ex: Une plateforme de streaming pour artistes locaux"
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-purple-500 transition-all text-gray-900 placeholder:text-gray-400"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Mots-clés (optionnel)</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Ex: zen, rapide, futur"
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-purple-500 transition-all text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <div className="md:col-span-2">
            <button
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-200 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Analyse de votre vision...
                </>
              ) : (
                <>
                  <Lightbulb size={24} />
                  Générer des idées
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-6">
        <AnimatePresence mode="popLayout">
          {suggestions.map((s, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group bg-white p-6 rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-900">{s.name}</h3>
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider">
                    {s.domain.split('.').pop()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Globe size={14} />
                  <span className="font-medium text-blue-600 underline underline-offset-4">{s.domain}</span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed max-w-lg">
                  {s.explanation}
                </p>
              </div>
              <button
                onClick={() => handleRegister(s.domain)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 transition-all self-start md:self-center"
              >
                <ShoppingCart size={18} />
                Vérifier
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {!loading && suggestions.length === 0 && (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm mb-4">
              <Sparkles className="text-purple-300" size={32} />
            </div>
            <p className="text-gray-400 font-medium">Entrez votre type de business pour commencer le brainstorming</p>
          </div>
        )}
      </div>
    </div>
  );
}
