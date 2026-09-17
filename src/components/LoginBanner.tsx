/**
 * LoginBanner - Gentle reminder for guest users to sign in
 * Shows value of authentication without blocking chat access
 */

import React, { useState, useEffect } from 'react';
import { X, LogIn, Save, History, Cloud } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface LoginBannerProps {
  messageCount: number;
  onDismiss: () => void;
}

export default function LoginBanner({ messageCount, onDismiss }: LoginBannerProps) {
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if user previously dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('login_banner_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('login_banner_dismissed', 'true');
    onDismiss();
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  // Don't show if dismissed or too few messages
  if (isDismissed || messageCount < 3) {
    return null;
  }

  // Determine urgency level based on message count
  const isUrgent = messageCount >= 10;
  const isWarning = messageCount >= 7;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`relative w-full border-b ${
          isUrgent
            ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/40'
            : isWarning
            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/40'
            : 'bg-gradient-to-r from-[#00ff88]/10 to-cyan-500/10 border-[#00ff88]/30'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Icon + Message */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {isUrgent ? (
                <History className="h-5 w-5 text-orange-400 flex-shrink-0 animate-pulse" />
              ) : (
                <Cloud className="h-5 w-5 text-[#00ff88] flex-shrink-0" />
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {isUrgent ? (
                    <>
                      <span className="text-orange-400">⚠️ {messageCount} messages</span> - You'll lose this conversation when you close the tab!
                    </>
                  ) : isWarning ? (
                    <>
                      <span className="text-yellow-400">💡 Having a good conversation?</span> Sign in to save it
                    </>
                  ) : (
                    <>
                      <span className="text-[#00ff88]">✨ Tip:</span> Sign in to save your conversations
                    </>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isUrgent ? (
                    'Sign in now to keep your chat history, lessons, and progress across devices'
                  ) : (
                    'Keep your chat history, Personal Professor lessons, and progress across devices'
                  )}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleSignIn}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  isUrgent
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : isWarning
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                    : 'bg-[#00ff88] hover:bg-[#00dd77] text-black'
                }`}
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>

              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Progress indicator */}
          {messageCount >= 5 && (
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
              <Save className="h-3 w-3" />
              <span>
                {messageCount >= 10 ? (
                  <span className="text-orange-400 font-medium">{messageCount} messages will be lost without login</span>
                ) : (
                  <span>{messageCount} messages in this session</span>
                )}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
