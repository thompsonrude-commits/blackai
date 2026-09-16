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

const INPUT_CLASS = "w-full bg-[#0F0F0F] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#4A4A4A] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors";

export default function URLExtract() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('edo');
  const [pastedContent, setPastedContent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const selectedLanguage = ALL_LANGUAGES.find(l => l.id === language) || ALL_LANGUAGES[0];

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

      if (parsed.length === 0) {
        alert(`❌ No training data could be extracted.\n\nPossible reasons:\n• The text doesn't contain ${selectedLanguage.name} language content\n• Try different text with clear ${selectedLanguage.name} words/phrases\n• The content might be too general`);
      } else {
        setPreview(parsed);
        alert(`✅ Found ${parsed.length} training items!`);
      }
      
    } catch (error: any) {
      console.error('Analysis error:', error);
      alert(`❌ Analysis failed: ${error.message}\n\nPlease try again or paste different content.`);
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
            <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center">
              <FileText size={32} className="text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Content Extract</h1>
              <p className="text-white/60">Paste content from websites or documents to extract training data</p>
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
          <h3 className="text-sm font-bold text-orange-400 mb-3">📝 How It Works</h3>
          <ul className="text-sm text-white/60 space-y-2 ml-4">
            <li>• Visit any website with {selectedLanguage.name} language content</li>
            <li>• Copy the article or text content from the webpage</li>
            <li>• Paste it in the text area below</li>
            <li>• Click "Analyze with AI" to extract training data</li>
            <li>• AI will find vocabulary, phrases, and grammar patterns</li>
          </ul>
          <p className="text-sm text-orange-400 mt-4 font-bold">
            Perfect for language blogs, dictionaries, and educational websites!
          </p>
        </div>

        {/* Paste Area */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs uppercase tracking-widest text-white/60 font-bold">
              Paste Content from Website
            </label>
            {pastedContent && (
              <button
                onClick={() => { setPastedContent(''); setPreview([]); }}
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
            placeholder={`Copy and paste article or webpage content here...\n\nExample:\n"Ọbọ" means "monkey" in Edo language.\n"Vbè ghé" means "good morning".\n\nOr paste an entire article, blog post, or dictionary page about ${selectedLanguage.name} language.`}
            className={INPUT_CLASS + " resize-none text-xs"}
          />
          <p className="text-xs text-white/40 mt-2">
            {pastedContent ? `${pastedContent.length} characters • Ready to analyze` : `Paste content from websites, articles, or documents`}
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
