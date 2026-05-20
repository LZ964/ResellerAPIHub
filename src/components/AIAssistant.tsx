import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Sparkles, MessageSquare, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import toast from 'react-hot-toast';
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export default function AIAssistant() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/ai/agent', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ message: 'RELOAD_CONTEXT', history: [] }),
        });
        if (response.ok) {
          const data = await response.json();
          // Filter out the internal RELOAD_CONTEXT message if it appears
          const filtered = data.history.filter((m: any) => m.content !== 'RELOAD_CONTEXT' && m.parts?.[0]?.text !== 'RELOAD_CONTEXT');
          setHistory(filtered);
        }
      } catch (err) {
        console.warn("History reload failed");
      }
    }
    loadHistory();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMessage, history }),
      });

      if (!response.ok) throw new Error('Erreur de communication avec l\'assistant');
      
      const data = await response.json();
      setHistory(data.history || []);
    } catch (err: any) {
      toast.error(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm("Effacer définitivement la mémoire de l'IA ?")) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch('/api/ai/memory', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setHistory([]);
      toast.success('Mémoire réinitialisée');
    } catch (err) {
      toast.error("Échec de la réinitialisation");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-5xl mx-auto bg-[#050505] border border-gray-800 rounded-sm overflow-hidden font-mono shadow-2xl relative">
      {/* Terminal CRT Overlay Effect */}
      <div className="crt-overlay" />
      <div className="crt-scanline" />
      
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-800 flex items-center justify-between bg-black relative z-20">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-oracle-red/10 rounded-sm border border-oracle-red/30 flex items-center justify-center text-oracle-red">
            <Bot size={16} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-[10px] font-black text-white leading-none tracking-[0.2em] uppercase italic">Neural_Link : Instance_Gate</h2>
            <p className="text-[7px] text-gray-600 mt-1 uppercase tracking-widest font-black">Connection: Secure Protocol 2.4.0</p>
          </div>
        </div>
        <button 
          onClick={clearHistory}
          className="p-1.5 text-gray-800 hover:text-oracle-red hover:bg-oracle-red/10 rounded transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin scrollbar-thumb-gray-900 selection:bg-oracle-red selection:text-white relative z-20"
      >
        {history.length === 0 && (
          <div className="flex flex-col items-start justify-start p-4 border border-dashed border-white/5 text-gray-700 text-[10px] gap-2">
            <p className="font-black underline decoration-oracle-red/20 uppercase tracking-[0.2em] text-oracle-red">SYSTEM INITIALIZED...</p>
            <p>[OK] Memory bank synchronized.</p>
            <p>[OK] Neural pathways active.</p>
            <p>[SYSTEM] Awaiting voice command input...</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {history.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-3 text-[8px] uppercase font-black tracking-[0.3em] opacity-30">
                {msg.role === 'user' ? (
                  <><span>Authorized_User</span> <div className="w-1 h-1 bg-white rounded-full" /></>
                ) : (
                  <><div className="w-1 h-1 bg-oracle-red rounded-full" /> <span>Protocol_Sovereign</span></>
                )}
              </div>
              <div className={`max-w-[85%] px-3 py-2 leading-relaxed text-[13px] ${
                msg.role === 'user' 
                  ? 'text-gray-400 border-r border-white/10 pr-4 italic text-right' 
                  : 'text-white border-l border-oracle-red/40 pl-4'
              }`}>
                <div className="markdown-body prose prose-invert prose-xs max-w-none">
                  <Markdown>{msg.role === 'user' 
                    ? (msg.parts?.[0]?.text || (msg as any).content) 
                    : (msg.parts?.[0]?.text || (msg as any).content)}</Markdown>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex items-center gap-3 text-oracle-red animate-pulse">
            <span className="text-[10px] font-black">▶</span>
            <span className="text-[9px] font-black uppercase tracking-[0.4em]">Analyzing neural patterns...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-900 bg-black relative z-20">
        <form onSubmit={handleSend} className="flex gap-4 items-center">
          <div className="text-oracle-red flex items-center text-xs font-black opacity-40">$</div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Command input..."
            className="flex-1 bg-transparent border-none text-white text-[13px] outline-none placeholder:text-gray-900 font-mono focus:ring-0"
            autoFocus
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-700 hover:text-oracle-red transition-all disabled:opacity-20"
          >
            [EXECUTE]
          </button>
        </form>
      </div>
    </div>
  );
}
