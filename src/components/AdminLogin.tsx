import React, { useState } from 'react';
import { Mail, Lock, Loader, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import RotatingLogo, { RotatingLogoMedium } from './RotatingLogo';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(false);
  const navigate = useNavigate();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Call Vercel API — no Firebase needed, works on any network
      const resp = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
        signal: AbortSignal.timeout(15000),
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Login failed. Please check your credentials.');
      }

      // Store session
      const storage = rememberLogin ? localStorage : sessionStorage;
      localStorage.removeItem('lexicon_dev_user');
      sessionStorage.removeItem('lexicon_dev_user');
      storage.setItem('lexicon_dev_user', JSON.stringify({
        ...data.user,
        username: 'admin',
        loginTime: Date.now(),
      }));
      localStorage.setItem('lexicon_dev_user_remembered', String(rememberLogin));

      // Navigate to admin panel
      window.location.href = '/admin';

    } catch (err: any) {
      let msg = err.message || 'Login failed. Please try again.';
      if (err.name === 'TimeoutError' || msg.includes('timeout') || msg.includes('network')) {
        msg = 'Connection timeout. Please check your internet connection and try again.';
      }
      setError(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0b0b0b] to-[#151515] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#111111] border border-[#00ff88]/20 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#111111] px-6 py-8 text-center border-b border-white/10">
            <div className="flex flex-col items-center gap-2">
              <RotatingLogoMedium />
              <h1 className="text-2xl font-black tracking-tight text-white">BLACK <span className="text-[#00ff88]">AI</span></h1>
              <p className="text-gray-500 text-sm">Admin Access</p>
            </div>
          </div>

          {/* Remember me */}
          <div className="px-6 pt-5">
            <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberLogin}
                onChange={(e) => setRememberLogin(e.target.checked)}
                className="accent-[#00ff88]"
              />
              Remember this admin login on this browser
            </label>
          </div>

          {/* Form */}
          <div className="px-6 py-8">
            <h2 className="text-3xl font-bold text-white mb-3">Admin & Agent Login</h2>
            <p className="text-white/60 text-base mb-8">
              Enter your credentials to access the training panel
            </p>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-400/30 rounded-lg flex items-start gap-3"
              >
                <AlertCircle size={22} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300 leading-relaxed">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div>
                <label className="block text-base font-semibold text-white mb-3">Email</label>
                <div className="relative">
                  <Mail size={20} className="absolute left-4 top-3.5 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your admin email"
                    required
                    disabled={isLoading}
                    autoComplete="username"
                    className="w-full pl-12 pr-4 py-3 border border-white/15 rounded-lg text-base text-white bg-black/40 placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#00ff88] focus:border-transparent disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-base font-semibold text-white mb-3">Password</label>
                <div className="relative">
                  <Lock size={20} className="absolute left-4 top-3.5 text-white/40" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="w-full pl-12 pr-12 py-3 border border-white/15 rounded-lg text-base text-white bg-black/40 placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#00ff88] focus:border-transparent disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-white/40 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!email || !password || isLoading}
                className="w-full mt-6 px-6 py-4 bg-[#00ff88] text-black rounded-lg text-lg font-bold hover:bg-[#61ffb1] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <Loader size={22} className="animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  'Access Training Panel'
                )}
              </button>
            </form>

            <button
              onClick={() => navigate('/')}
              className="w-full mt-4 px-6 py-3 border border-white/20 text-white/70 rounded-xl text-base font-semibold hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={20} />
              Back to Home
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-white/40 text-sm">© 2026 BLACK AI. All rights reserved.</p>
        </div>
      </motion.div>
    </div>
  );
}
