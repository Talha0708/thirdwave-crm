import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 🔥 রাউটিংয়ের জন্য এটি অ্যাড করা হয়েছে
import { AuthContext } from '../context/AuthContext';
import { Bot, Shield, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    icon: Bot,
    color: 'text-purple-400',
    title: 'Smart Auto-Reply',
    desc: '24/7 AI chatbot handles customer inquiries automatically via Facebook Messenger.',
  },
  {
    icon: Shield,
    color: 'text-blue-400',
    title: '100% Secure Access',
    desc: 'Admin-provisioned login system with JWT authentication for maximum privacy.',
  },
];

const AuthPage = () => {
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate(); // 🔥 রিডাইরেক্ট করার হুক

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // যদি ইউজার আগে থেকেই লগইন করা থাকে, তবে সরাসরি ড্যাশবোর্ডে পাঠিয়ে দেবে
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // 🔥 লগইন সাকসেস হলে ড্যাশবোর্ডে ধাক্কা দিয়ে পাঠিয়ে দেবে!
      navigate('/dashboard'); 
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials or account suspended.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col lg:flex-row border border-gray-100">

        {/* ── Left Panel ── */}
        <div className="lg:w-5/12 relative bg-gray-950 p-10 lg:p-14 flex flex-col justify-between overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute -top-32 -left-32 w-72 h-72 bg-purple-600 rounded-full blur-[96px] opacity-20 pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-72 h-72 bg-indigo-600 rounded-full blur-[96px] opacity-15 pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-gray-950 font-black text-lg leading-none">T</span>
            </div>
            <span className="text-white font-black text-lg tracking-tight">Thirdwave CRM</span>
          </div>

          {/* Headline + features */}
          <div className="relative z-10 mt-12 lg:mt-0">
            <h1 className="text-3xl lg:text-4xl font-black text-white leading-tight mb-2">
              Your Business's
            </h1>
            <h1 className="text-3xl lg:text-4xl font-black text-purple-400 leading-tight mb-10">
              Smart AI Assistant
            </h1>

            <div className="space-y-7">
              {FEATURES.map(({ icon: Icon, color, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{title}</p>
                    <p className="text-gray-400 text-xs mt-1 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer tag */}
          <p className="relative z-10 text-xs text-gray-600 font-medium mt-12 lg:mt-0">
            Powered by Gemini AI · Built for BD E-Commerce
          </p>
        </div>

        {/* ── Right Panel ── */}
        <div className="lg:w-7/12 p-10 lg:p-16 flex flex-col justify-center bg-white">
          <div className="max-w-sm w-full mx-auto">

            <div className="mb-10">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Welcome back</h2>
              <p className="text-gray-400 text-sm mt-1.5 font-medium">
                Sign in with your assigned credentials.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 flex items-start gap-3 px-4 py-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:border-gray-900 focus:bg-white transition-all"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                  Password
                </label>
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:border-gray-900 focus:bg-white transition-all"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2.5 py-4 bg-gray-950 text-white text-sm font-black rounded-xl tracking-wide hover:bg-black active:scale-[0.98] transition-all shadow-lg shadow-gray-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</>
                  : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 font-medium mt-8">
              Access is restricted to admin-provisioned accounts only.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;