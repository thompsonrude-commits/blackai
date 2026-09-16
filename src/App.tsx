import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signOut } from './lib/firebase';
import { Globe, BookOpen, Brain, Languages, LogOut, Database, GraduationCap, Users, Library, Home, Settings, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SearchLanguage from './components/SearchLanguage';
import LanguageExplorer from './components/LanguageExplorer';
import AdminRepository from './components/AdminRepository';
import AdminTraining from './components/AdminTraining';
import SmartAIPaste from './components/SmartAIPaste';
import URLExtract from './components/URLExtract';
import AgentManagement from './components/AgentManagement';
import TeamManagement from './components/TeamManagement';
import LanguagesMenu from './components/LanguagesMenu';
import AfricanLanguages from './components/AfricanLanguages';
import AfricanLanguagePage from './components/AfricanLanguagePage';
import Utilities from './components/Utilities';
import Profile from './components/Profile';
import GeneralAssistant from './components/GeneralAssistant';
import SuperEcosystem from './components/SuperEcosystem';
import AdminLogin from './components/AdminLogin';
import AdminPage from './components/AdminPage';
import HomePage from './components/HomePage';
import UserLibrary from './components/UserLibrary';
import MinimalSidebar from './components/MinimalSidebar';
import { PlatformStatus } from './components/PlatformStatus';
import { NIGERIAN_LANGUAGES } from './lib/nigerianLanguages';
import { trackUserLogin } from './lib/analyticsService';

const ADMIN_EMAIL = 'obosathompsons@gmail.com';

function getSavedDeveloperUser(): any {
  try {
    const saved = sessionStorage.getItem('lexicon_dev_user')
      || (localStorage.getItem('lexicon_dev_user_remembered') === 'true'
        ? localStorage.getItem('lexicon_dev_user')
        : null);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

// Build a flat map of languageId -> languageName from nigerianLanguages
const LANGUAGE_ID_TO_NAME: Record<string, string> = {};
NIGERIAN_LANGUAGES.forEach(region => {
  region.languages.forEach(lang => {
    LANGUAGE_ID_TO_NAME[lang.id] = lang.name;
  });
});

// ΓöÇΓöÇ Language Page wrapper ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function LanguagePage({ user, isAdmin }: { user: User | null; isAdmin: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Extract language id from path e.g. /language/edo -> edo
  const langId = location.pathname.split('/').pop() || '';
  const langName = LANGUAGE_ID_TO_NAME[langId];

  if (!langName) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-2xl font-serif text-[#00ff88] mb-2">Language not found</p>
          <p className="text-sm text-white/60">The language "{langId}" is not in our database yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {isAdmin && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#00ff88]/20 bg-black/90 px-4 py-3 backdrop-blur-sm">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Go back to the previous admin page"
          >
            <ArrowLeft className="h-4 w-4 text-[#00ff88]" />
            Back
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-2 rounded-lg border border-[#00ff88]/30 bg-[#00ff88]/10 px-3 py-2 text-sm font-medium text-[#00ff88]"
          >
            <Settings className="h-4 w-4" />
            Admin Panel
          </button>
        </div>
      )}
      <LanguageExplorer
        languageName={langName}
        currentUser={user}
        isAdmin={isAdmin}
      />
    </div>
  );
}

// ΓöÇΓöÇ Main App ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [developerUser, setDeveloperUser] = useState<any>(() => getSavedDeveloperUser());
  const [loading, setLoading] = useState(true);
  const [showLibrary, setShowLibrary] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const location = useLocation();

  const isMasterAdmin = user?.email === ADMIN_EMAIL;
  const isDeveloper = !!developerUser;
  const isAdmin = isMasterAdmin || isDeveloper;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      // Only clear developer user if a REAL Firebase user logs in
      // Don't clear for anonymous users
      if (u && !u.isAnonymous && u.email) {
        setDeveloperUser(null);
        localStorage.removeItem('lexicon_dev_user');
        sessionStorage.removeItem('lexicon_dev_user');
      }
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && user.email) trackUserLogin(user.uid, user.email);
  }, [user]);

  // Handle new chat from sidebar
  const handleNewChat = useCallback(() => {
    setCurrentSessionId(undefined);
    navigate('/');
  }, [navigate]);

  // Handle session selection from sidebar
  const handleSelectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    navigate('/');
  }, [navigate]);

  // ── App layout (both authenticated and unauthenticated) ─────────────────
  const path = location.pathname;
  const isHome = path === '/';
  const isChat = path === '/chat' || path === '/assistant';
  const isLanguages = path === '/languages';
  const isAfricanLanguages = path === '/african-languages';
  const isUtilities = path === '/utilities';
  const isProfile = path === '/profile';
  const isDiscover = path === '/discover';
  const isAdminPath = path === '/admin';
  const isRepository = path === '/admin/repository';
  const isTraining = path === '/admin/training';
  const isTeam = path === '/admin/team';
  const isLanguagePage = path.startsWith('/language/');
  const isAfricanLanguagePage = path.startsWith('/african-language/');

  // Shared routes available to everyone
  const sharedRoutes = (
    <>
      <Route path="/" element={<GeneralAssistant user={user} isAdmin={isAdmin} currentSessionId={currentSessionId} onOpenLibrary={() => setShowLibrary(true)} />} />
      <Route path="/chat" element={<GeneralAssistant user={user} isAdmin={isAdmin} currentSessionId={currentSessionId} onOpenLibrary={() => setShowLibrary(true)} />} />
      <Route path="/assistant" element={<GeneralAssistant user={user} isAdmin={isAdmin} currentSessionId={currentSessionId} onOpenLibrary={() => setShowLibrary(true)} />} />
      <Route path="/super" element={<SuperEcosystem user={user} isAdmin={isAdmin} onOpenLibrary={() => setShowLibrary(true)} />} />
      <Route path="/languages" element={<div className="flex-1 overflow-y-auto"><LanguagesMenu /></div>} />
      <Route path="/african-languages" element={<div className="flex-1 overflow-y-auto"><AfricanLanguages /></div>} />
      <Route path="/african-language/:langId" element={<AfricanLanguagePage user={user} isAdmin={isAdmin} />} />
      <Route path="/utilities" element={<div className="flex-1 overflow-y-auto"><Utilities /></div>} />
      <Route path="/profile" element={<div className="flex-1 overflow-y-auto"><Profile user={user} /></div>} />
      <Route path="/language/:langId" element={<LanguagePage user={user} isAdmin={isAdmin} />} />
      {/* Admin login page - accessible to everyone */}
      <Route path="/admin/login" element={<AdminLogin onLoginSuccess={() => navigate('/admin')} />} />
    </>
  );

  // Unauthenticated layout — no sidebar (login required for chat history)
  if (!user && !developerUser) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-black via-[#080808] to-[#111111] overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <Routes>
            {sharedRoutes}
            {/* Redirect /admin to login when not authenticated */}
            <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/*" element={<Navigate to="/admin/login" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <PlatformStatus showVisual={false} />
        <Footer />
        <AnimatePresence>
          {showLibrary && <UserLibrary user={user} onClose={() => setShowLibrary(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  // Authenticated layout — with minimal sidebar (ChatGPT-style)
  // Show sidebar on home and chat pages
  const showSidebar = isHome || isChat;

  return (
    <div className="h-full bg-gradient-to-br from-black via-[#080808] to-[#111111] font-sans flex overflow-hidden">
      {/* Minimal Sidebar - shows on home/chat */}
      {showSidebar && (
        <MinimalSidebar
          user={user}
          currentSessionId={currentSessionId}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden bg-gradient-to-br from-black via-[#080808] to-[#111111] relative">
        <Routes>
          {sharedRoutes}
          {isAdmin ? (
            <>
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/discover" element={<div className="flex-1 overflow-y-auto"><SearchLanguage onLanguageFound={(langName) => { let id = langName.toLowerCase().replace(/\s+/g, '-'); for (const [k, v] of Object.entries(LANGUAGE_ID_TO_NAME)) { if (v.toLowerCase() === langName.toLowerCase()) { id = k; break; } } navigate(`/language/${id}`); }} /></div>} />
              <Route path="/admin/repository" element={<AdminSubpage><AdminRepository onSelectLanguage={(langName) => { let id = langName.toLowerCase().replace(/\s+/g, '-'); for (const [k, v] of Object.entries(LANGUAGE_ID_TO_NAME)) { if (v.toLowerCase() === langName.toLowerCase()) { id = k; break; } } navigate(`/language/${id}`); }} /></AdminSubpage>} />
              <Route path="/admin/training" element={<AdminSubpage><AdminTraining /></AdminSubpage>} />
              <Route path="/admin/smart-paste" element={<AdminSubpage><SmartAIPaste /></AdminSubpage>} />
              <Route path="/admin/url-extract" element={<AdminSubpage><URLExtract /></AdminSubpage>} />
              <Route path="/admin/structured-paste" element={<AdminSubpage><div className="text-white p-8">Structured Paste - Coming Soon</div></AdminSubpage>} />
              <Route path="/admin/freeform-paste" element={<AdminSubpage><div className="text-white p-8">Free-form Paste - Coming Soon</div></AdminSubpage>} />
              <Route path="/admin/agents" element={<AdminSubpage><AgentManagement /></AdminSubpage>} />
              <Route path="/admin/team" element={<AdminSubpage><TeamManagement /></AdminSubpage>} />
            </>
          ) : (
            <>
              {/* Redirect non-admin users from /admin to login */}
              <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
              <Route path="/admin/*" element={<Navigate to="/admin/login" replace />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </main>
        <PlatformStatus showVisual={false} />
        <Footer />

        <AnimatePresence>
          {showLibrary && <UserLibrary user={user} onClose={() => setShowLibrary(false)} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AdminSubpage({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-gradient-to-br from-black via-[#080808] to-[#111111]">
      <header className="sticky top-0 z-10 border-b border-[#00ff88]/20 bg-black/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Go back to the previous admin page"
          >
            <ArrowLeft className="h-4 w-4 text-[#00ff88]" />
            Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Return to BLACK AI home"
          >
            <Home className="h-4 w-4 text-[#00ff88]" />
            Home
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-2 rounded-lg border border-[#00ff88]/30 bg-[#00ff88]/10 px-3 py-2 text-sm font-medium text-[#00ff88] transition-colors hover:bg-[#00ff88]/20"
          >
            <Settings className="h-4 w-4" />
            Admin Panel
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#00ff88]/20 bg-black py-4 px-4 text-center">
      <div className="flex items-center justify-center gap-2 text-sm">
        <svg className="w-5 h-5 text-[#00ff88]" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <p className="text-white font-medium">
          <span className="text-[#00ff88] font-black">BLACK AI</span> created by <span className="font-semibold">Obosa Thompson Emuze</span>
        </p>
      </div>
      <a
        href="/admin/login"
        className="mt-2 inline-block text-xs text-white/40 hover:text-[#00ff88] transition-colors"
      >
        Admin training
      </a>
    </footer>
  );
}

function NavItem({
  icon, active, onClick, label,
}: {
  icon: React.ReactElement;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <div className="relative group w-full">
      <button
        onClick={onClick}
        className={`w-full p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all flex items-center justify-center relative overflow-hidden ${
          active
            ? 'bg-white/20 backdrop-blur-sm text-white shadow-lg'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        {active && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        )}
        <span className="relative z-10">{icon}</span>
      </button>
      <span className="absolute left-full ml-2 sm:ml-3 top-1/2 -translate-y-1/2 py-1 px-2 bg-[#00ff88] border border-white/20 text-black text-[9px] sm:text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest whitespace-nowrap z-[100] pointer-events-none shadow-xl">
        {label}
      </span>
    </div>
  );
}
