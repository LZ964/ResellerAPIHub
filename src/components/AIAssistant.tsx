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

  const clearHistory = () => {
    setHistory([]);
    toast.success('Conversation réinitialisée');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-4xl mx-auto bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-purple-600">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 leading-none">Assistant IA ResellerHub</h2>
            <p className="text-sm text-gray-500 mt-1">Votre partenaire pour la pérennité de votre entreprise</p>
          </div>
        </div>
        <button 
          onClick={clearHistory}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          title="Nettoyer la conversation"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth"
      >
        {history.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center text-gray-300">
              <MessageSquare size={40} />
            </div>
            <div>
              <p className="text-gray-900 font-bold text-lg">Comment puis-je vous aider aujourd'hui ?</p>
              <p className="text-gray-500 max-w-sm mx-auto mt-2 text-sm leading-relaxed">
                Posez-moi des questions sur les domaines, les emails professionels, ou demandez-moi de vérifier la disponibilité d'un nom.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-md w-full pt-4">
              <button onClick={() => setInput("Vérifie si 'techvision.com' est disponible")} className="px-4 py-3 rounded-2xl bg-white border border-gray-100 text-gray-600 text-sm hover:border-purple-200 hover:bg-purple-50 transition-all text-left">
                Vérifier un domaine
              </button>
              <button onClick={() => setInput("Conseille-moi sur la meilleure extension pour un SaaS")} className="px-4 py-3 rounded-2xl bg-white border border-gray-100 text-gray-600 text-sm hover:border-purple-200 hover:bg-purple-50 transition-all text-left">
                Conseils extension
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {history.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-gray-900 text-white' : 'bg-purple-100 text-purple-600'
              }`}>
                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-5 py-4 ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-100' 
                  : 'bg-gray-50 text-gray-800 rounded-tl-none border border-gray-100'
              }`}>
                <div className="markdown-body">
                  <Markdown>{msg.parts[0].text}</Markdown>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div className="bg-gray-50 px-5 py-4 rounded-2xl rounded-tl-none border border-gray-100 flex items-center gap-3">
              <Loader2 className="animate-spin text-purple-500" size={18} />
              <span className="text-sm text-gray-500 font-medium">L'IA réfléchit...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-8 border-t border-gray-100 bg-gray-50/50">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Écrivez votre message ici..."
            className="w-full pl-6 pr-16 py-5 rounded-2xl bg-white border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm shadow-gray-100 disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-3 top-3 w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition-all disabled:opacity-50 disabled:hover:bg-purple-600 shadow-md shadow-purple-100"
          >
            <Send size={20} />
          </button>
        </form>
        <p className="text-center text-[10px] text-gray-400 mt-4 uppercase tracking-widest font-semibold">
          Propulsé par Gemini 3 Flash Preview & Paymenter API
        </p>
      </div>
    </div>
  );
}
