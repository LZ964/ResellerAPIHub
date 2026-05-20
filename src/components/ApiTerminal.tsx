import { useState, useRef, useEffect } from 'react';
import { Terminal, X, Minimize2, Maximize2, Command, ShieldCheck, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';

interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  ip: string;
  fingerprint: string;
  userAgent: string;
  email: string;
}

interface ApiTerminalProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export default function ApiTerminal({ isOpen, onOpen, onClose }: ApiTerminalProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [history, setHistory] = useState<string[]>(['Sovereign Cloud Console [Version 3.4.1]', '(c) 2026 ResellerHub Canada. Tous droits réservés.', 'Tapez "help" pour voir les commandes "api-control".']);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Simple fingerprint generation
  const getFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'standard_client_v1';
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125,1,62,20);
    ctx.fillStyle = "#069";
    ctx.fillText("reseller_hub_v3", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("reseller_hub_v3", 4, 17);
    return btoa(canvas.toDataURL()).slice(-20);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const execCommand = async (fullCommand: string) => {
    const parts = fullCommand.trim().split(' ');
    const base = parts[0];
    const cmd = parts[1];
    const args = parts.slice(2);

    setHistory(prev => [...prev, `\n> ${fullCommand}`]);

    if (base !== 'api-control') {
      if (base === 'clear') {
        setHistory([]);
        return;
      }
      if (base === 'help' || base === '?') {
        setHistory(prev => [...prev, 'Utilisez "api-control <command>" pour interagir avec l\'infrastructure.', 'Commandes: register, search, dns:add, logs:show, whoami']);
        return;
      }
      setHistory(prev => [...prev, `Commande non reconnue: ${base}. Essayez "api-control help".`]);
      return;
    }

    if (!cmd) {
      setHistory(prev => [...prev, 'Erreur: Commande api-control manquante. Tapez "api-control help".']);
      return;
    }

    if (cmd === 'logs:show') {
      setIsLoading(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const logs: LogEntry[] = await res.json();
        const logLines = logs.map(l => 
          `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.action.padEnd(15)} | IP: ${l.ip} | FP: ${l.fingerprint.slice(0,8)}...`
        );
        setHistory(prev => [...prev, ...logLines]);
      } catch (err) {
        setHistory(prev => [...prev, 'Erreur lors de la récupération des logs.']);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (cmd === 'whoami') {
      const user = auth.currentUser;
      setHistory(prev => [...prev, `ID Utilisateur: ${user?.uid}`, `Email: ${user?.email}`, `Status: AUTHENTICATED_PRIVILEGED`, `Fingerprint: ${getFingerprint()}`]);
      return;
    }

    // Proxy other commands to backend
    setIsLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-fingerprint': getFingerprint()
        },
        body: JSON.stringify({ command: cmd, args })
      });
      const data = await res.json();
      if (data.error) {
        setHistory(prev => [...prev, `Erreur: ${data.error}`]);
      } else {
        setHistory(prev => [...prev, data.output]);
        if (data.data && typeof data.data === 'object') {
          setHistory(prev => [...prev, JSON.stringify(data.data, null, 2)]);
        }
      }
    } catch (err) {
      setHistory(prev => [...prev, 'Erreur fatale de connexion à l\'API.']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const cmd = input;
    setInput('');
    execCommand(cmd);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0,
          height: isMinimized ? '44px' : '450px',
          width: isMinimized ? '250px' : '650px'
        }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed bottom-6 right-6 bg-[#0B1A2F]/95 backdrop-blur-md border border-[#1A2E47] rounded-xl shadow-2xl flex flex-col overflow-hidden z-[1000] font-mono text-[11px]"
      >
        {/* Drag/Header */}
        <div className="h-11 bg-[#0F213A] border-b border-[#1A2E47] flex items-center justify-between px-4 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <Command size={14} className="text-blue-400" />
            <span className="text-gray-300 font-bold tracking-tight">api-control:souverain@shell</span>
            {isLoading && <Activity size={12} className="animate-pulse text-emerald-400 ml-2" />}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMinimized(!isMinimized)} className="text-gray-500 hover:text-white cursor-pointer transition-colors">
              {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-red-400 cursor-pointer transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* History Canvas */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 text-emerald-500/90 space-y-1.5 scrollbar-thin scrollbar-thumb-blue-900"
            >
              {history.map((line, i) => (
                <pre key={i} className="whitespace-pre-wrap leading-relaxed">{line}</pre>
              ))}
              {isLoading && <div className="animate-pulse text-blue-400">Exécution de la requête API...</div>}
            </div>

            {/* Input Line */}
            <form onSubmit={handleSubmit} className="p-3 bg-[#081324] border-t border-[#1A2E47] flex items-center gap-2">
              <span className="text-blue-400 font-bold">reseller@hub:~$</span>
              <input 
                ref={inputRef}
                autoFocus
                type="text"
                className="flex-1 bg-transparent border-none outline-none text-gray-200"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Entrez une commande..."
              />
            </form>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
