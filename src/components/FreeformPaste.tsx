import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, FileText, Sparkles, Upload } from 'lucide-react';
import { NIGERIAN_LANGUAGES } from '../lib/nigerianLanguages';

const ALL_LANGUAGES = Array.from(
  new Map(
    NIGERIAN_LANGUAGES.flatMap(region =>
      region.languages.map(lang => [lang.id, { id: lang.id, name: lang.name }] as const)
    )
  ).values()
).sort((a, b) => a.name.localeCompare(b.name));

const INPUT_CLASS = "w-full bg-[#0F0F0F] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#4A4A4A] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors";

export default function FreeformPaste() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('edo');
  const [pastedText, setPastedText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const selectedLanguage = ALL_LANGUAGES.find(l => l.id === language) || ALL_LANGUAGES[0];

  const analyzeWithAI = async () => {
    if (!pastedText.trim()) {
      alert('Please paste text first');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'system',
            content: `You are a ${selectedLanguage.name} language expert. Analyze the freeform text and extract ALL language training data.

The text may contain patterns like:
- "word - meaning"
- "word: meaning"
- "word = meaning"
- "word (meaning)"
- "word means meaning"
- Sentences with translations
- Mixed content

Extract EVERY ${selectedLanguage.name} word, phrase, or sentence with its English equivalent.

Return ONLY a JSON array (no markdown, no explanations):
[
  {
    "nativeText": "${selectedLanguage.name} word/phrase",
    "englishText": "English translation",
    "phonetics": "pronunciation if available (optional)",
    "context": "usage context if provided (optional)",
    "type": "vocabulary OR conversation OR grammar OR culture"
  }
]

Rules:
- Return ONLY valid JSON array
- Extract ALL language pairs you find
- Each entry MUST have nativeText and englishText
- Type must be: vocabulary (single words), conversation (phrases/sentences), grammar (rules), or culture (cultural info)
- If no ${selectedLanguage.name} content found, return []`
          }, {
            role: 'user',
            content: `Extract ALL ${selectedLanguage.name} language training data from this freeform text:\n\n${pastedText.substring(0, 4000)}`
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('AI Response:', data);
      
      const content = data.choices?.[0]?.message?.content || data.content || '';
      console.log('AI Content:', content);
      
      if (!content) {
        throw new Error('No response from AI');
      }

      // Extract JSON from response
      let parsed: any[] = [];
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleanedContent.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
          if (!Array.isArray(parsed)) parsed = [];
        } catch (e) {
          console.error('JSON parse error:', e);
          throw new Error('Invalid JSON response from AI');
        }
      }

      if (parsed.length === 0) {
        alert(`❌ No training data could be extracted.\n\nTips:\n• Make sure text contains ${selectedLanguage.name} words with English meanings\n• Try formats like "word - meaning" or "word: meaning"\n• Include clear translations`);
      } else {
        setPreview(parsed);
        alert(`✅ Found ${parsed.length} training items!`);
      }
      
    } catch (error: any) {
      console.error('Analysis error:', error);
      alert(`❌ Analysis failed: ${error.message}\n\nPlease try again or check your text format.`);
    } finally {
      setAnalyzing(false);
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
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center">
              <FileText size={32} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Freeform Paste</h1>
              <p className="text-white/60">Paste any text - AI will find and extract language data</p>
            </div>
          </div>
        </div>

        {/* Language Selection */}
        <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-6 mb-6">
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
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-bold text-purple-400 mb-3">✨ How It Works</h3>
          <ul className="text-sm text-white/60 space-y-2 ml-4">
            <li>• Paste ANY text containing {selectedLanguage.name} words/phrases</li>
            <li>• AI automatically detects language pairs and patterns</li>
            <li>• No specific format required - just paste!</li>
            <li>• Works with: lists, notes, articles, dictionaries, study materials</li>
          </ul>
          <div className="mt-4 space-y-2">
            <p className="text-sm font-bold text-purple-400">Recognized Patterns:</p>
            <div className="bg-black/40 p-3 rounded-lg text-xs font-mono space-y-1 text-white/70">
              <div>Ọbọ - Monkey</div>
              <div>Vbè ghé: Good morning</div>
              <div>Èwé = Leaf</div>
              <div>"Ọvbi" means child</div>
              <div>The word "ọgọ" refers to money</div>
            </div>
          </div>
        </div>

        {/* Paste Area */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mb-6">
          <label className="text-xs uppercase tracking-widest text-white/60 font-bold mb-3 block">
            Paste Any Text
          </label>
          <textarea
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            rows={15}
            placeholder={`Paste any text containing ${selectedLanguage.name} words...\n\nExamples of what works:\n\nỌbọ - Monkey\nVbè ghé means "Good morning"\nThe word "ọvbi" refers to a child\n\nOr even copy from articles, study notes, dictionary pages, etc.\nThe AI will find and extract language pairs automatically!`}
            className={INPUT_CLASS + " resize-none text-xs"}
          />
          <p className="text-xs text-white/40 mt-2">
            {pastedText ? `${pastedText.length} characters` : 'Paste any format - AI will figure it out'}
          </p>
        </div>

        {/* Analyze Button */}
        {pastedText && preview.length === 0 && (
          <button
            onClick={analyzeWithAI}
            disabled={analyzing}
            className="w-full px-6 py-4 rounded-xl bg-purple-500 text-white text-base font-bold hover:bg-purple-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mb-6"
          >
            {analyzing ? (
              <>
                <Sparkles size={20} className="animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Analyze with AI
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
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Clear & Try Again
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
                          <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                            {entry.type}
                          </span>
                        </div>
                        <div className="text-sm text-white/70">{entry.englishText}</div>
                        {entry.phonetics && <div className="text-xs text-purple-400 mt-1">/{entry.phonetics}/</div>}
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
