/**
 * AdminPage - Full admin interface for training AI and managing team
 * Accessible only to admin users
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Users, Database, BarChart3, Settings, ArrowLeft, Globe, Sparkles, Upload, Info, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminTraining from './AdminTraining';
import TeamManagement from './TeamManagement';
import AdminRepository from './AdminRepository';
import { AdminDashboard } from './AdminDashboard';
import { NIGERIAN_LANGUAGES } from '../lib/nigerianLanguages';

type AdminTab = 'training' | 'team' | 'repository' | 'dashboard' | 'bulk-paste';

const TRAINING_LANGUAGES = Array.from(new Map(
  NIGERIAN_LANGUAGES.flatMap(region => region.languages.map(language => [
    language.id,
    { id: language.id, name: language.name, region: region.name },
  ] as const))
).values()).sort((a, b) => a.name.localeCompare(b.name));

export default function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('training');
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<{ id: string; name: string; region: string } | null>(null);

  const tabs = [
    { id: 'training' as AdminTab, label: 'AI Training', icon: GraduationCap, description: 'Train and improve the AI model' },
    { id: 'bulk-paste' as AdminTab, label: 'Bulk Paste', icon: Upload, description: 'Import training data from various sources' },
    { id: 'repository' as AdminTab, label: 'Language Repository', icon: Database, description: 'Manage language data and resources' },
    { id: 'team' as AdminTab, label: 'Team Management', icon: Users, description: 'Manage team members who help train the AI' },
  ];

  return (
    <div className="min-h-screen futuristic-shell flex flex-col">
      {!selectedLanguage ? (
        <div className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-4xl space-y-6">
            {/* Language Selection Card */}
            <div className="rounded-3xl border border-[#00ff88]/20 bg-black/40 p-8 sm:p-12 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#00ff88]/10">
                <Globe className="h-8 w-8 text-[#00ff88]" />
              </div>
              <h2 className="text-3xl font-black text-white">Choose a language to work on</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/50">
                Select the language your team will edit and use for AI training. No language is opened automatically.
              </p>
              <div className="mt-8 text-left">
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-white/60">Training language</label>
                <select
                  defaultValue=""
                  onChange={(event) => setSelectedLanguage(TRAINING_LANGUAGES.find(language => language.id === event.target.value) || null)}
                  className="w-full rounded-xl border border-white/15 bg-[#0F0F0F] px-4 py-3 text-white focus:border-[#00ff88] focus:outline-none focus:ring-2 focus:ring-[#00ff88]"
                >
                  <option value="" disabled>Select a language</option>
                  {TRAINING_LANGUAGES.map(language => (
                    <option key={language.id} value={language.id}>{language.name} — {language.region}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Access Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/admin/smart-paste')}
                className="group p-8 rounded-2xl border border-purple-500/30 bg-black/40 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all text-left"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                    <Sparkles className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Smart AI Paste</h3>
                    <p className="text-xs text-purple-400 uppercase tracking-wider">Recommended</p>
                  </div>
                </div>
                <p className="text-sm text-white/70 leading-relaxed mb-4">
                  Paste any research text, articles, or notes. AI automatically extracts vocabulary, phrases, grammar rules, and cultural context. Everything is auto-categorized.
                </p>
                <div className="text-sm text-purple-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  Open Smart Paste →
                </div>
              </button>

              <button
                onClick={() => navigate('/admin/url-extract')}
                className="group p-8 rounded-2xl border border-orange-500/30 bg-black/40 hover:bg-orange-500/10 hover:border-orange-500/50 transition-all text-left"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                    <Globe className="w-8 h-8 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">URL Extract</h3>
                    <p className="text-xs text-orange-400 uppercase tracking-wider">From Websites</p>
                  </div>
                </div>
                <p className="text-sm text-white/70 leading-relaxed mb-4">
                  Paste a website URL. AI fetches the content, extracts main article text, and automatically finds all language training materials.
                </p>
                <div className="text-sm text-orange-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  Open URL Extract →
                </div>
              </button>

              <button
                onClick={() => navigate('/admin/structured-paste')}
                className="group p-8 rounded-2xl border border-blue-500/30 bg-black/40 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all text-left"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                    <Upload className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Structured Paste</h3>
                    <p className="text-xs text-blue-400 uppercase tracking-wider">Pre-formatted Data</p>
                  </div>
                </div>
                <p className="text-sm text-white/70 leading-relaxed mb-4">
                  Paste formatted data from spreadsheets. Format: Word | Meaning | Phonetics | Context. Each line is one entry.
                </p>
                <div className="text-sm text-blue-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  Open Structured Paste →
                </div>
              </button>

              <button
                onClick={() => navigate('/admin/freeform-paste')}
                className="group p-8 rounded-2xl border border-green-500/30 bg-black/40 hover:bg-green-500/10 hover:border-green-500/50 transition-all text-left"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                    <Info className="w-8 h-8 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Free-form Paste</h3>
                    <p className="text-xs text-green-400 uppercase tracking-wider">Unstructured Text</p>
                  </div>
                </div>
                <p className="text-sm text-white/70 leading-relaxed mb-4">
                  Paste unstructured notes. Detects patterns like "word - meaning", "word: meaning", and extracts cultural notes from longer sentences.
                </p>
                <div className="text-sm text-green-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  Open Free-form Paste →
                </div>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* Header */}
      <div className="border-b border-[#00ff88]/20 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-white/60 hover:text-white transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm">Back to Home</span>
              </button>
              <div className="h-6 w-px bg-white/20" />
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  <Settings className="w-6 h-6 text-[#00ff88]" />
                  <span>BLACK</span>
                  <span className="text-[#00ff88]">AI</span>
                  <span className="text-white/60 text-lg font-normal ml-2">Admin Panel</span>
                </h1>
                <p className="text-sm text-white/40 mt-1">Train the AI and manage your team</p>
              </div>
            </div>
            <button
              onClick={() => setShowDashboard(true)}
              className="px-4 py-2 bg-[#00ff88]/10 hover:bg-[#00ff88]/20 border border-[#00ff88]/30 text-[#00ff88] rounded-lg transition-all flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm font-medium">Platform Dashboard</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-t-lg transition-all text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#00ff88]/10 text-[#00ff88] border-b-2 border-[#00ff88]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Description */}
      <div className="border-b border-white/10 bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-sm text-white/60">
            {tabs.find(t => t.id === activeTab)?.description}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'training' && <AdminTraining selectedLanguage={selectedLanguage.id} />}
            {activeTab === 'bulk-paste' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <button
                    onClick={() => navigate('/admin/smart-paste')}
                    className="group p-8 rounded-2xl border border-purple-500/30 bg-black/40 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all text-left"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                        <Sparkles className="w-8 h-8 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Smart AI Paste</h3>
                        <p className="text-xs text-purple-400 uppercase tracking-wider">Recommended</p>
                      </div>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">
                      Paste any research text, articles, or notes. AI automatically extracts and categorizes everything.
                    </p>
                  </button>

                  <button
                    onClick={() => navigate('/admin/url-extract')}
                    className="group p-8 rounded-2xl border border-orange-500/30 bg-black/40 hover:bg-orange-500/10 hover:border-orange-500/50 transition-all text-left"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                        <FileText className="w-8 h-8 text-orange-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Content Extract</h3>
                        <p className="text-xs text-orange-400 uppercase tracking-wider">From Websites</p>
                      </div>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">
                      Copy and paste content from websites, articles, or documents to extract training data.
                    </p>
                  </button>

                  <button
                    onClick={() => navigate('/admin/structured-paste')}
                    className="group p-8 rounded-2xl border border-blue-500/30 bg-black/40 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all text-left"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                        <Upload className="w-8 h-8 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Structured Paste</h3>
                        <p className="text-xs text-blue-400 uppercase tracking-wider">Formatted Data</p>
                      </div>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">
                      Paste formatted data: Word | Meaning | Phonetics | Context (spreadsheet format).
                    </p>
                  </button>

                  <button
                    onClick={() => navigate('/admin/freeform-paste')}
                    className="group p-8 rounded-2xl border border-green-500/30 bg-black/40 hover:bg-green-500/10 hover:border-green-500/50 transition-all text-left"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                        <Info className="w-8 h-8 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Free-form Paste</h3>
                        <p className="text-xs text-green-400 uppercase tracking-wider">Unstructured</p>
                      </div>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">
                      Paste unstructured notes. Auto-detects patterns like "word - meaning".
                    </p>
                  </button>
                </div>
              </div>
            )}
            {activeTab === 'team' && <TeamManagement />}
            {activeTab === 'repository' && (
              <AdminRepository
                onSelectLanguage={(langName) => {
                  // Navigate to language page
                  const langId = langName.toLowerCase().replace(/\s+/g, '-');
                  navigate(`/language/${langId}`);
                }}
              />
            )}
          </motion.div>
        </div>
      </div>

      {/* Platform Dashboard Modal */}
      {showDashboard && (
        <AdminDashboard onClose={() => setShowDashboard(false)} />
      )}
        </>
      )}
    </div>
  );
}
