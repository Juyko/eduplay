import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useTranslation } from '../utils/i18n';
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react';

export default function Auth({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        alert('Lütfen e-posta adresinize gelen doğrulama linkine tıklayın (veya doğrulama gerektirmiyorsa direkt giriş yapabilirsiniz).');
      }
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message || 'Kimlik doğrulama başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 transform rotate-3">
            <span className="text-3xl text-white font-black">E</span>
          </div>
        </div>
        
        <h2 className="text-2xl font-black text-white text-center mb-2 tracking-tight">
          {isLogin ? 'Hoş Geldiniz' : 'Hesap Oluşturun'}
        </h2>
        <p className="text-slate-400 text-center mb-8 text-sm">
          {isLogin ? 'Oyunlarınıza ve profilinize erişmek için giriş yapın.' : 'EduPlay dünyasına katılmak için ücretsiz kayıt olun.'}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-sm mb-6 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">E-posta</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white pl-10 pr-4 py-3 rounded-xl outline-none transition"
                placeholder="ornek@email.com"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Şifre</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="password" 
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white pl-10 pr-4 py-3 rounded-xl outline-none transition"
                placeholder="En az 6 karakter"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-black py-3.5 rounded-xl transition active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 mt-6"
          >
            {loading ? 'İşleniyor...' : (isLogin ? <><LogIn className="w-5 h-5"/> Giriş Yap</> : <><UserPlus className="w-5 h-5"/> Kayıt Ol</>)}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-400 hover:text-indigo-300 text-sm font-bold transition"
          >
            {isLogin ? 'Hesabınız yok mu? Kayıt olun.' : 'Zaten hesabınız var mı? Giriş yapın.'}
          </button>
        </div>
      </div>
    </div>
  );
}
