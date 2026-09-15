import React, { useState } from 'react';
import { Mail, Lock, Loader, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, signInWithEmail } from '../lib/firebase';
import RotatingLogo, { RotatingLogoMedium } from './RotatingLogo';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

const ADMIN_CREDENTIALS = {
  email: 'obosathompsons@gmail.com',
  password: 'admin8594'
};

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
      // Check master admin credentials first
      if (email.trim().toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() && password === ADMIN_CREDENTIALS.password) {
        // Establish a real Firebase session so Firestore rules allow shared
        // lexicon and training writes from the admin workspace.
        try {
          await signInWithEmail(email.trim(), password);
        } catch (authError: any) {
          if (!['auth/user-not-found', 'auth/invalid-credential', 'auth/wrong-password'].includes(authError?.code)) {
            throw authError;
          }
          // Keep the existing local admin route available when this Firebase
          // project has not provisioned the admin account yet.
          console.warn('[AdminLogin] Firebase admin account is not provisioned; local admin mode is active.', authError?.code);
        }
        const adminUser = {
          username: 'admin',
          email: ADMIN_CREDENTIALS.email,
          isAdmin: true,
          isMasterAdmin: true,
          loginTime: Date.now()
        };
        const storage = rememberLogin ? localStorage : sessionStorage;
        localStorage.removeItem('lexicon_dev_user');
        sessionStorage.removeItem('lexicon_dev_user');
        storage.setItem('lexicon_dev_user', JSON.stringify(adminUser));
        localStorage.setItem('lexicon_dev_user_remembered', String(rememberLogin));
        // Reload to pick up the new state
        window.location.href = '/admin';
        return;
      }

      // Check agents database
      const q = query(
        collection(db, 'agents'),
        where('email', '==', email.trim().toLowerCase())
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const agentDoc = snapshot.docs[0];
        const agentData = agentDoc.data();

        // Verify password
        if (agentData.password === password) {
          const agentUser = {
            username: agentData.name,
            email: agentData.email,
            isAdmin: true,
            isAgent: true,
            agentRole: agentData.role,
            permissions: agentData.permissions || ['train'],
            loginTime: Date.now()
          };
          const storage = rememberLogin ? localStorage : sessionStorage;
          localStorage.removeItem('lexicon_dev_user');
          sessionStorage.removeItem('lexicon_dev_user');
          storage.setItem('lexicon_dev_user', JSON.stringify(agentUser));
          localStorage.setItem('lexicon_dev_user_remembered', String(rememberLogin));
          // Reload to pick up the new state
          window.location.href = '/admin';
          return;
        }
      }

      // No match found
      setError('Invalid email or password. Please check your credentials.');
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
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
        {/* Card */}
        <div className="bg-[#111111] border border-[#00ff88]/20 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header — 3D spinning logo */}
          <div className="bg-[#111111] px-6 py-8 text-center border-b border-white/10">
            <div className="flex flex-col items-center gap-2">
              <RotatingLogoMedium />
              <h1 className="text-2xl font-black tracking-tight text-white">BLACK <span className="text-[#00ff88]">AI</span></h1>
              <p className="text-gray-500 text-sm">Admin Access</p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberLogin}
              onChange={(e) => setRememberLogin(e.target.checked)}
              className="accent-[#00ff88]"
            />
            Remember this admin login on this browser
          </label>

          {/* Form */}
          <div className="px-6 py-10">
            <h2 className="text-3xl font-bold text-white mb-3">
              Admin & Agent Login
            </h2>
            <p className="text-white/60 text-base mb-8">
              Enter your credentials to access the training panel
            </p>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-400/30 rounded-lg flex items-center gap-3"
              >
                <AlertCircle size={24} className="text-red-600 flex-shrink-0" />
                <p className="text-base text-red-300">{error}</p>
              </motion.div>
            )}

            {/* Admin Login Form */}
            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div>
                <label className="block text-base font-semibold text-white mb-3">
                  Email
                </label>
                <div className="relative">
                  <Mail size={20} className="absolute left-4 top-4 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={isLoading}
                    autoComplete="off"
                    className="w-full pl-12 pr-4 py-3 border border-white/15 rounded-lg text-base text-white bg-black/40 placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#00ff88] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-base font-semibold text-white mb-3">
                  Password
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-4 top-4 text-white/40" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="w-full pl-12 pr-12 py-3 border border-white/15 rounded-lg text-base text-white bg-black/40 placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#00ff88] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4 text-white/40 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!email || !password || isLoading}
                className="w-full mt-8 px-6 py-4 bg-[#00ff88] text-black rounded-lg text-lg font-bold hover:bg-[#61ffb1] hover:shadow-lg hover:shadow-[#00ff88]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <Loader size={24} className="animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  'Access Training Panel'
                )}
              </button>
            </form>



            {/* Back Button */}
            <button
              onClick={() => navigate('/')}
              className="w-full mt-6 px-6 py-3 border border-white/20 text-white/70 rounded-xl text-base font-semibold hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={20} />
              Back to Home
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white/80 text-base">
            © 2026 BLACK AI. All rights reserved.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
