import { useState } from 'react';
import { Play, Code, AlertCircle, CheckCircle2, Loader2, ChevronDown, ChevronRight, Copy, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import toast from 'react-hot-toast';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  category: string;
  parameters: Parameter[];
}

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

const endpoints: ApiEndpoint[] = [
  {
    method: 'POST',
    path: '/api/auth/local-signup',
    description: 'Enregistre un nouvel utilisateur.',
    category: 'Authentication',
    parameters: [
      { name: 'email', type: 'string', required: true, description: 'Adresse email de l\'utilisateur' },
      { name: 'password', type: 'string', required: true, description: 'Mot de passe' },
      { name: 'name', type: 'string', required: true, description: 'Nom complet' }
    ]
  },
  {
    method: 'POST',
    path: '/api/auth/logout',
    description: 'Déconnecte l\'utilisateur courant.',
    category: 'Authentication',
    parameters: []
  },
  {
    method: 'POST',
    path: '/api/keys',
    description: 'Génère une nouvelle clef API.',
    category: 'Account',
    parameters: [
      { name: 'name', type: 'string', required: true, description: 'Nom de la clef' }
    ]
  },
  {
    method: 'POST',
    path: '/api/paymenter/domains/search',
    description: 'Vérifie la disponibilité d\'un domaine.',
    category: 'Domains',
    parameters: [
      { name: 'domain', type: 'string', required: true, description: 'Nom de domaine' },
      { name: 'tld', type: 'string', required: true, description: 'Extension (ex: .com)' }
    ]
  },
  {
    method: 'POST',
    path: '/api/paymenter/domains/register',
    description: 'Enregistre un nouveau nom de domaine.',
    category: 'Domains',
    parameters: [
      { name: 'domain', type: 'string', required: true, description: 'Domaine complet' },
      { name: 'period', type: 'number', required: true, description: 'Durée en années' }
    ]
  },
  {
    method: 'POST',
    path: '/api/domains/:domain/dns',
    description: 'Ajoute un enregistrement DNS.',
    category: 'Domains',
    parameters: [
      { name: 'domain', type: 'string', required: true, description: 'Dans l\'URL (remplacer :domain)' },
      { name: 'type', type: 'string', required: true, description: 'Type DNS (A, CNAME, etc.)' },
      { name: 'name', type: 'string', required: true, description: 'Nom de l\'enregistrement' },
      { name: 'content', type: 'string', required: true, description: 'Valeur de l\'enregistrement' }
    ]
  },
  {
    method: 'POST',
    path: '/api/paymenter/ssl/order',
    description: 'Commande un certificat SSL.',
    category: 'SSL',
    parameters: [
      { name: 'domain', type: 'string', required: true, description: 'Nom de domaine' },
      { name: 'type', type: 'string', required: true, description: 'Type (DV, EV, WILDCARD)' }
    ]
  },
  {
    method: 'POST',
    path: '/api/ai/chat',
    description: 'Pose une question à l\'assistant IA.',
    category: 'AI',
    parameters: [
      { name: 'messages', type: 'array', required: true, description: 'Tableau des messages (ex: [{"role":"user","content":"Bonjour"}])' }
    ]
  }
];

