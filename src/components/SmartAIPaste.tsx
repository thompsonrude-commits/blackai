import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, Sparkles, Upload, Globe } from 'lucide-react';
import { NIGERIAN_LANGUAGES } from '../lib/nigerianLanguages';

const ALL_LANGUAGES = Array.from(
  new Map(
    NIGERIAN_LANGUAGES.flatMap(region =>
      region.languages.map(lang => [lang.id, { id: lang.id, name: lang.name }] as const)
    )
  ).values()
).sort((a, b) => a.name.localeCompare(b.name));

const INPUT_CLASS = "w-full bg-[#0F0F0F] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#4A4A4A] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors";

export default function SmartAIPaste() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('edo');
  const [bulkText, setBulkText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const selectedLanguage = ALL_LANGUAGES.find(l => l.id === language) || ALL_LANGUAGES[0];

  const analyzeWithAI = async () => {
    if (!bulkText.trim()) {
      alert('Please paste some content first');
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
            content: `You are a linguistic expert analyzing ${selectedLanguage.name} language training materials. Extract vocabulary, phrases, grammar rules, cultural notes, and conversation patterns from the provided text. For each item, identify:
1. The native ${selectedLanguage.name} word/phrase
2. English meaning/translation
3. Phonetic pronunciation (if available or can infer)
4. Context/usage notes
5. Category: vocabulary, conversation, grammar, culture, spelling, phonetics, terminology, or correction

Return ONLY a JSON array with this structure:
[
  {
    "nativeText": "word in ${selectedLanguage.name}",
    "englishText": "English meaning",
    "phonetics": "pronunciation",
    "context": "usage context",
    "type": "vocabulary|conversation|grammar|culture|spelling|phonetics|terminology|correction"
  }
]

Be thorough - extract as many useful training items as possible.`
          }, {
            role: 'user',
            content: `Analyze this ${selectedLanguage.name} language material and extract training data:\n\n${bulkText}`
          }]
        })
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.content || '';
      
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setPreview(Array.isArray(parsed) ? parsed : []);
        alert(`✅ Found ${parsed.length} training items!`);
      } else {
        alert('No training data could be extracted. Try different text.');
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      alert('AI analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveAll = async () => {
    if (preview.length === 0) {
      alert('Please analyze content first');
      return;
    }

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
      alert('Failed to save: ' + (err instanceof Error ? err.message : String(err)));
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
              <Sparkles size={32} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Smart AI Paste</h1>
              <p className="text-white/60">AI automatically extracts and categorizes language training data</p>
            </div>
          </div>
        </div>

        {/* Language Selection */}
        <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-6 mb-6">
          <label className="text-xs uppercase tracking-widest text-white/60 font-bold mb-3 block flex items-center gap-2">
            <Globe size={14} className="text-purple-400" />
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
          <h3 className="text-sm font-bold text-purple-400 mb-3">📋 How It Works</h3>
          <p className="text-sm text-white/70 leading-relaxed mb-3">
            Paste any text containing {selectedLanguage.name} language information. The AI will:
          </p>
          <ul className="text-sm text-white/60 space-y-2 ml-4">
            <li>• Extract vocabulary words and their meanings</li>
            <li>• Identify conversation phrases and dialogues</li>
            <li>• Detect grammar rules and patterns</li>
            <li>• Find cultural context and usage notes</li>
            <li>• Automatically categorize each item</li>
          </ul>
          <p className="text-sm text-purple-400 mt-4 font-bold">
            Just paste paragraphs, articles, or notes - AI handles everything!
          </p>
        </div>

        {/* Text Input */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mb-6">
          <label className="text-xs uppercase tracking-widest text-white/60 font-bold mb-3 block">
            Paste Research Material
          </label>
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            rows={15}
            placeholder={`Paste any article, research notes, or language learning materials about ${selectedLanguage.name}.\n\nExample:\n"The Edo people greet with 'Kọyọ' (ko-yo) which means hello. In formal settings, they say 'Ọghọ' to show respect. Common phrases include 'Vbèè oye hẹ?' meaning 'how are you?'..."`}
            className={INPUT_CLASS + " resize-none font-mono text-xs"}
          />
          <p className="text-xs text-white/40 mt-2">
            {bulkText.length} characters
          </p>
        </div>

        {/* Analyze Button */}
        <button
          onClick={analyzeWithAI}
          disabled={!bulkText.trim() || analyzing}
          className="w-full px-6 py-4 rounded-xl bg-purple-500 text-white text-base font-bold hover:bg-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mb-6"
        >
          {analyzing ? (
            <>
              <Sparkles size={20} className="animate-spin" />
              AI Analyzing...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              Analyze with AI
            </>
          )}
        </button>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mb-6">
            <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-4">
              Preview ({preview.length} entries found)
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {preview.map((entry, idx) => (
                <div key={idx} className="bg-black/40 border border-white/10 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-white/40 text-sm">#{idx + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold">{entry.nativeText}</span>
                        <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
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
        )}

        {/* Save Button */}
        {preview.length > 0 && (
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="w-full px-6 py-4 rounded-xl bg-[#00ff88] text-black text-base font-bold hover:bg-[#00ff88]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Upload size={20} />
                Save All {preview.length} Entries
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
