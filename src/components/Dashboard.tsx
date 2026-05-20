import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Globe, 
  Lock, 
  Mail, 
  CreditCard,
  ExternalLink,
  ChevronRight,
  Loader2,
  Inbox
} from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../lib/firebase';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  productType: 'domain' | 'ssl' | 'email';
  amount: number;
  status: string;
  createdAt: string | Date;
}

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState({
    domains: 0,
    ssl: 0,
    emails: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/paymenter/user/products', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Impossible de charger les données du tableau de bord');
        const data: Product[] = await response.json();
        
        // Calculate statistics based on actual registered items plus some baseline mock reseller ones
        let domainCount = 0;
        let sslCount = 0;
        let emailCount = 0;
        let totalVal = 0;

        data.forEach(item => {
          if (item.productType === 'domain') domainCount++;
          else if (item.productType === 'ssl') sslCount++;
          else if (item.productType === 'email') emailCount++;
          totalVal += Number(item.amount || 0);
        });

        setProducts(data);
        setStats({
          domains: domainCount,
          ssl: sslCount,
          emails: emailCount,
          revenue: Math.round(totalVal * 100) / 100,
        });
      } catch (err: any) {
        toast.error(err.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const statCards = [
    { name: 'Domaines Actifs', value: stats.domains, icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Certificats SSL', value: stats.ssl, icon: Lock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Comptes Emails', value: stats.emails, icon: Mail, color: 'text-purple-600', bg: 'bg-purple-50' },
    { name: 'Activités Cumulées', value: `${stats.revenue} €`, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tableau de Bord</h1>
          <p className="text-gray-500 mt-1">Résumé en temps réel de votre activité de revente souveraine</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm cursor-pointer">
            <CreditCard size={16} />
            Facturation
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm cursor-pointer">
            <ExternalLink size={16} />
            Paymenter Panel
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
          >
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} w-fit mb-4`}>
              <stat.icon size={20} />
            </div>
            <p className="text-gray-500 text-sm font-medium">{stat.name}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 tracking-tight">Dernières Opérations</h3>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
              En direct
            </span>
          </div>
          <div className="p-0 overflow-x-auto">
            {products.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
                <div className="p-4 bg-gray-50 text-gray-400 rounded-full">
                  <Inbox size={32} />
                </div>
                <p className="text-gray-500 font-medium">Aucun service enregistré pour le moment.</p>
                <p className="text-gray-400 text-xs text-center max-w-xs">Brainstormez un nom ou utilisez nos services de domaines/SSL/Emails pour démarrer.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                    <th className="px-6 py-4">Produit / Service</th>
                    <th className="px-6 py-4">Date d'enregistrement</th>
                    <th className="px-6 py-4">Tarif</th>
                    <th className="px-6 py-4">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            item.productType === 'domain' ? 'bg-blue-50 text-blue-600' :
                            item.productType === 'ssl' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'
                          }`}>
                            {item.productType === 'domain' && <Globe size={14} />}
                            {item.productType === 'ssl' && <Lock size={14} />}
                            {item.productType === 'email' && <Mail size={14} />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{item.productType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                        {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        {item.amount} €
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold uppercase tracking-wider rounded-md border border-green-100">
                          {item.status || 'Réussi'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-2xl text-white shadow-lg shadow-blue-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
              <TrendingUp size={120} />
            </div>
            <h3 className="text-xl font-bold tracking-tight mb-2 relative z-10">Module WHMCS / Paymenter</h3>
            <p className="text-blue-100 text-sm mb-6 relative z-10">
              Téléchargez et configurez nos extensions certifiées pour automatiser vos reventes et pérenniser votre activité.
            </p>
            <button className="bg-white text-blue-600 px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-gray-50 transition-colors relative z-10 cursor-pointer">
              Télécharger
            </button>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 tracking-tight mb-4 text-lg">Support Technique</h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Besoin d'aide avec l'API ou l'intégration ? Nos conseillers sont à vos côtés 24/7 pour la longévité de vos architectures.
            </p>
            <div className="space-y-3">
              <button className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-bold text-gray-900">Documentation API</p>
                  <p className="text-xs text-gray-400">Endpoints et codes de réponse</p>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-400" />
              </button>
              <button className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-bold text-gray-900">Ouvrir un Ticket</p>
                  <p className="text-xs text-gray-400">Réponse garantie sous 2h</p>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
