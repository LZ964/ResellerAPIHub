import { useState } from 'react';
import { 
  Book, 
  Terminal, 
  ShieldCheck, 
  Wallet, 
  Globe, 
  Key, 
  Mail, 
  Lock, 
  HelpCircle,
  ChevronRight,
  Code2,
  FileText,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DocSection {
  id: string;
  title: string;
  icon: any;
  content: JSX.Element;
}

export default function Documentation() {
  const [activeTab, setActiveTab] = useState('getting-started');

  const sections: DocSection[] = [
    {
      id: 'getting-started',
      title: 'Guide d\'activation',
      icon: zapIcon,
      content: (
        <div className="space-y-8">
          <div className="p-6 bg-oracle-red/10 border-l-4 border-oracle-red rounded-r-xl">
             <h3 className="text-oracle-red font-black uppercase tracking-widest text-sm mb-2 flex items-center gap-2">
               <AlertTriangle size={16} /> Activation Souveraine
             </h3>
             <p className="text-gray-700 text-xs leading-relaxed font-medium">
               Pour garantir la stabilité du protocole, un dépôt initial de <strong>50.00$ CAD</strong> est requis. Ces fonds restent intégralement disponibles pour vos achats de services (Domaines, SSL, API).
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                <Wallet size={20} />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">1. Financement</h4>
              <p className="text-gray-500 text-[11px] leading-relaxed">
                Rendez-vous dans la section <strong>Facturation</strong>. Utilisez Stripe pour approvisionner votre solde. Une fois le seuil de 50$ atteint, les fonctionnalités avancées se débloquent.
              </p>
            </div>
            <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
                <ShieldCheck size={20} />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">2. Identité Légale</h4>
              <p className="text-gray-500 text-[11px] leading-relaxed">
                Le statut <strong>Présence Canadienne</strong> doit être déclaré pour l'enregistrement des domaines .CA. Complétez votre profil légal pour éviter les suspensions d'audit.
              </p>
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl p-8 text-white">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-6 text-gray-500">Flux de travail standard</h4>
            <div className="space-y-6">
              {[
                "Dépôt de capital via Interface Stripe sécurisée",
                "Approbation du projet via le formulaire de gouvernance API",
                "Génération des Tokens d'accès programmatiques",
                "Déploiement des modules passerelles (WHMCS/Paymenter)"
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-bold">
                    {i + 1}
                  </div>
                  <span className="text-xs font-medium text-gray-300">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'api-hub',
      title: 'API HUB & Gateway',
      icon: Key,
      content: (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-black text-gray-900 uppercase italic tracking-tighter text-lg mb-4">Architecture API v2.0</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              L'API Sovereign HUB permet une automatisation totale de la revente de ressources cloud. Elle est protégée par un audit de conformité manuel pour chaque partenaire.
            </p>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h4 className="text-[10px] font-black text-oracle-red uppercase tracking-widest mb-1">Endpoints de Base</h4>
                <code className="text-xs font-mono font-bold text-gray-700">HTTPS POST /api/paymenter/domains/register</code>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="p-8 bg-[#0a0a0a] text-white rounded-2xl border border-white/5 relative overflow-hidden">
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6">
                <Globe className="text-oracle-red" />
              </div>
              <h4 className="text-lg font-black italic uppercase mb-2">Intégration WHMCS</h4>
              <p className="text-gray-400 text-xs leading-relaxed mb-6">
                Le module Gateway est fourni en format <strong>.ZIP</strong>. Il contient les drivers nécessaires pour interfacer WHMCS avec le protocole Oracle Cloud Professionnel via nos serveurs de noms faisant autorité.
              </p>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <p className="text-[10px] font-black uppercase text-gray-500 mb-2">Installation Rapide:</p>
                <ol className="text-[10px] space-y-2 text-gray-300">
                  <li>1. Téléchargez le dossier <span className="text-oracle-red font-bold">sovereign_whmcs_v1.zip</span></li>
                  <li>2. Extrayez-le dans <code className="bg-black px-1">/modules/registrars/</code></li>
                  <li>3. Configurez votre clef API dans le panneau d'admin WHMCS</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'terminal',
      title: 'Admin CLI Dictionary',
      icon: Terminal,
      content: (
        <div className="space-y-8">
          <div className="bg-black rounded-2xl p-8 border border-white/10 font-mono shadow-2xl">
            <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="ml-4 text-gray-500 text-xs font-bold uppercase tracking-widest">Oracle_CLI_Help v3.4.2</span>
            </div>

            <div className="space-y-10">
              <section>
                <h4 className="text-oracle-red text-xs font-black uppercase tracking-[0.3em] mb-4">Commandes d'Affaires</h4>
                <div className="grid grid-cols-1 gap-6">
                  <CommandItem 
                    cmd="api-control register <domaine>" 
                    desc="Enregistre un domaine souverain instantanément."
                    example="api-control register projet-hub.ca"
                  />
                  <CommandItem 
                    cmd="api-control search <keyword>" 
                    desc="Vérifie la disponibilité sur les TLDs supportés (.com, .net, .ca)."
                    example="api-control search startup"
                  />
                  <CommandItem 
                    cmd="api-control apikey:create" 
                    desc="Génère un nouveau token (Nécessite approbation)."
                  />
                </div>
              </section>

              <section>
                <h4 className="text-blue-400 text-xs font-black uppercase tracking-[0.3em] mb-4">Commandes DNS & Réseau</h4>
                <div className="grid grid-cols-1 gap-6">
                  <CommandItem 
                    cmd="api-control dns:add <dom> <type> <val>" 
                    desc="Ajoute un record sur la zone autoritaire."
                    example="api-control dns:add myhub.ca A 1.1.1.1"
                  />
                  <CommandItem 
                    cmd="api-control whois <domaine>" 
                    desc="Interroge les bases de données WHOIS globales."
                  />
                  <CommandItem 
                    cmd="api-control dig <domaine>" 
                    desc="Requête DNS directe (Type A)."
                  />
                </div>
              </section>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'support',
      title: 'Support Technique IA',
      icon: HelpCircle,
      content: (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-black text-gray-900 uppercase italic tracking-tighter text-lg mb-4">L'Agent Support Souverain</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Accessible via le bouton flottant en bas à droite de chaque page, cet agent IA est spécialisé dans le débogage d'infrastructure.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 flex gap-4">
                <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-oracle-red shrink-0">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h5 className="font-bold text-gray-900 text-xs mb-1">Dépannage SSL</h5>
                  <p className="text-[10px] text-gray-500">Validation des certificats et chaînes d'autorité CA.</p>
                </div>
              </div>
              <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 flex gap-4">
                <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-blue-500 shrink-0">
                  <Mail size={16} />
                </div>
                <div>
                  <h5 className="font-bold text-gray-900 text-xs mb-1">Audit Email</h5>
                  <p className="text-[10px] text-gray-500">Vérification des records SPF, DKIM et DMARC.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-oracle-bg rounded-xl border border-oracle-border italic">
              <p className="text-xs text-gray-600 leading-relaxed">
                "Nos algorithmes analysent les traces serveur en temps réel pour vous donner la cause exacte d'une non-propagation DNS ou d'une erreur de routage SMTP."
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6">
      <header className="flex items-center justify-between border-b border-gray-200 pb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">
            Documentation <span className="text-oracle-red underline decoration-4 underline-offset-4">Souveraine</span>
          </h1>
          <p className="text-gray-400 font-medium text-sm mt-2 uppercase tracking-widest">Protocol Reference & Implementation Guide v2.4.0</p>
        </div>
        <div className="w-16 h-16 bg-white border-2 border-gray-100 rounded-3xl flex items-center justify-center text-oracle-red shadow-sm group hover:scale-110 transition-transform">
          <Book size={32} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12">
        <aside className="space-y-2">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveTab(section.id)}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-5 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === section.id 
                  ? "bg-oracle-red text-white shadow-xl shadow-oracle-red/20 translate-x-2" 
                  : "bg-white text-gray-400 hover:bg-gray-50 border border-gray-100"
              )}
            >
              <div className="flex items-center gap-3">
                <section.icon size={16} />
                {section.title}
              </div>
              <ChevronRight size={14} className={cn("transition-transform", activeTab === section.id ? "" : "opacity-0")} />
            </button>
          ))}

          <div className="mt-12 p-6 bg-oracle-bg border border-oracle-border rounded-2xl">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Besoin de plus?</h5>
            <button className="w-full flex items-center gap-2 text-[11px] font-bold text-gray-700 hover:text-oracle-red transition-colors">
              <FileText size={14} />
              Whitepaper PDF
            </button>
          </div>
        </aside>

        <main className="min-h-[600px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {sections.find(s => s.id === activeTab)?.content}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function CommandItem({ cmd, desc, example }: { cmd: string, desc: string, example?: string }) {
  return (
    <div className="space-y-2 group">
      <div className="flex items-center gap-3">
        <code className="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all">
          {cmd}
        </code>
      </div>
      <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
      {example && (
        <p className="text-[9px] text-gray-600 font-mono italic">Exemple d'invocation : {example}</p>
      )}
    </div>
  );
}

function zapIcon() {
  return <Zap size={16} />;
}
