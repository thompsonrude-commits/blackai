import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, Table, Upload, AlertCircle } from 'lucide-react';
import { NIGERIAN_LANGUAGES } from '../lib/nigerianLanguages';

const ALL_LANGUAGES = Array.from(
  new Map(
    NIGERIAN_LANGUAGES.flatMap(region =>
      region.languages.map(lang => [lang.id, { id: lang.id, name: lang.name }] as const)
    )
  ).values()
).sort((a, b) => a.name.localeCompare(b.name));

const INPUT_CLASS = "w-full bg-[#0F0F0F] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#4A4A4A] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors";

export default function StructuredPaste() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('edo');
  const [pastedText, setPastedText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const selectedLanguage = ALL_LANGUAGES.find(l => l.id === language) || ALL_LANGUAGES[0];

  const parseStructuredText = () => {
    if (!pastedText.trim()) {
      alert('Please paste structured text first');
      return;
    }

    setParsing(true);
    try {
      const lines = pastedText.trim().split('\n');
      const entries: any[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Support multiple separators: | or tabs
        const parts = trimmed.includes('|') 
          ? trimmed.split('|').map(p => p.trim())
          : trimmed.split('\t').map(p => p.trim());

        // Expect at least 2 parts: word and meaning
        if (parts.length >= 2) {
          const entry: any = {
            nativeText: parts[0],
            englishText: parts[1],
            type: 'vocabulary'
          };

          // Optional phonetics (3rd column)
          if (parts[2]) {
            entry.phonetics = parts[2];
          }

          // Optional context (4th column)
          if (parts[3]) {
            entry.context = parts[3];
          }

          // Optional type (5th column)
          if (parts[4]) {
            const validTypes = ['vocabulary', 'conversation', 'grammar', 'culture'];
            const type = parts[4].toLowerCase();
            if (validTypes.includes(type)) {
              entry.type = type;
            }
          }

          entries.push(entry);
        }
      }

      if (entries.length === 0) {
        alert('❌ No valid entries found.\n\nMake sure each line has at least:\nWord | Meaning\n\nExample:\nỌbọ | Monkey\nVbè ghé | Good morning');
      } else {
        setPreview(entries);
        alert(`✅ Parsed ${entries.length} entries!`);
      }

    } catch (error) {
      alert('Failed to parse. Check the format and try again.');
    } finally {
      setParsing(false);
    }
  };

  const handleSaveAll = async () => {
    if (preview.length === 0) return;

    setSaving(true);
    try {
      let successCount = 0;
      for (const entry of preview) {
        if (!entry.nativeText || !entry.englishText) continue;

        await addDoc(collection(db, 'aiTraining'), {
          type: entry.type || 'vocabulary',
          language: selectedLanguage.id,
          languageName: selectedLanguage.name,
          nativeText: entry.nativeText,
          englishText: entry.englishText,
          phonetics: entry.phonetics || null,
          context: entry.context || null,
          createdAt: serverTimestamp()
        });
        successCount++;
      }

      alert(`✅ Successfully added ${successCount} training entries!`);
      navigate('/admin');
    } catch (err) {
      alert('Failed to save entries');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen futuristic-shell p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            <span className="text-sm">Back to Admin</span>
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center">
              <Table size={32} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Structured Paste</h1>
              <p className="text-white/60">Paste data in table format (Word | Meaning | Phonetics | Context)</p>
            </div>
          </div>
        </div>

        {/* Language Selection */}
        <div className="bg-black/40 border border-blue-500/20 rounded-2xl p-6 mb-6">
          <label className="text-xs uppercase tracking-widest text-white/60 font-bold mb-3 block">
            Select Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={INPUT_CLASS}
          >
            {ALL_LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id}>{lang.name}</option>
            ))}
          </select>
        </div>

        {/* Instructions */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
            <AlertCircle size={16} />
            Format Guide
          </h3>
          <div className="space-y-3 text-sm text-white/70">
            <div>
              <p className="font-bold text-white mb-1">Required Format:</p>
              <code className="block bg-black/40 p-3 rounded-lg text-blue-400 font-mono text-xs">
                Word | Meaning | Phonetics | Context | Type
              </code>
            </div>
            <div>
              <p className="font-bold text-white mb-1">Minimum (just word and meaning):</p>
              <code className="block bg-black/40 p-3 rounded-lg text-blue-400 font-mono text-xs">
                Ọbọ | Monkey{'\n'}
                Vbè ghé | Good morning
              </code>
            </div>
            <div>
              <p className="font-bold text-white mb-1">Full example:</p>
              <code className="block bg-black/40 p-3 rounded-lg text-blue-400 font-mono text-xs">
                Ọbọ | Monkey | o-bo | An animal | vocabulary{'\n'}
                Vbè ghé | Good morning | vbe-ghe | Morning greeting | conversation
              </code>
            </div>
            <ul className="text-xs text-white/50 mt-3 ml-4 space-y-1">
              <li>• Use <code className="text-blue-400">|</code> (pipe) or <code className="text-blue-400">Tab</code> to separate columns</li>
              <li>• Minimum: Word and Meaning (2 columns)</li>
              <li>• Optional: Phonetics, Context, Type</li>
              <li>• Type options: vocabulary, conversation, grammar, culture</li>
              <li>• One entry per line</li>
            </ul>
          </div>
        </div>

        {/* Paste Area */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mb-6">
          <label className="text-xs uppercase tracking-widest text-white/60 font-bold mb-3 block">
            Paste Structured Data
          </label>
          <textarea
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            rows={15}
            placeholder={`Paste your structured data here...\n\nExample:\nỌbọ | Monkey | o-bo | An animal | vocabulary\nVbè ghé | Good morning | vbe-ghe | Greeting used in morning | conversation\nỌvbiedo | Edo person | ov-bi-e-do | Native of Edo | vocabulary`}
            className={INPUT_CLASS + " resize-none text-xs font-mono"}
          />
          <p className="text-xs text-white/40 mt-2">
            {pastedText ? `${pastedText.split('\n').filter(l => l.trim()).length} lines` : 'Paste structured data above'}
          </p>
        </div>

        {/* Parse Button */}
        {pastedText && preview.length === 0 && (
          <button
            onClick={parseStructuredText}
            disabled={parsing}
            className="w-full px-6 py-4 rounded-xl bg-blue-500 text-white text-base font-bold hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mb-6"
          >
            {parsing ? 'Parsing...' : (
              <>
                <Table size={20} />
                Parse Data
              </>
            )}
          </button>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <>
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest">
                  Preview ({preview.length} entries)
                </h3>
                <button
                  onClick={() => { setPreview([]); setPastedText(''); }}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Clear & Start Over
                </button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {preview.map((entry, idx) => (
                  <div key={idx} className="bg-black/40 border border-white/10 rounded-xl p-4">
                    <div className="flex gap-3">
                      <span className="text-white/40 text-sm">#{idx + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-bold">{entry.nativeText}</span>
                          <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                            {entry.type}
                          </span>
                        </div>
                        <div className="text-sm text-white/70">{entry.englishText}</div>
                        {entry.phonetics && <div className="text-xs text-blue-400 mt-1">/{entry.phonetics}/</div>}
                        {entry.context && <div className="text-xs text-white/40 italic mt-1">{entry.context}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="w-full px-6 py-4 rounded-xl bg-[#00ff88] text-black text-base font-bold hover:bg-[#00ff88]/90 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {saving ? 'Saving...' : (
                <>
                  <Upload size={20} />
                  Save All {preview.length} Entries
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
