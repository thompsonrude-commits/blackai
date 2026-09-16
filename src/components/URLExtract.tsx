import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, Globe, Sparkles, Upload, Link } from 'lucide-react';
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
  const [urlInput, setUrlInput] = useState('');
  const [fetchedContent, setFetchedContent] = useState('');
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
      console.log('Fetching URL:', urlInput);
      
      // Try multiple CORS proxies
      const proxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(urlInput)}`,
        `https://corsproxy.io/?${encodeURIComponent(urlInput)}`,
      ];

      let htmlContent = '';
      let proxySuccess = false;

      for (const proxyUrl of proxies) {
        try {
          console.log('Trying proxy:', proxyUrl);
          const proxyResponse = await fetch(proxyUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json, text/plain, */*' }
          });
          
          if (!proxyResponse.ok) continue;

          // Handle different proxy response formats
          const contentType = proxyResponse.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const proxyData = await proxyResponse.json();
            htmlContent = proxyData.contents || proxyData.data || '';
          } else {
            htmlContent = await proxyResponse.text();
          }

          if (htmlContent && htmlContent.length > 200) {
            proxySuccess = true;
            console.log('✅ Proxy success, content length:', htmlContent.length);
            break;
          }
        } catch (err) {
          console.log('Proxy failed:', err);
          continue;
        }
      }

      if (!proxySuccess || !htmlContent) {
        throw new Error('All proxies failed. Try manual paste below.');
      }

      // Parse HTML and extract text
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Remove unwanted elements
      const unwanted = doc.querySelectorAll('script, style, nav, header, footer, aside, iframe, .ad, .advertisement, .sidebar');
      unwanted.forEach(el => el.remove());
      
      // Try multiple content selectors
      const selectors = ['article', 'main', '[role="main"]', '.content', '.post-content', '.entry-content', 'body'];
      let textContent = '';
      
      for (const selector of selectors) {
        const element = doc.querySelector(selector);
        if (element) {
          const text = element.innerText || element.textContent || '';
          if (text.length > textContent.length) {
            textContent = text;
          }
        }
      }
      
      if (!textContent || textContent.trim().length < 100) {
        throw new Error('Could not extract meaningful content. Try manual paste below.');
      }

      // Clean up whitespace
      const cleanedContent = textContent
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .replace(/[ \t]+/g, ' ')
        .trim();

      setFetchedContent(cleanedContent);
      alert(`✅ Content fetched! (${cleanedContent.length} characters)\nClick "Analyze with AI" to extract training data.`);
      
    } catch (error: any) {
      console.error('URL fetch error:', error);
      const errorMsg = error.message || 'Unknown error';
      alert(`❌ Failed to fetch URL.\n\nReason: ${errorMsg}\n\nSolution: Copy the webpage content manually and paste it in the text area below, then click "Analyze with AI".`);
      // Show the manual paste area even on error
      setFetchedContent('');
    } finally {
      setFetchingUrl(false);
    }
  };

  const analyzeWithAI = async () => {
    if (!fetchedContent.trim()) {
      alert('Please fetch URL content first');
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
            content: `Extract ${selectedLanguage.name} language training data from this text. Return JSON array with: nativeText, englishText, phonetics, context, type (vocabulary/conversation/grammar/culture).`
          }, {
            role: 'user',
            content: fetchedContent
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
      }
    } catch (error) {
      alert('Analysis failed. Please try again.');
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
              <Globe size={32} className="text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">URL Extract</h1>
              <p className="text-white/60">Extract training data from any website URL</p>
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
            <li>• AI fetches and extracts the main article text</li>
            <li>• Analyzes content to find training data</li>
            <li>• Auto-categorizes vocabulary, phrases, and grammar</li>
          </ul>
          <p className="text-sm text-orange-400 mt-4 font-bold">
            Perfect for language learning blogs, dictionaries, and educational sites!
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

        {/* Manual Paste Option (always visible as fallback) */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs uppercase tracking-widest text-white/60 font-bold">
              Or Paste Content Manually
            </label>
            {fetchedContent && (
              <button
                onClick={() => { setFetchedContent(''); setUrlInput(''); setPreview([]); }}
                className="text-xs text-orange-400 hover:text-orange-300"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            value={fetchedContent}
            onChange={e => setFetchedContent(e.target.value)}
            rows={10}
            placeholder={`If auto-fetch fails, manually copy the webpage text and paste here...\n\nExample content:\n"Ọbọ" means "monkey" in Edo language.\n"Vbe ghee" means "good morning".\n...`}
            className={INPUT_CLASS + " resize-none text-xs"}
          />
          <p className="text-xs text-white/40 mt-2">
            {fetchedContent ? `${fetchedContent.length} characters • You can edit before analyzing` : 'Paste article or webpage content here'}
          </p>
        </div>

        {/* Analyze Button */}
        {fetchedContent && (
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
