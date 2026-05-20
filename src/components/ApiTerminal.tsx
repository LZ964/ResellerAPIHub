import { useState, useRef, useEffect } from 'react';
import { Terminal, X, Minimize2, Maximize2, Command, ShieldCheck, Activity, Sparkles } from 'lucide-react';
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

const THEMES = {
  classic: { bg: 'bg-[#0B1A2F]/95', header: 'bg-[#0F213A]', text: 'text-emerald-500/90', prompt: 'text-blue-400' },
  gnome: { bg: 'bg-[#171421]/98', header: 'bg-[#241f31]', text: 'text-gray-100', prompt: 'text-[#4e9a06]' },
  solarized: { bg: 'bg-[#002b36]/95', header: 'bg-[#073642]', text: 'text-[#839496]', prompt: 'text-[#b58900]' },
  matrix: { bg: 'bg-black/95', header: 'bg-black border-emerald-900', text: 'text-[#00FF41]', prompt: 'text-[#00FF41] font-bold' }
};

export default function ApiTerminal({ isOpen, onOpen, onClose }: ApiTerminalProps) {
  const [theme, setTheme] = useState<keyof typeof THEMES>('classic');
  const [isMinimized, setIsMinimized] = useState(false);
  const [history, setHistory] = useState<string[]>(['Sovereign Cloud Console [Version 3.4.2]', 'Tapez "help" pour voir les commandes "api-control".']);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFingerprint = () => 'env_v3_browser';

  const renderLine = (line: string, i: number) => {
    const trimmed = line.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const obj = JSON.parse(line);
        const formatted = JSON.stringify(obj, null, 2);
        return (
          <div key={i} className="my-3 p-3 bg-black/30 rounded-xl border border-white/5 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-2 mb-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">
              <Activity size={10} />
              <span>Données API (JSON)</span>
            </div>
            <pre className="whitespace-pre-wrap leading-relaxed text-[10px]">
              {formatted.split('\n').map((l, idx) => {
                const isKey = l.includes('":');
                const isStringVal = !isKey && l.includes('"');
                const isBoolOrNumber = !isKey && !isStringVal && /[0-9]|true|false|null/.test(l);
                
                let color = 'text-gray-400';
                if (isKey) color = 'text-blue-400 font-bold';
                else if (isStringVal) color = 'text-emerald-400';
                else if (isBoolOrNumber) color = 'text-amber-400';
                
                return <div key={idx} className={color}>{l}</div>;
              })}
            </pre>
          </div>
        );
      } catch (e) {
        return <pre key={i} className="whitespace-pre-wrap leading-relaxed">{line}</pre>;
      }
    }
    return <pre key={i} className="whitespace-pre-wrap leading-relaxed">{line}</pre>;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const execCommand = async (fullCommand: string, isBatch = false) => {
    const parts = fullCommand.trim().split(' ');
    const base = parts[0];
    const cmd = parts[1];
    const args = parts.slice(2);

    if (!isBatch) setHistory(prev => [...prev, `\n> ${fullCommand}`]);

    const baseLower = base.toLowerCase();

    if (baseLower === 'theme') {
      const newTheme = args[0] as keyof typeof THEMES;
      if (THEMES[newTheme]) {
        setTheme(newTheme);
        setHistory(prev => [...prev, `Thème changé pour [${newTheme}]`]);
      } else {
        setHistory(prev => [...prev, `Thèmes disponibles: classic, gnome, solarized, matrix`]);
      }
      return;
    }

    if (baseLower === 'help' || baseLower === '?') {
      setHistory(prev => [
        ...prev, 
        '--- CONSOLE D\'AIDE ---',
        'Commandes Globales:',
        '  api-control <cmd>   - Commandes d\'infrastructure (voir "api-control help")',
        '  theme <nom>         - Change l\'apparence (classic, gnome, matrix, solarized)',
        '  clear               - Efface l\'historique',
        '  help                - Affiche ce message'
      ]);
      return;
    }

    if (baseLower === 'clear') {
      setHistory(['Sovereign Cloud Console [Version 3.4.2]', 'Effacé.']);
      return;
    }

    if (baseLower !== 'api-control') {
      setHistory(prev => [...prev, `Commande non reconnue: ${base}. Tapez "help" pour l'assistance.`]);
      return;
    }

    if (!cmd) {
      setHistory(prev => [...prev, 'Erreur: Commande api-control manquante.']);
      return;
    }

    setIsLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ command: cmd, args })
      });
      const data = await res.json();
      if (data.error) {
        setHistory(prev => [...prev, `Erreur: ${data.error}`]);
      } else {
        setHistory(prev => [...prev, data.output]);
        if (data.data) {
          setHistory(prev => [...prev, JSON.stringify(data.data)]);
        }
        window.dispatchEvent(new CustomEvent('app-state-update'));
      }
    } catch (err) {
      setHistory(prev => [...prev, 'Erreur fatale de connexion à l\'API.']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setHistory(prev => [...prev, `\n--- ENVOI BATCH: ${file.name} ---`]);
      setIsLoading(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/terminal/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ commands: content })
        });
        const data = await res.json();
        setHistory(prev => [...prev, data.output || 'Batch exécuté sans sortie.']);
      } catch (err) {
        setHistory(prev => [...prev, 'Erreur lors de l\'exécution du batch.']);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const currentTheme = THEMES[theme];
  
  const handleTerminalClick = () => {
    inputRef.current?.focus();
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
          height: isMinimized ? '44px' : '480px',
          width: isMinimized ? '320px' : '750px'
        }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => { e.stopPropagation(); handleTerminalClick(); }}
        className={`fixed bottom-6 right-6 ${currentTheme.bg} backdrop-blur-md border-2 border-[#1A2E47] rounded-xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden z-[1000] font-mono text-[11px] cursor-text transition-all`}
      >
        {/* Drag/Header */}
        <div className={`h-11 ${currentTheme.header} border-b border-[#1A2E47] flex items-center justify-between px-4 shrink-0 select-none`}>
          <div className="flex items-center gap-2">
            <Command size={14} className="text-blue-400" />
            <span className="text-gray-300 font-bold tracking-tight uppercase tracking-widest text-[9px]">api-control:souverain@shell</span>
            {isLoading && <Activity size={12} className="animate-pulse text-emerald-400 ml-2" />}
          </div>
          <div className="flex items-center gap-3">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt" />
            <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="text-gray-500 hover:text-white transition-colors cursor-pointer" title="Batch Upload .txt">
              <Sparkles size={14} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="text-gray-500 hover:text-white cursor-pointer transition-colors">
              {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-gray-500 hover:text-red-400 cursor-pointer transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* History Canvas */}
            <div 
              ref={scrollRef}
              className={`flex-1 overflow-y-auto p-5 ${currentTheme.text} space-y-2 scrollbar-thin scrollbar-thumb-blue-900 selection:bg-emerald-500/30`}
              onClick={handleTerminalClick}
            >
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                {history.map((line, i) => renderLine(line, i))}
              </div>
              {isLoading && <div className="animate-pulse text-emerald-400 mt-2 font-bold select-none">&gt;_ TRAITEMENT API...</div>}
              
              {/* Inline Input Line */}
              <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-4 border-t border-white/5 pb-32">
                <span className={`${currentTheme.prompt} shrink-0 select-none`}>reseller@hub[root]:~$</span>
                <input 
                  ref={inputRef}
                  autoFocus
                  type="text"
                  className="flex-1 bg-transparent border-none outline-none text-emerald-400 p-0 m-0 focus:ring-0 font-mono caret-emerald-400 font-bold"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder=""
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </form>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