export default function ApiExplorer() {
  const [expandedEndpoints, setExpandedEndpoints] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});
  const [responses, setResponses] = useState<Record<string, { status: number, data: any }>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const toggleEndpoint = (id: string) => {
    setExpandedEndpoints(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const handleInputChange = (endpointId: string, param: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [endpointId]: {
        ...(prev[endpointId] || {}),
        [param]: value
      }
    }));
  };

  const executeRequest = async (endpoint: ApiEndpoint) => {
    const endpointId = `${endpoint.method}-${endpoint.path}`;
    setLoading(prev => ({ ...prev, [endpointId]: true }));
    
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';
      
      let finalPath = endpoint.path;
      const bodyParams: Record<string, any> = {};
      
      const currentFormData = formData[endpointId] || {};
      
      endpoint.parameters.forEach(param => {
        if (param.name === 'domain' && finalPath.includes(':domain')) {
          finalPath = finalPath.replace(':domain', currentFormData[param.name] || '');
        } else if (param.type === 'array' || param.type === 'object') {
            try {
                bodyParams[param.name] = JSON.parse(currentFormData[param.name] || '[]');
            } catch (e) {
                bodyParams[param.name] = currentFormData[param.name];
            }
        } else if (param.type === 'number') {
            bodyParams[param.name] = Number(currentFormData[param.name]);
        } else {
            bodyParams[param.name] = currentFormData[param.name];
        }
      });
      
      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      };

      if (endpoint.method !== 'GET' && Object.keys(bodyParams).length > 0) {
        options.body = JSON.stringify(bodyParams);
      }

      const response = await fetch(finalPath, options);
      const data = await response.json();
      
      setResponses(prev => ({
        ...prev,
        [endpointId]: {
          status: response.status,
          data
        }
      }));
      
    } catch (error: any) {
      setResponses(prev => ({
        ...prev,
        [endpointId]: {
          status: 0,
          data: { error: error.message }
        }
      }));
      toast.error('Erreur de requête');
    } finally {
      setLoading(prev => ({ ...prev, [endpointId]: false }));
    }
  };

  const getMethodColor = (method: string) => {
    switch(method) {
      case 'GET': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'POST': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'PUT': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const categories = Array.from(new Set(endpoints.map(e => e.category)));

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-gray-900 uppercase tracking-tighter text-2xl flex items-center gap-3">
                <Terminal className="text-oracle-red" />
                API Explorer (Swagger UI)
              </h3>
              <p className="text-gray-500 text-sm mt-2">Testez nos endpoints en direct depuis votre navigateur.</p>
            </div>
            <div className="text-[10px] font-mono text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                BASE_URL: https://api.votredomaine.com
            </div>
        </div>

        <div className="space-y-8 mt-8">
          {categories.map(category => (
            <div key={category} className="space-y-4">
              <h4 className="text-lg font-bold text-gray-900 uppercase border-b border-gray-100 pb-2">{category}</h4>
              
              <div className="space-y-3">
                {endpoints.filter(e => e.category === category).map(endpoint => {
                  const endpointId = `${endpoint.method}-${endpoint.path}`;
                  const isExpanded = expandedEndpoints.includes(endpointId);
                  const isLoad = loading[endpointId];
                  const res = responses[endpointId];

                  return (
                    <div key={endpointId} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                      <button 
                        onClick={() => toggleEndpoint(endpointId)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                      >
                        <span className={`px-3 py-1 text-xs font-black rounded border ${getMethodColor(endpoint.method)}`}>
                          {endpoint.method}
                        </span>
                        <span className="font-mono text-sm font-bold text-gray-700">{endpoint.path}</span>
                        <span className="text-xs text-gray-400 flex-1 text-left hidden md:block truncate">{endpoint.description}</span>
                        {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-gray-50 border-t border-gray-200 p-4 md:p-6"
                          >
                            <div className="mb-6 mb-4 hidden md:block">
                                <p className="text-sm text-gray-600 bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                                    {endpoint.description}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              {/* Form Parameters */}
                              <div className="space-y-4">
                                <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 border-b border-gray-200 pb-2">Paramètres</h5>
                                {endpoint.parameters.length === 0 ? (
                                  <p className="text-xs text-gray-400 italic">Aucun paramètre requis.</p>
                                ) : (
                                  endpoint.parameters.map(param => (
                                    <div key={param.name} className="space-y-1">
                                      <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
                                        {param.name}
                                        {param.required && <span className="text-oracle-red text-[10px]">*requis</span>}
                                        <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1 py-0.5 rounded">{param.type}</span>
                                      </label>
                                      {param.type === 'array' || param.type === 'object' ? (
                                        <textarea 
                                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-oracle-red focus:border-oracle-red outline-none min-h-[80px]"
                                          placeholder={param.description}
                                          value={formData[endpointId]?.[param.name] || ''}
                                          onChange={e => handleInputChange(endpointId, param.name, e.target.value)}
                                        />
                                      ) : (
                                        <input 
                                          type={param.type === 'number' ? 'number' : 'text'}
                                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-oracle-red focus:border-oracle-red outline-none"
                                          placeholder={param.description}
                                          value={formData[endpointId]?.[param.name] || ''}
                                          onChange={e => handleInputChange(endpointId, param.name, e.target.value)}
                                        />
                                      )}
                                    </div>
                                  ))
                                )}

                                <button 
                                  onClick={() => executeRequest(endpoint)}
                                  disabled={isLoad}
                                  className="w-full mt-6 bg-gray-900 hover:bg-black text-white text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                  {isLoad ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                  {isLoad ? 'Exécution...' : 'Exécuter la requête'}
                                </button>
                              </div>

                              {/* Response Viewer */}
                              <div className="space-y-4">
                                <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 border-b border-gray-200 pb-2 flex justify-between">
                                  Réponse
                                  {res && (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${res.status >= 200 && res.status < 300 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                      Status: {res.status}
                                    </span>
                                  )}
                                </h5>
                                
                                <div className="bg-[#0D1117] rounded-xl border border-gray-800 overflow-hidden h-[300px] flex flex-col relative">
                                  {res ? (
                                    <>
                                        <button 
                                            className="absolute top-2 right-2 text-gray-400 hover:text-white p-1"
                                            onClick={() => {
                                                navigator.clipboard.writeText(JSON.stringify(res.data, null, 2));
                                                toast.success('Réponse copiée');
                                            }}
                                        >
                                            <Copy size={14} />
                                        </button>
                                        <pre className="p-4 text-xs font-mono text-gray-300 overflow-auto flex-1">
                                            {JSON.stringify(res.data, null, 2)}
                                        </pre>
                                    </>
                                  ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-600 p-6 text-center">
                                      <Code size={32} className="mb-2 opacity-50" />
                                      <span className="text-xs">Cliquez sur Exécuter pour voir le résultat de l'API.</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
