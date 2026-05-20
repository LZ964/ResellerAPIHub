import { useState, useEffect } from 'react';
import { 
  Globe, 
  Search, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Lock, 
  Mail, 
  CheckCircle2, 
  ChevronRight, 
  Loader2, 
  Info, 
  Server, 
  RefreshCw, 
  ArrowLeft,
  Settings,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { auth } from '../lib/firebase';

interface DomainResult {
  domain: string;
  available: boolean;
  price: number;
  tld: string;
}

interface DnsRecord {
  id: string;
  type: string;
  name: string;
  value: string;
  ttl: number;
  priority?: number;
}

interface RegisteredDomain {
  domainName: string;
  price: number;
  createdAt: string;
  dnsRecords?: DnsRecord[];
  sslStatus?: 'none' | 'pending' | 'issued';
  sslPlanId?: string;
  sslProvider?: string;
}

interface Mailbox {
  id: string;
  domainName: string;
  localPart: string;
  emailAddress: string;
  planId: string;
  status: string;
}

export default function DomainReseller() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'search' | 'bulk' | 'my-domains'>('my-domains');
  
  // Single Search State
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DomainResult[]>([]);
  
  // Bulk Order State
  const [bulkInput, setBulkInput] = useState('');
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ registered: string[]; errors: string[] } | null>(null);

  // Registered Domains State
  const [myDomains, setMyDomains] = useState<RegisteredDomain[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<RegisteredDomain | null>(null);

  // Domain Details sub-tabs
  const [detailsTab, setDetailsTab] = useState<'general' | 'dns' | 'ssl' | 'emails'>('general');

  // DNS Zone add form state
  const [newDns, setNewDns] = useState({ type: 'A', name: '@', value: '', ttl: 3600, priority: 10 });
  const [addingDns, setAddingDns] = useState(false);

  // Professional Mailbox create form state
  const [newMailbox, setNewMailbox] = useState({ localPart: '', password: '', planId: 'starter' });
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [loadingMailboxes, setLoadingMailboxes] = useState(false);
  const [creatingMailbox, setCreatingMailbox] = useState(false);

  // SSL plans for inner view
  const sslPlans = [
    { id: 'positive_ssl', name: 'PositiveSSL Standard', price: 15.99, provider: 'Sectigo' },
    { id: 'comodo_essential', name: 'EssentialSSL Pro', price: 29.99, provider: 'Comodo' },
    { id: 'sectigo_wildcard', name: 'Wildcard SSL Multipoints', price: 89.00, provider: 'Sectigo' }
  ];

  const emailPlans = [
    { id: 'starter', name: 'Starter Enterprise', price: 0.99 },
    { id: 'business', name: 'Pro Business Workspace', price: 4.99 },
    { id: 'enterprise', name: 'Enterprise Premium', price: 14.99 }
  ];

  // Load Registered domains
  async function loadMyDomains() {
    setLoadingDomains(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/domains', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Impossible de charger vos domaines.");
      const data = await response.json();
      setMyDomains(data);
    } catch (err: any) {
      toast.error(err.message || "Erreur de chargement");
    } finally {
      setLoadingDomains(false);
    }
  }

  useEffect(() => {
    loadMyDomains();
  }, []);

  // Handle single domain registration search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/paymenter/domains/search', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: query.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur lors de la recherche');
      setSearchResults(data.results || []);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la recherche');
    } finally {
      setIsSearching(false);
    }
  };

  // Order single domain
  const handleOrderDomain = async (domain: string, price: number) => {
    const confirmation = window.confirm(`Voulez-vous enregistrer le domaine ${domain} pour ${price} € ?`);
    if (!confirmation) return;

    const toastId = toast.loading(`Réservation du domaine ${domain}...`);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/paymenter/domains/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ domain, price })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Une erreur est survenue");

      toast.success(`Le domaine ${domain} a été acheté avec succès !`, { id: toastId });
      loadMyDomains();
      setActiveTab('my-domains');
    } catch (err: any) {
      toast.error(err.message || "Échec de l'achat", { id: toastId });
    }
  };

  // Order multiple domains (Bulk)
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const domains = bulkInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 3 && line.includes('.'));

    if (domains.length === 0) {
      toast.error("Veuillez entrer au moins un nom de domaine valide (ex: monsite.com), un par ligne.");
      return;
    }

    setIsBulkSubmitting(true);
    setBulkResult(null);
    const toastId = toast.loading(`Achat groupé de ${domains.length} domaines en cours...`);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/domains/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ domains })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur d'achat groupé");

      setBulkResult({
        registered: data.registered || [],
        errors: data.errors || []
      });

      toast.success(`${(data.registered || []).length} domaines achetés avec succès !`, { id: toastId });
      setBulkInput('');
      loadMyDomains();
    } catch (err: any) {
      toast.error(err.message || "Erreur de commande en masse", { id: toastId });
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // Inspect Domain details
  const handleInspectDomain = async (dom: RegisteredDomain) => {
    setSelectedDomain(dom);
    setDetailsTab('general');
    loadMailboxes(dom.domainName);
  };

  // Delete/release domain
  const handleDeleteDomain = async (domainName: string) => {
    const confirmation = window.confirm(`AVERTISSEMENT CRITIQUE: Êtes-vous sûr de vouloir supprimer définitivement le domaine ${domainName} de votre console ? Cette action efface également la zone DNS.`);
    if (!confirmation) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/domains/${domainName}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Erreur lors de la suppression");
      toast.success(`Domaine ${domainName} libéré.`);
      setSelectedDomain(null);
      loadMyDomains();
    } catch (err: any) {
      toast.error(err.message || "Impossible de détruire ce domaine");
    }
  };

  // Add DNS Record to selected domain
  const handleAddDns = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDomain) return;
    if (!newDns.value) {
      toast.error("Veuillez spécifier la valeur cible (ex: adresse IP ou serveur).");
      return;
    }

    setAddingDns(true);
    const toastId = toast.loading("Publication de l'enregistrement DNS...");
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/domains/${selectedDomain.domainName}/dns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newDns)
      });

      if (!response.ok) throw new Error("Échec de la mise à jour de la zone");
      toast.success("Enregistrement publié avec succès dans la DNS Zone !", { id: toastId });
      
      // Update local state instantly
      const updatedResponse = await fetch(`/api/domains/${selectedDomain.domainName}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (updatedResponse.ok) {
        const freshData = await updatedResponse.json();
        setSelectedDomain(freshData);
      }
      setNewDns({ type: 'A', name: '@', value: '', ttl: 3600, priority: 10 });
    } catch (err: any) {
      toast.error(err.message || "Erreur de configuration zone", { id: toastId });
    } finally {
      setAddingDns(false);
    }
  };

  // Delete DNS Record
  const handleDeleteDns = async (recordId: string) => {
    if (!selectedDomain) return;
    
    const toastId = toast.loading("Suppression de l'entrée DNS...");
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/domains/${selectedDomain.domainName}/dns/${recordId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Erreur de suppression DNS");
      toast.success("Enregistrement DNS retiré.", { id: toastId });

      // Refresh
      const updatedResponse = await fetch(`/api/domains/${selectedDomain.domainName}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (updatedResponse.ok) {
        const freshData = await updatedResponse.json();
        setSelectedDomain(freshData);
      }
    } catch (err: any) {
      toast.error(err.message || "Échec", { id: toastId });
    }
  };

  // Order SSL Certificate inside Domain Inspector
  const handleOrderSSLForDomain = async (planId: string) => {
    if (!selectedDomain) return;

    const toastId = toast.loading("Génération du certificat de clés publiques (SSL)...");
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/domains/${selectedDomain.domainName}/ssl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      });

      if (!response.ok) throw new Error("Échec de la commande de sécurité");
      toast.success("Certificat de sécurité émis et lié à la zone DNS !", { id: toastId });
      
      // Refresh
      const updatedResponse = await fetch(`/api/domains/${selectedDomain.domainName}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (updatedResponse.ok) {
        const freshData = await updatedResponse.json();
        setSelectedDomain(freshData);
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur SSL", { id: toastId });
    }
  };

  // Load Mailboxes for selected domain
  const loadMailboxes = async (domain: string) => {
    setLoadingMailboxes(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/domains/${domain}/mailboxes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMailboxes(data);
      }
    } catch (err) {
      console.error("Error loading mailboxes list");
    } finally {
      setLoadingMailboxes(false);
    }
  };

  // Create professional mailbox with local prefix
  const handleCreateMailbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDomain) return;
    if (!newMailbox.localPart || !newMailbox.password) {
      toast.error("Veuillez remplir tous les champs de configuration email.");
      return;
    }

    setCreatingMailbox(true);
    const toastId = toast.loading("Raccordement de la boite courriel...");
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/domains/${selectedDomain.domainName}/mailboxes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newMailbox)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur d'enregistrement de messagerie");

      toast.success(`Boîte ${data.emailAddress} active et opérationnelle !`, { id: toastId });
      setNewMailbox({ localPart: '', password: '', planId: 'starter' });
      loadMailboxes(selectedDomain.domainName);
    } catch (err: any) {
      toast.error(err.message || "Échec", { id: toastId });
    } finally {
      setCreatingMailbox(false);
    }
  };

  // Delete mailbox
  const handleDeleteMailbox = async (mailboxId: string, email: string) => {
    const confirmation = window.confirm(`Voulez-vous supprimer définitivement la boîte courriel ${email} ? Toutes les correspondances seront effacées.`);
    if (!confirmation) return;

    const toastId = toast.loading("Destruction de la boîte courriel...");
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/domains/${selectedDomain?.domainName}/mailboxes/${mailboxId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Échec");
      toast.success("Adresse mail supprimée.", { id: toastId });
      loadMailboxes(selectedDomain!.domainName);
    } catch (err: any) {
      toast.error(err.message || "Erreur de suppression", { id: toastId });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Detail Inspector Mode Overlay */}
      {selectedDomain ? (
        <div className="space-y-6">
          <button 
            onClick={() => { setSelectedDomain(null); loadMyDomains(); }}
            className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 cursor-pointer transition-colors uppercase tracking-wider bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
          >
            <ArrowLeft size={14} />
            Retour à la liste des domaines
          </button>

          {/* OVH styled Domain Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Globe className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-950 tracking-tight">{selectedDomain.domainName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider">Actif / Hébergé</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-xs text-gray-400 font-mono">ID: {selectedDomain.domainName}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => handleDeleteDomain(selectedDomain.domainName)}
                className="px-4 py-2 text-xs font-bold bg-white text-red-600 border border-red-200 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
              >
                Résilier l'hébergement
              </button>
            </div>
          </div>

          {/* Sub-tab selection row */}
          <div className="flex border-b border-gray-200 bg-white px-6 rounded-t-xl">
            {[
              { id: 'general', name: 'Information Générale', icon: Info },
              { id: 'dns', name: 'Zone DNS de publication', icon: Server },
              { id: 'ssl', name: 'Sécurisation SSL', icon: Lock },
              { id: 'emails', name: 'Messagerie (Emails)', icon: Mail }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setDetailsTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-4 text-xs font-bold transition-all border-b-2 tracking-wider uppercase cursor-pointer ${
                  detailsTab === tab.id 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <tab.icon size={14} />
                {tab.name}
              </button>
            ))}
          </div>

          {/* Sub-tab Inner content panels */}
          <div className="bg-white rounded-b-xl border-x border-b border-gray-200 p-8 min-h-[400px]">
            
            {/* GENERAL TAB */}
            {detailsTab === 'general' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Statut & Serveurs sous-jacents</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/60 space-y-1">
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Date d'Enregistrement</p>
                      <p className="text-sm font-bold text-gray-800">
                        {new Date(selectedDomain.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/60 space-y-1">
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Type d'Infrastructure</p>
                      <p className="text-sm font-bold text-blue-600 flex items-center gap-1.5">
                        <CheckCircle2 size={15} /> DNS AnyCAST Global Security Hub
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/60 space-y-1">
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Sécurité SSL rattachée</p>
                      <p className="text-sm font-bold text-gray-800">
                        {selectedDomain.sslStatus === 'issued' ? (
                          <span className="text-emerald-600 flex items-center gap-1.5">
                            <Lock size={14} /> Certificat Actif ({selectedDomain.sslProvider})
                          </span>
                        ) : (
                          <span className="text-amber-600 flex items-center gap-1.5">
                            <ShieldAlert size={14} /> Aucun Certificat Configuré
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/60 space-y-1">
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Protection WHOIS</p>
                      <p className="text-sm font-bold text-emerald-600">Activée (Reseller Masquage)</p>
                    </div>
                  </div>

                  <div className="bg-blue-50/40 p-5 rounded-xl border border-blue-100 space-y-3">
                    <h4 className="font-bold text-blue-900 text-sm">Prêt à héberger des services cloud ?</h4>
                    <p className="text-blue-800/80 text-xs leading-relaxed">
                      Créez des adresses courriels professionnelles directement rattachées à ce nom de domaine, ou liez-le à un certificat de sécurité de clés SSL Sectigo pour lancer votre vitrine e-commerce.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setDetailsTab('emails')} className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded transition-colors cursor-pointer">
                        Créer une boîte email
                      </button>
                      <button onClick={() => setDetailsTab('ssl')} className="px-3.5 py-1.5 bg-white text-blue-700 hover:bg-gray-50 border border-blue-300 font-bold text-xs rounded transition-colors cursor-pointer">
                        Acheter un SSL
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                  <h4 className="font-black text-gray-900 text-xs uppercase tracking-widest">Serveurs DNS Anycast</h4>
                  <div className="space-y-2 text-xs font-mono text-gray-600 bg-white p-4 rounded-lg border border-gray-100">
                    <p>ns1.resellerhub.net</p>
                    <p>ns2.resellerhub.net</p>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Les serveurs DNS Anycast propagent instantanément vos entrées industrielles A, CNAME, MX sur tout le territoire canadien sous 12 secondes.
                  </p>
                </div>
              </div>
            )}

            {/* DNS TAB */}
            {detailsTab === 'dns' && (
              <div className="space-y-8">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left: Table of active records */}
                  <div className="flex-1 space-y-4">
                    <h3 className="text-base font-bold text-gray-950 uppercase tracking-wider flex items-center gap-2">
                       Enregistrements DNS Actifs
                      <span className="text-xs font-mono font-normal text-gray-400 font-bold bg-gray-100 px-2 py-0.5 rounded">
                        {(selectedDomain.dnsRecords || []).length}
                      </span>
                    </h3>

                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-200 uppercase text-gray-400 font-bold tracking-widest text-[9px]">
                            <th className="px-4 py-3">Sous-domaine</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Valeur Cible (Target)</th>
                            <th className="px-4 py-3">TTL</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(selectedDomain.dnsRecords || []).length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-12 text-gray-400">Aucun enregistrement configuré.</td>
                            </tr>
                          ) : (
                            (selectedDomain.dnsRecords || []).map(rec => (
                              <tr key={rec.id} className="hover:bg-gray-50 transition-all font-mono">
                                <td className="px-4 py-3.5 font-bold text-gray-800">{rec.name}</td>
                                <td className="px-4 py-3.5"><span className="px-2 py-0.5 bg-gray-900 text-white rounded text-[10px] font-bold">{rec.type}</span></td>
                                <td className="px-4 py-3.5 text-gray-600 truncate max-w-xs">{rec.value}</td>
                                <td className="px-4 py-3.5 text-gray-400">{rec.ttl} s</td>
                                <td className="px-4 py-3.5 text-right">
                                  <button 
                                    onClick={() => handleDeleteDns(rec.id)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Form: add DNS Record */}
                  <div className="w-full lg:w-80 bg-gray-50 p-6 rounded-xl border border-gray-200 self-start">
                    <h3 className="font-bold text-gray-950 text-sm mb-4 flex items-center gap-1.5">
                      <Plus size={16} className="text-blue-600" /> Ajouter une entrée DNS
                    </h3>

                    <form onSubmit={handleAddDns} className="space-y-4 text-xs">
                      <div>
                        <label className="block font-bold text-gray-600 mb-1.5 uppercase">Type</label>
                        <select 
                          className="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg text-xs"
                          value={newDns.type}
                          onChange={(e) => setNewDns({ ...newDns, type: e.target.value })}
                        >
                          <option value="A">A (IP v4)</option>
                          <option value="AAAA">AAAA (IP v6)</option>
                          <option value="CNAME">CNAME (Alias de domaine)</option>
                          <option value="MX">MX (E-mails serveurs)</option>
                          <option value="TXT">TXT (Validation SPF / DKIM)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-600 mb-1.5 uppercase">Nom d'hôte (Host)</label>
                        <input 
                          type="text" 
                          required
                          placeholder="@ ou www"
                          className="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg font-mono text-xs"
                          value={newDns.name}
                          onChange={(e) => setNewDns({ ...newDns, name: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-gray-600 mb-1.5 uppercase">Cible (Cavalier / IP / Serveur)</label>
                        <input 
                          type="text" 
                          required
                          placeholder="ex: 185.34.74.57"
                          className="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg font-mono text-xs"
                          value={newDns.value}
                          onChange={(e) => setNewDns({ ...newDns, value: e.target.value })}
                        />
                      </div>

                      {newDns.type === 'MX' && (
                        <div>
                          <label className="block font-bold text-gray-600 mb-1.5 uppercase">Priorité</label>
                          <input 
                            type="number" 
                            className="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg font-mono text-xs"
                            value={newDns.priority}
                            onChange={(e) => setNewDns({ ...newDns, priority: Number(e.target.value) })}
                          />
                        </div>
                      )}

                      <div>
                        <label className="block font-bold text-gray-600 mb-1.5 uppercase">TTL (Thermodynamique)</label>
                        <input 
                          type="number" 
                          required
                          className="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg font-mono text-xs"
                          value={newDns.ttl}
                          onChange={(e) => setNewDns({ ...newDns, ttl: Number(e.target.value) })}
                        />
                      </div>

                      <button 
                        type="submit" 
                        disabled={addingDns}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold uppercase tracking-wider text-[10px] transition-colors cursor-pointer"
                      >
                        {addingDns ? "Émission..." : "Publier l'Enregistrement"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* SSL TAB */}
            {detailsTab === 'ssl' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                  <Lock className="text-blue-600 w-5 h-5" />
                  <h3 className="text-base font-bold text-gray-900">Certificats SSL de Sécurisation raccordables</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {sslPlans.map(plan => {
                    const isCurrent = selectedDomain.sslPlanId === plan.id;
                    return (
                      <div key={plan.id} className={`p-6 border rounded-xl flex flex-col justify-between ${isCurrent ? 'border-blue-600 bg-blue-50/20' : 'border-gray-200 bg-white'}`}>
                        <div>
                          <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">{plan.provider}</p>
                          <h4 className="font-bold text-base text-gray-900 mt-1">{plan.name}</h4>
                          <p className="text-gray-500 text-xs mt-2 leading-relaxed">
                            Émission de clés cryptographiques DV standard. Protège l'identité de vos visiteurs.
                          </p>
                        </div>

                        <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
                          <div>
                            <span className="text-lg font-black text-gray-950">{plan.price} €</span>
                            <span className="block text-[9px] text-gray-400 font-bold uppercase">HT / AN</span>
                          </div>

                          {isCurrent ? (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-bold">
                              Déjà Actif
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOrderSSLForDomain(plan.id)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 hover:shadow shadow-blue-100 text-white rounded text-xs font-semibold cursor-pointer transition-all"
                            >
                              Émettre
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* EMAILS TAB */}
            {detailsTab === 'emails' && (
              <div className="space-y-8">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* List of mailboxes */}
                  <div className="flex-1 space-y-4">
                    <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                       Messageries Établies
                      {loadingMailboxes && <Loader2 className="animate-spin w-4 h-4 text-blue-600" />}
                    </h3>

                    {loadingMailboxes ? (
                      <div className="py-12 text-center">
                        <Loader2 className="animate-spin w-6 h-6 text-blue-600 mx-auto" />
                      </div>
                    ) : mailboxes.length === 0 ? (
                      <div className="border border-dashed border-gray-200 rounded-xl py-16 text-center text-gray-400 space-y-2">
                        <Mail size={32} className="mx-auto text-gray-300" />
                        <p className="font-bold text-gray-800 text-sm">Aucune adresse courriel configurée</p>
                        <p className="text-xs">Créez votre première adresse de revente avec le formulaire ci-contre.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {mailboxes.map(box => (
                          <div key={box.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between group">
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-gray-950 font-mono">{box.emailAddress}</p>
                              <div className="flex items-center gap-2">
                                <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                <span className="text-[10px] uppercase font-bold text-gray-400">IMAP/SMTP actif</span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteMailbox(box.id, box.emailAddress)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded cursor-pointer transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Form to create address */}
                  <div className="w-full lg:w-80 bg-gray-50 p-6 rounded-xl border border-gray-200 self-start text-xs">
                    <h3 className="font-bold text-gray-950 text-sm mb-4 flex items-center gap-1.5">
                      <Plus size={16} className="text-blue-600" /> Créer une boîte email pro
                    </h3>

                    <form onSubmit={handleCreateMailbox} className="space-y-4">
                      <div>
                        <label className="block font-bold text-gray-600 mb-1.5 uppercase">Adresse email</label>
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden px-3 py-1 font-mono">
                          <input 
                            type="text" 
                            required
                            placeholder="contact"
                            className="flex-1 py-1.5 focus:outline-none text-xs"
                            value={newMailbox.localPart}
                            onChange={(e) => setNewMailbox({ ...newMailbox, localPart: e.target.value })}
                          />
                          <span className="text-gray-400 ml-1">@{selectedDomain.domainName}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-600 mb-1.5">Mot de Passe Initial</label>
                        <input 
                          type="password" 
                          required
                          placeholder="••••••••"
                          className="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg font-mono text-xs"
                          value={newMailbox.password}
                          onChange={(e) => setNewMailbox({ ...newMailbox, password: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-gray-600 mb-1.5">Plan de Messagerie</label>
                        <select
                          className="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg text-xs"
                          value={newMailbox.planId}
                          onChange={(e) => setNewMailbox({ ...newMailbox, planId: e.target.value })}
                        >
                          {emailPlans.map(ep => (
                            <option key={ep.id} value={ep.id}>{ep.name} - {ep.price} €/compte</option>
                          ))}
                        </select>
                      </div>

                      <button 
                        type="submit" 
                        disabled={creatingMailbox}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold uppercase tracking-wider text-[10px] transition-colors cursor-pointer"
                      >
                        {creatingMailbox ? "Provisioning..." : "Provisioner le compte"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      ) : (
        /* STANDARD LANDING VIEW */
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold font-sans text-gray-950 tracking-tight">Services de Nommage & Domaines</h1>
            <p className="text-gray-500 text-sm mt-1">Recherchez, provisionnez et gérez des zones DNS Anycast pour vos entités à l'international.</p>
          </div>

          {/* Navigation Bar matching OVH design and layout */}
          <div className="flex border-b border-gray-200 space-x-1">
            {[
              { id: 'my-domains', name: 'Mes Domaines Enregistrés' },
              { id: 'search', name: 'Nouveau Domaine (Unique)' },
              { id: 'bulk', name: 'Enregistrement en Masse (Vrac)' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-6 text-xs font-bold transition-all border-b-2 tracking-wider uppercase cursor-pointer ${
                  activeTab === tab.id 
                    ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg font-black' 
                    : 'border-transparent text-gray-500 hover:text-gray-900 bg-gray-50/50 hover:bg-gray-100/50'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          <div className="bg-white p-8 rounded-xl border border-gray-200 min-h-[400px]">
            
            {/* MY DOMAINS LIST VIEW */}
            {activeTab === 'my-domains' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-900 text-base uppercase tracking-wider flex items-center gap-2">
                     Domaines Actifs sur notre DNS
                    <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2.5 py-0.5 rounded-full">{myDomains.length}</span>
                  </h3>
                  
                  <button 
                    onClick={loadMyDomains}
                    className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-900 bg-white transition-all hover:shadow cursor-pointer"
                  >
                    <RefreshCw size={14} className={loadingDomains ? "animate-spin" : ""} />
                  </button>
                </div>

                {loadingDomains ? (
                  <div className="py-20 text-center">
                    <Loader2 className="animate-spin w-8 h-8 text-blue-600 mx-auto" />
                  </div>
                ) : myDomains.length === 0 ? (
                  <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                    <p className="text-gray-500 font-bold text-sm">Aucun nom de domaine hébergé actuellement.</p>
                    <p className="text-gray-400 text-xs mt-1">Créez-en un via nos modules de recherche ou d'import en masse.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-left font-sans text-xs">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-400 uppercase tracking-widest font-bold text-[9px]">
                          <th className="px-6 py-4">Nom de Domaine</th>
                          <th className="px-6 py-4">Structure d'Enregistrement</th>
                          <th className="px-6 py-4">Sécurité SSL</th>
                          <th className="px-6 py-4">Zone DNS de publication</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {myDomains.map(item => (
                          <tr key={item.domainName} className="hover:bg-gray-50 transition-all font-mono">
                            <td className="px-6 py-4 font-bold text-gray-950 font-sans text-sm">
                              {item.domainName}
                            </td>
                            <td className="px-6 py-4 text-gray-500 font-sans">
                              {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })}
                            </td>
                            <td className="px-6 py-4 font-sans">
                              {item.sslStatus === 'issued' ? (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-2 py-0.5 uppercase tracking-wider">
                                  <Lock size={12} /> SSL Actif
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-100 rounded px-2 py-0.5 uppercase tracking-wider">
                                  <AlertCircle size={12} /> Non sécurisé
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-sans font-medium text-gray-500">
                              {(item.dnsRecords || []).length} Enregistrement(s)
                            </td>
                            <td className="px-6 py-4 text-right font-sans">
                              <button
                                onClick={() => handleInspectDomain(item)}
                                className="px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 rounded font-bold transition-all text-xs flex items-center gap-1.5 ml-auto cursor-pointer"
                              >
                                Gérer
                                <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SINGLE SEARCH VIEW */}
            {activeTab === 'search' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="bg-[#0B1A2F] text-white p-6 rounded-xl flex items-center justify-between border border-[#1A2E47] mb-4">
                  <div>
                    <h3 className="font-bold text-base">Recherche Unitaire de Nom de Domaine</h3>
                    <p className="text-gray-400 text-xs mt-0.5">Vérification de disponibilité temps réel avec attribution DNS immediate.</p>
                  </div>
                </div>

                <form onSubmit={handleSearch} className="flex bg-gray-50 border border-gray-200 rounded-xl overflow-hidden p-1.5 shadow-inner">
                  <div className="px-4 text-gray-400 flex items-center">
                    <Globe size={20} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="ex: monprojet"
                    className="flex-1 px-2 py-3 bg-transparent text-sm focus:outline-none placeholder-gray-400"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isSearching ? <Loader2 className="animate-spin" size={14} /> : <Search size={14} />}
                    Vérifier
                  </button>
                </form>

                <div className="grid grid-cols-1 gap-4">
                  {searchResults.map((res, idx) => (
                    <motion.div
                      key={res.domain}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white p-5 rounded-xl border border-gray-200 flex items-center justify-between hover:shadow transition-shadow group font-mono text-xs"
                    >
                      <div>
                        <p className="text-sm font-bold text-gray-950 font-sans">{res.domain}</p>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest flex items-center gap-1">
                          {res.available ? (
                            <span className="text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1 font-sans">
                              Disponible pour enregistrement
                            </span>
                          ) : (
                            <span className="text-red-500 font-sans tracking-wide">Déjà réservé</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-6 font-sans">
                        <div className="text-right">
                          <p className="text-base font-black text-gray-950 font-mono">{res.price} €</p>
                          <p className="text-[9px] text-gray-400 uppercase font-black">HT / AN</p>
                        </div>
                        <button
                          disabled={!res.available}
                          onClick={() => handleOrderDomain(res.domain, res.price)}
                          className={`px-4 py-2 text-xs font-bold rounded uppercase tracking-wider cursor-pointer ${
                            res.available
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Acheter
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* BULK REGISTRATION VIEW */}
            {activeTab === 'bulk' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="bg-[#0B1A2F] text-white p-6 rounded-xl flex items-center justify-between border border-[#1A2E47] mb-2">
                  <div>
                    <h3 className="font-bold text-base text-white">Importation & Achat DNS en Masse</h3>
                    <p className="text-gray-400 text-xs mt-0.5">Saisissez vos idées de marque une par ligne pour commander l'ensemble simultanément.</p>
                  </div>
                </div>

                <form onSubmit={handleBulkSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-650 uppercase tracking-wider mb-2">Domaines à provisionner (un nom par ligne)</label>
                    <textarea
                      required
                      placeholder="monprojetcanadien.com&#10;monprojetinnovant.ca&#10;cybersecuritesouveraine.tech"
                      rows={6}
                      className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                    />
                    <p className="text-[10px] text-gray-400 leading-normal">
                      Extensions gérées dans cette console : `.com`, `.ca`, `.fr`, `.io`, `.tech`, `.ai`. Les DNS Anycast primaires seront provisionnées d'office.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isBulkSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-blue-700 rounded-xl cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isBulkSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Déclencher l'achat en vrac (12.99 € HT / an par domaine)
                  </button>
                </form>

                {bulkResult && (
                  <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 space-y-4 text-xs font-sans">
                    <h4 className="font-bold text-gray-900 uppercase">Résumé de l'attribution groupée</h4>
                    
                    <div className="space-y-2">
                      <p className="font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 size={14} /> Attribués avec Succès ({bulkResult.registered.length})
                      </p>
                      {bulkResult.registered.length === 0 ? (
                        <p className="text-gray-400 text-xs italic pl-6">Aucun domaine enregistré.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                          {bulkResult.registered.map(d => (
                            <div key={d} className="p-2 bg-white rounded border border-gray-100 font-mono text-[11px] text-gray-800">
                              {d} (DNS actif)
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {bulkResult.errors.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-gray-200">
                        <p className="font-bold text-red-500 uppercase tracking-wider">Erreurs d'enregistrement ({bulkResult.errors.length})</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                          {bulkResult.errors.map(err => (
                            <div key={err} className="p-2 bg-red-50 text-red-700 rounded border border-red-100 font-mono text-[11px]">
                              {err}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
