import { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile 
} from 'firebase/auth';
import { auth, loginWithGoogle } from '../lib/firebase';
import { Mail, Lock, User, Chrome, ArrowRight, Loader2, TrendingUp, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show2fa, setShow2fa] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const init2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/2fa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setShow2fa(true);
        toast.success('Code 2FA envoyé (simulation terminal)');
      } else {
        throw new Error('Erreur generation 2FA');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const verifyRes = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: twoFactorCode })
      });

      if (!verifyRes.ok) {
        throw new Error('Code 2FA invalide');
      }

      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Bon retour !');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        
        const response = await fetch('/api/auth/local-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, displayName })
        });
        if (!response.ok) throw new Error('Erreur creation profil local');
        toast.success('Compte créé avec succès !');
      }
    } catch (err: any) {
      const msg = err.message || 'Une erreur est survenue';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      toast.success('Connecté avec Google');
    } catch (err: any) {
      const msg = err.message || 'Erreur de connexion Google';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
      >
        <div className="p-8 pb-6 border-b border-gray-50 flex flex-col items-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-200">
            <TrendingUp size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isLogin ? 'Bon retour' : 'Créer un compte'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isLogin ? 'Accédez à votre console revendeur' : 'Commencez à revendre vos services'}
          </p>
        </div>

        <div className="p-8 pt-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 font-medium"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={show2fa ? handleVerifyAndAuth : init2FA} className="space-y-4">
            {!show2fa ? (
              <>
                {!isLogin && (
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-blue-600 text-gray-400">
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Nom complet"
                      className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50 transition-all text-sm"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                )}
                
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-blue-600 text-gray-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50 transition-all text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-blue-600 text-gray-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="Mot de passe"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50 transition-all text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="animate-in slide-in-from-bottom-2 duration-300">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 flex items-start gap-3">
                  <ShieldAlert className="text-blue-600 shrink-0 w-5 h-5 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-blue-900">Vérification Requise</p>
                    <p className="text-xs text-blue-700 mt-0.5">Entrez le code à 6 chiffres envoyé à {email}.</p>
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-blue-600 text-gray-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Code 2FA"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50/50 transition-all text-sm tracking-[0.5em] font-bold text-center"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => setShow2fa(false)}
                  className="w-full text-center mt-4 text-xs text-gray-400 hover:text-blue-600 transition-colors uppercase font-bold tracking-widest"
                >
                  Modifier les identifiants
                </button>
              </div>
            )}

            <button
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-100 mt-6"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  {show2fa ? 'Vérifier & Continuer' : (isLogin ? 'Se connecter' : 'S\'inscrire')}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center text-gray-200">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-gray-400 font-medium tracking-widest">Ou continuer avec</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full border border-gray-200 py-3 rounded-xl hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm font-medium text-gray-700"
          >
            <Chrome size={18} className="text-red-500" />
            Google
          </button>

          <div className="mt-8 text-center text-sm text-gray-500">
            {isLogin ? "Vous n'avez pas de compte ?" : "Déjà un compte ?"}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="ml-1 text-blue-600 font-semibold hover:underline"
            >
              {isLogin ? 'S\'inscrire' : 'Se connecter'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
