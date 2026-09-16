import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { ArrowLeft, Globe, Sparkles, Upload, Link } from 'lucide-react';
import { NIGERIAN_LANGUAGES } from '../lib/nigerianLanguages';
import { extractTrainingEntries } from '../lib/trainingExtraction';
import { repairMojibake } from '../lib/textEncoding';

const ALL_LANGUAGES = Array.from(
  new Map(
    NIGERIAN_LANGUAGES.flatMap(region =>
      region.languages.map(lang => [lang.id, { id: lang.id, name: lang.name }] as const)
    )
  ).values()
).sort((a, b) => a.name.localeCompare(b.name));

const INPUT_CLASS = "w-full bg-[#0F0F0F] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#4A4A4A] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors";

export default function URLExtract() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('edo');
  const [urlInput, setUrlInput] = useState('');
  const [pastedContent, setPastedContent] = useState('');
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const selectedLanguage = ALL_LANGUAGES.find(l => l.id === language) || ALL_LANGUAGES[0];

  const fetchFromUrl = async () => {
    if (!urlInput.trim()) {
      alert('Please enter a URL');
      return;
    }

    setFetchingUrl(true);
    try {
      // Call our backend to fetch the URL (bypasses CORS)
      const response = await fetch('/api/v1/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch URL');
      }

      const data = await response.json();
      const content = data.content || data.text || '';

      if (!content || content.length < 100) {
        throw new Error('Could not extract meaningful content from URL');
      }

      setPastedContent(repairMojibake(content));
      alert(`✅ Content fetched! (${content.length} characters)\nClick "Analyze with AI" to extract training data.`);
      
    } catch (error: any) {
      console.error('URL fetch error:', error);
      alert(`❌ Failed to fetch URL: ${error.message}\n\nPlease copy the webpage content manually and paste it below.`);
    } finally {
      setFetchingUrl(false);
    }
  };

  const analyzeWithAI = async () => {
    if (!pastedContent.trim()) {
      alert('Please paste content first');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'chat',
          messages: [{
            role: 'system',
            content: `You are a ${selectedLanguage.name} language expert. Analyze the provided text and extract language training data.

Find any ${selectedLanguage.name} words, phrases, sentences, or language content.

Return ONLY a JSON array (no markdown, no explanations) with this exact structure:
[
  {
    "nativeText": "${selectedLanguage.name} word or phrase",
    "englishText": "English translation",
    "phonetics": "pronunciation (optional)",
    "context": "example sentence or usage context (optional)",
    "type": "vocabulary OR conversation OR grammar OR culture"
  }
]

If you find NOTHING related to ${selectedLanguage.name} language, return an empty array: []

Rules:
- Return ONLY valid JSON array
- Each entry MUST have nativeText and englishText
- Type must be one of: vocabulary, conversation, grammar, culture
- If text contains no ${selectedLanguage.name} content, return []`
          }, {
            role: 'user',
            content: `Extract ${selectedLanguage.name} language training data from this text:\n\n${pastedContent.substring(0, 4000)}`
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('AI Response:', data);
      
      const content = data.text || data.choices?.[0]?.message?.content || data.content || '';
      console.log('AI Content:', content);
      
      if (!content) {
        throw new Error('No response from AI');
      }

      // Try to extract JSON array from response
      let parsed: any[] = [];
      
      // Remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Try to find JSON array
      const jsonMatch = cleanedContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
          if (!Array.isArray(parsed)) {
            parsed = [];
          }
        } catch (e) {
          console.error('JSON parse error:', e);
          throw new Error('Invalid JSON response from AI');
        }
      }

      // AI is optional. Keep URL extraction useful when the provider is
      // unavailable or returns a non-JSON fallback response.
      if (parsed.length === 0) {
        parsed = extractTrainingEntries(pastedContent, selectedLanguage.name);
      }

      if (parsed.length === 0) {
        alert(`❌ No training data could be extracted from this content.`);
      } else {
        setPreview(parsed);
        alert(`✅ Found ${parsed.length} training items!`);
      }
      
    } catch (error: any) {
      console.error('Analysis error:', error);
      const localEntries = extractTrainingEntries(pastedContent, selectedLanguage.name);
      if (localEntries.length > 0) {
        setPreview(localEntries);
        alert(`✅ AI unavailable, but found ${localEntries.length} entries locally.`);
      } else {
        alert(`❌ Analysis failed: ${error.message}`);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveAll = async () => {
    if (preview.length === 0) return;

    setSaving(true);
    try {
      if (!auth.currentUser) {
        throw new Error('Your admin session is not connected to Firebase. Please sign in again.');
      }

      const batch = writeBatch(db);
      let successCount = 0;
      for (const entry of preview) {
        if (!entry.nativeText || !entry.englishText) continue;

        batch.set(doc(collection(db, 'aiTraining')), {
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

      await batch.commit();
      alert(`✅ Successfully added ${successCount} training entries!`);
      navigate('/admin');
    } catch (err) {
      const code = typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: string }).code)
        : '';
      const message = err instanceof Error ? err.message : String(err);
      const isAuthError = !auth.currentUser || code === 'permission-denied' || code === 'unauthenticated';
      alert(
        isAuthError
          ? 'Failed to save entries: your Firebase admin session is missing or expired. Please sign in again, then retry.'
          : `Failed to save entries: ${message}`
      );
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
            <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center">
              <Globe size={32} className="text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">URL Extract</h1>
              <p className="text-white/60">Extract training data from website URLs</p>
            </div>
          </div>
        </div>

        {/* Language Selection */}
        <div className="bg-black/40 border border-orange-500/20 rounded-2xl p-6 mb-6">
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
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-bold text-orange-400 mb-3">🌐 How It Works</h3>
          <ul className="text-sm text-white/60 space-y-2 ml-4">
            <li>• Enter a website URL containing {selectedLanguage.name} content</li>
            <li>• Click "Fetch Content" to automatically extract text</li>
            <li>• Review and edit the extracted content if needed</li>
            <li>• Click "Analyze with AI" to extract training data</li>
            <li>• AI finds vocabulary, phrases, and grammar patterns</li>
          </ul>
          <p className="text-sm text-orange-400 mt-4 font-bold">
            If auto-fetch fails, you can manually copy and paste the content!
          </p>
        </div>

        {/* URL Input */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mb-6">
          <label className="text-xs uppercase tracking-widest text-white/60 font-bold mb-3 block flex items-center gap-2">
            <Link size={14} />
            Website URL
          </label>
          <div className="flex gap-3">
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://example.com/edo-language-lessons"
              className={INPUT_CLASS + " flex-1"}
            />
            <button
              onClick={fetchFromUrl}
              disabled={fetchingUrl || !urlInput.trim()}
              className="px-6 py-2.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold hover:bg-orange-500/30 transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              {fetchingUrl ? (
                <>
                  <Sparkles size={16} className="animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Globe size={16} />
                  Fetch Content
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-white/40 mt-2">
            Enter URL and click "Fetch Content" to auto-extract
          </p>
        </div>

        {/* Paste Area */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs uppercase tracking-widest text-white/60 font-bold">
              Content (Edit if needed)
            </label>
            {pastedContent && (
              <button
                onClick={() => { setPastedContent(''); setUrlInput(''); setPreview([]); }}
                className="text-xs text-orange-400 hover:text-orange-300"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            value={pastedContent}
            onChange={e => setPastedContent(e.target.value)}
            rows={15}
            placeholder={`Fetched content will appear here, or paste manually...\n\nExample:\n"Ọbọ" means "monkey" in Edo language.\n"Vbè ghé" means "good morning".\n\nYou can also paste entire articles or dictionary pages.`}
            className={INPUT_CLASS + " resize-none text-xs"}
          />
          <p className="text-xs text-white/40 mt-2">
            {pastedContent ? `${pastedContent.length} characters • You can edit before analyzing` : `Content will appear here after fetch, or paste manually`}
          </p>
        </div>

        {/* Analyze Button */}
        {pastedContent && (
          <button
            onClick={analyzeWithAI}
            disabled={analyzing}
            className="w-full px-6 py-4 rounded-xl bg-orange-500 text-white text-base font-bold hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mb-6"
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
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-4">
                Preview ({preview.length} entries)
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {preview.map((entry, idx) => (
                  <div key={idx} className="bg-black/40 border border-white/10 rounded-xl p-4">
                    <div className="flex gap-3">
                      <span className="text-white/40 text-sm">#{idx + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-bold">{entry.nativeText}</span>
                          <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                            {entry.type}
                          </span>
                        </div>
                        <div className="text-sm text-white/70">{entry.englishText}</div>
                        {entry.phonetics && <div className="text-xs text-orange-400 mt-1">/{entry.phonetics}/</div>}
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
