import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, addDoc, onSnapshot, deleteDoc, doc, setDoc,
  serverTimestamp, orderBy, query, updateDoc, where
} from "firebase/firestore";
import { db, uploadAudio, auth } from "../lib/firebase";
import {
  Sparkles, Mic, Square, Upload, Trash2, Play,
  X, Plus, Volume2, Edit2, Save, ChevronDown, ChevronUp, Info, Users, Globe
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { recordAudioBlob } from "../lib/voice";
import { NIGERIAN_LANGUAGES } from "../lib/nigerianLanguages";
import { useLexicon, LexiconEntry } from "../lib/useLexicon";

type TrainingType = "conversation" | "correction" | "vocabulary" | "grammar" | "culture" | "spelling" | "phonetics" | "terminology";

interface TrainingEntry {
  id: string;
  type: TrainingType;
  language: string;  // Language code (e.g., 'edo', 'yoruba')
  languageName: string;  // Display name (e.g., 'Edo', 'Yoruba')
  nativeText: string;  // Text in the local language
  englishText: string;  // English translation/meaning
  phonetics?: string;  // How to pronounce it (IPA or simple)
  context?: string;
  audioUrl?: string;
  correction?: string;  // What was wrong and what's correct
  createdAt: any;
}

const TYPE_LABELS: Record<TrainingType, { label: string; color: string; desc: string }> = {
  conversation: { label: "Conversation", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", desc: "Teach natural dialogue and responses" },
  correction:   { label: "Correction",   color: "bg-red-500/20 text-red-400 border-red-500/30",   desc: "Correct something the AI said wrong" },
  vocabulary:   { label: "Vocabulary",   color: "bg-green-500/20 text-green-400 border-green-500/30", desc: "Add a word or phrase with meaning" },
  grammar:      { label: "Grammar",      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", desc: "Teach a grammar rule or pattern" },
  culture:      { label: "Culture",      color: "bg-purple-500/20 text-purple-400 border-purple-500/30", desc: "Add cultural context or background" },
  spelling:     { label: "Spelling",     color: "bg-orange-500/20 text-orange-400 border-orange-500/30", desc: "Fix incorrect spelling of words" },
  phonetics:    { label: "Phonetics",    color: "bg-pink-500/20 text-pink-400 border-pink-500/30", desc: "Teach pronunciation and sound patterns" },
  terminology:  { label: "Terminology",  color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", desc: "Define specialized terms and concepts" },
};

// Build flat list of all languages
const ALL_LANGUAGES = Array.from(
  new Map(
    NIGERIAN_LANGUAGES.flatMap(region =>
      region.languages.map(lang => [lang.id, { id: lang.id, name: lang.name }] as const)
    )
  ).values()
).sort((a, b) => a.name.localeCompare(b.name));

const INPUT_CLASS = "w-full bg-[#0F0F0F] border border-[#3A3A3A] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#4A4A4A] focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-[#5A5A40] transition-colors";

function LexiconManager() {
  const { allEntries, categories, loading } = useLexicon();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState({
    edoWord: "", english: "", phonetic: "", category: "General", context: "",
    audioBlob: null as Blob | null, audioUrl: null as string | null,
  });
  const [saving, setSaving] = useState(false);

  const filtered = allEntries.filter(entry => {
    const needle = search.trim().toLowerCase();
    const matchesSearch = !needle || [entry.edoWord, entry.english, entry.phonetic, entry.context]
      .some(value => String(value || "").toLowerCase().includes(needle));
    return matchesSearch && (category === "all" || entry.category === category);
  });

  const beginEdit = (entry: LexiconEntry) => {
    setEditingId(entry.id);
    setIsAdding(false);
    setDraft({
      edoWord: entry.edoWord,
      english: entry.english,
      phonetic: entry.phonetic,
      category: entry.category || "General",
      context: entry.context || "",
      audioBlob: null,
      audioUrl: entry.audioUrl || null,
    });
  };

  const saveEntry = async () => {
    if (!draft.edoWord.trim() || !draft.english.trim()) return;
    setSaving(true);
    try {
      const id = (editingId || draft.edoWord).trim();
      const updateData: Record<string, unknown> = {
        translation: draft.edoWord.trim(),
        word: draft.english.trim(),
        phonetic: draft.phonetic.trim(),
        category: draft.category.trim() || "General",
        context: draft.context.trim() || null,
        deleted: false,
        updatedAt: serverTimestamp(),
      };
      if (draft.audioBlob && draft.audioBlob.size > 0) {
        updateData.audioUrl = await uploadAudio(
          `vocab-audio/core-${Date.now()}-${draft.edoWord.trim().slice(0, 40)}.webm`,
          draft.audioBlob
        );
      } else if (draft.audioUrl === null) {
        updateData.audioUrl = null;
      }
      await setDoc(doc(db, "coreVocabAudio", id), updateData, { merge: true });
      setEditingId(null);
      setIsAdding(false);
      setDraft({ edoWord: "", english: "", phonetic: "", category: "General", context: "", audioBlob: null, audioUrl: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/permission|insufficient permissions|unauthenticated/i.test(message)) {
        alert("Lexicon saving requires a Firebase-authenticated admin session. Sign out, sign in with the provisioned admin Firebase account, and try again. If the account is not provisioned yet, add it in Firebase Authentication and redeploy firestore.rules.");
      } else {
        alert("Failed to save lexicon entry: " + message);
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entry: LexiconEntry) => {
    if (!confirm(`Delete "${entry.edoWord}" from the language lexicon?`)) return;
    setSaving(true);
    try {
      // Debug: Log current auth state
      const currentUser = auth.currentUser;
      console.log('[AdminTraining] Current user:', {
        uid: currentUser?.uid,
        email: currentUser?.email,
        emailVerified: currentUser?.emailVerified
      });
      
      // Get and log the ID token
      if (currentUser) {
        const token = await currentUser.getIdToken();
        const tokenResult = await currentUser.getIdTokenResult();
        console.log('[AdminTraining] Token claims:', tokenResult.claims);
      }
      
      // A tombstone is required for built-in repository words; deleting only
      // the override would cause the static word to return on the next load.
      await setDoc(doc(db, "coreVocabAudio", entry.id), {
        deleted: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      if (editingId === entry.id) setEditingId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert("Failed to delete lexicon entry: " + message);
      console.error('[AdminTraining] Delete error:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetEditor = () => {
    setEditingId(null);
    setIsAdding(false);
    setDraft({ edoWord: "", english: "", phonetic: "", category: "General", context: "", audioBlob: null, audioUrl: null });
  };

  const editor = (
    <div className="grid md:grid-cols-2 gap-3 p-4 bg-[#0F0F0F] border border-[#00ff88]/20 rounded-2xl">
      <input className={INPUT_CLASS} value={draft.edoWord} onChange={e => setDraft({ ...draft, edoWord: e.target.value })} placeholder="Edo word or sentence *" />
      <input className={INPUT_CLASS} value={draft.english} onChange={e => setDraft({ ...draft, english: e.target.value })} placeholder="English meaning *" />
      <input className={INPUT_CLASS} value={draft.phonetic} onChange={e => setDraft({ ...draft, phonetic: e.target.value })} placeholder="Phonetics / pronunciation" />
      <input className={INPUT_CLASS} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} placeholder="Category, e.g. Greetings & Courtesy" />
      <input className={INPUT_CLASS + " md:col-span-2"} value={draft.context} onChange={e => setDraft({ ...draft, context: e.target.value })} placeholder="Usage, grammar, source, or correction note" />
      <div className="md:col-span-2 rounded-xl border border-white/10 bg-black/20 p-3">
        <label className="text-[9px] uppercase tracking-widest text-white/60 font-bold block mb-2">
          Audio pronunciation
        </label>
        <AudioRecorder
          existingUrl={draft.audioUrl}
          onRecorded={(blob, url) => setDraft(current => ({
            ...current,
            audioBlob: blob.size > 0 ? blob : null,
            audioUrl: url || null,
          }))}
        />
      </div>
      <div className="md:col-span-2 flex justify-end gap-2">
        <button type="button" onClick={resetEditor} className="px-4 py-2 rounded-xl bg-[#2A2A2A] text-white/60 text-xs font-bold">Cancel</button>
        <button type="button" disabled={saving} onClick={saveEntry} className="px-4 py-2 rounded-xl bg-[#00ff88] text-black text-xs font-bold flex items-center gap-2">
          <Save size={13} /> {saving ? "Saving..." : "Save lexicon entry"}
        </button>
      </div>
    </div>
  );

  return (
    <section className="mb-10 p-6 rounded-3xl border border-[#00ff88]/20 bg-[#141414]">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2"><Globe size={19} className="text-[#00ff88]" /> Language Lexicon</h2>
          <p className="text-xs text-white/50 mt-1">Browse and correct every word currently available to the assistant.</p>
        </div>
        <button type="button" onClick={() => { resetEditor(); setIsAdding(true); }} className="px-4 py-2 rounded-xl bg-[#00ff88] text-black text-xs font-bold flex items-center gap-2">
          <Plus size={14} /> Add word or sentence
        </button>
      </div>
      <div className="grid md:grid-cols-[1fr_220px] gap-3 mb-5">
        <input className={INPUT_CLASS} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search words, meanings, phonetics, or notes..." />
        <select className={INPUT_CLASS} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="all">All categories ({allEntries.length})</option>
          {categories.map(item => <option key={item.category} value={item.category}>{item.category} ({item.entries.length})</option>)}
        </select>
      </div>
      {isAdding && <div className="mb-5">{editor}</div>}
      {loading ? <p className="text-sm text-white/40 py-6">Loading language lexicon...</p> : (
        <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
          {filtered.map(entry => (
            <div key={entry.id} className="p-4 rounded-2xl border border-white/10 bg-white/[0.03]">
              {editingId === entry.id ? editor : (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white">{entry.edoWord}</span>
                      <span className="text-[9px] uppercase tracking-widest px-2 py-1 rounded-full bg-[#00ff88]/10 text-[#00ff88]">{entry.category}</span>
                      {entry.isSeeded && <span className="text-[9px] uppercase tracking-widest text-white/30">Built-in</span>}
                    </div>
                    <p className="text-sm text-white/70 mt-1">{entry.english}</p>
                    <p className="text-xs text-[#8A8A60] mt-1">/{entry.phonetic || "phonetics not added"}/</p>
                    {entry.context && <p className="text-xs text-white/40 mt-2">{entry.context}</p>}
                    <div className="mt-3">
                      {entry.audioUrl ? (
                        <button
                          type="button"
                          onClick={() => new Audio(entry.audioUrl).play()}
                          className="px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                        >
                          <Play size={11} fill="currentColor" /> Play pronunciation
                        </button>
                      ) : (
                        <span className="text-[10px] text-white/30 uppercase tracking-wider">No audio uploaded</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => beginEdit(entry)} className="px-3 py-2 rounded-lg bg-white/5 text-white/60 hover:text-[#00ff88] text-xs font-bold flex items-center gap-1.5">
                      <Edit2 size={13} /> Correct
                    </button>
                    <button type="button" disabled={saving} onClick={() => deleteEntry(entry)} className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-white/40 py-8 text-center">No lexicon entries match this search.</p>}
        </div>
      )}
    </section>
  );
}

const STARTER_ENTRIES: TrainingEntry[] = [
  {
    id: 'starter-edo-greeting',
    type: 'conversation',
    language: 'edo',
    languageName: 'Edo (Bini)',
    nativeText: 'Kọyọ, vbèè oye hẹ?',
    englishText: 'Hello, how are you?',
    phonetics: 'ko-yo, veh-eh oh-yeh heh',
    context: 'Common greeting',
    createdAt: null,
  },
  {
    id: 'starter-pidgin-greeting',
    type: 'conversation',
    language: 'pidgin',
    languageName: 'Nigerian Pidgin English',
    nativeText: 'How you dey?',
    englishText: 'How are you?',
    phonetics: 'how you day',
    context: 'Informal everyday greeting',
    createdAt: null,
  },
  {
    id: 'starter-yoruba-greeting',
    type: 'vocabulary',
    language: 'yoruba',
    languageName: 'Yoruba',
    nativeText: 'Báwo ni?',
    englishText: 'How are you?',
    phonetics: 'bah-woh nee',
    context: 'Everyday greeting',
    createdAt: null,
  },
  {
    id: 'starter-igbo-thanks',
    type: 'vocabulary',
    language: 'igbo',
    languageName: 'Igbo',
    nativeText: 'Daalụ',
    englishText: 'Thank you',
    phonetics: 'dah-loo',
    context: 'Expression of thanks',
    createdAt: null,
  },
  {
    id: 'starter-hausa-greeting',
    type: 'vocabulary',
    language: 'hausa',
    languageName: 'Hausa',
    nativeText: 'Sannu',
    englishText: 'Hello / Welcome',
    phonetics: 'san-noo',
    context: 'Greeting or welcome',
    createdAt: null,
  },
];

const LANGUAGE_PROFILE_ENTRIES: TrainingEntry[] = NIGERIAN_LANGUAGES.flatMap(region =>
  region.languages.map(language => ({
    id: `profile-${language.id}`,
    type: 'culture' as const,
    language: language.id,
    languageName: language.name,
    nativeText: `${language.name} language profile`,
    englishText: `${language.description} Speakers: ${language.speakers}. Region: ${region.name}.`,
    phonetics: 'Native pronunciation pending verification',
    context: 'Starter profile awaiting native-speaker verification',
    createdAt: null,
  }))
);

function mergeTrainingEntries(liveEntries: TrainingEntry[]): TrainingEntry[] {
  const liveLanguages = new Set(liveEntries.map(entry => entry.language));
  return [
    ...liveEntries,
    ...LANGUAGE_PROFILE_ENTRIES.filter(entry => !liveLanguages.has(entry.language)),
    ...STARTER_ENTRIES.filter(entry => !liveLanguages.has(entry.language)),
  ];
}

export default function AdminTraining({ selectedLanguage }: { selectedLanguage?: string } = {}) {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<TrainingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [filter, setFilter] = useState<TrainingType | "all">("all");
  const [languageFilter, setLanguageFilter] = useState<string>(selectedLanguage || "all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fallbackTimer = window.setTimeout(() => {
      setEntries(current => current.length > 0 ? current : mergeTrainingEntries([]));
      setLoading(false);
    }, 1500);
    const q = query(collection(db, "aiTraining"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const liveEntries = snap.docs.map(d => {
        const data = d.data();
        // Migrate old entries that only have edoText
        if (data.edoText && !data.nativeText) {
          return {
            id: d.id,
            ...data,
            nativeText: data.edoText,
            language: 'edo',
            languageName: 'Edo'
          } as TrainingEntry;
        }
        return { id: d.id, ...data } as TrainingEntry;
      });
      setEntries(mergeTrainingEntries(liveEntries));
      setLoading(false);
      window.clearTimeout(fallbackTimer);
    }, (error) => {
      console.warn('[AdminTraining] Using starter training entries:', error);
      setEntries(mergeTrainingEntries([]));
      setLoading(false);
      window.clearTimeout(fallbackTimer);
    });
    return () => {
      window.clearTimeout(fallbackTimer);
      unsub();
    };
  }, []);

  const deleteEntry = async (id: string) => {
    if (!confirm("Delete this training entry?")) return;
    await deleteDoc(doc(db, "aiTraining", id));
  };

  const filtered = entries.filter(e => {
    const matchesType = filter === "all" || e.type === filter;
    const matchesLang = languageFilter === "all" || e.language === languageFilter;
    return matchesType && matchesLang;
  });
  
  const counts = entries.reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {} as Record<string, number>);
  const langCounts = entries.reduce((acc, e) => { acc[e.language] = (acc[e.language] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 text-white">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00ff88] rounded-2xl flex items-center justify-center">
              <Sparkles size={20} className="text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-black">AI Training Studio</h1>
              <p className="text-xs text-white/40 uppercase tracking-widest">Train BLACK AI in all African languages</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/agents')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-sm font-bold hover:bg-blue-500/30 transition-all"
          >
            <Users size={16} />
            Manage Agents
          </button>
        </div>
        <div className="p-4 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-2xl text-sm text-white/80 leading-relaxed">
          <Info size={14} className="inline mr-2 text-[#00ff88]" />
          Train the AI in any Nigerian/African language. Add vocabulary, correct spellings, teach phonetics, fix grammar mistakes, and provide audio pronunciations.
        </div>
      </div>

      <LexiconManager />

      {/* Language Filter */}
      <div className="mb-6 p-4 bg-black/30 border border-white/10 rounded-2xl">
        <div className="flex items-center gap-3 mb-3">
          <Globe size={16} className="text-[#00ff88]" />
          <label className="text-sm font-bold text-white">Filter by Language</label>
        </div>
        <select 
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value)}
          className="w-full bg-[#0F0F0F] border border-[#3A3A3A] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#00ff88] focus:border-[#00ff88]"
        >
          <option value="all">All Languages ({entries.length} total entries)</option>
          {ALL_LANGUAGES.map(lang => (
            <option key={lang.id} value={lang.id}>
              {lang.name} {langCounts[lang.id] ? `(${langCounts[lang.id]})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Type Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
        {(Object.keys(TYPE_LABELS) as TrainingType[]).map(type => (
          <button key={type} onClick={() => setFilter(filter === type ? "all" : type)}
            className={"p-3 rounded-2xl border text-center transition-all " + (filter === type ? TYPE_LABELS[type].color : "bg-[#1A1A1A] border-[#2A2A2A] text-[#5A5A5A] hover:border-[#00ff88]/30")}>
            <div className="text-xl font-bold">{counts[type] || 0}</div>
            <div className="text-[9px] uppercase tracking-widest mt-0.5">{TYPE_LABELS[type].label}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-white/60">
          {filtered.length} {filter === "all" ? "total" : TYPE_LABELS[filter as TrainingType].label.toLowerCase()} entries
          {languageFilter !== "all" && ` in ${ALL_LANGUAGES.find(l => l.id === languageFilter)?.name}`}
        </p>
        <div className="flex items-center gap-3">
          <button onClick={() => { setIsAdding(false); setIsBulkAdding(v => !v); }}
            className={"flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all " + (isBulkAdding ? "bg-[#2A2A2A] text-white/60" : "bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30")}>
            {isBulkAdding ? <X size={16} /> : <Upload size={16} />}
            {isBulkAdding ? "Cancel" : "Bulk Paste"}
          </button>
          <button onClick={() => { setIsBulkAdding(false); setIsAdding(v => !v); }}
            className={"flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all " + (isAdding ? "bg-[#2A2A2A] text-white/60" : "bg-[#00ff88] text-black hover:bg-[#00ff88]/90")}>
            {isAdding ? <X size={16} /> : <Plus size={16} />}
            {isAdding ? "Cancel" : "Add Single Entry"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isBulkAdding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-8">
            <BulkAddForm onDone={() => setIsBulkAdding(false)} defaultLanguage={languageFilter !== "all" ? languageFilter : undefined} />
          </motion.div>
        )}
        {isAdding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-8">
            <AddTrainingForm onDone={() => setIsAdding(false)} defaultLanguage={languageFilter !== "all" ? languageFilter : undefined} />
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center py-20 text-white/40">Loading training data...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-3xl text-white/30">
          <Sparkles size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No entries yet. Add training data to improve the AI.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => (
            <TrainingCard key={entry.id} entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              onDelete={() => deleteEntry(entry.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function AudioRecorder({ onRecorded, existingUrl }: { onRecorded: (blob: Blob, url: string) => void; existingUrl?: string | null }) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingUrl ?? null);
  const recorderRef = useRef<{ stop: () => void } | null>(null);
  const timerRef = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setPreviewUrl(existingUrl ?? null); }, [existingUrl]);

  const start = async () => {
    setIsRecording(true); setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    const recorder = recordAudioBlob((s) => { if (s === "error" || s === "done") { setIsRecording(false); clearInterval(timerRef.current); } });
    recorderRef.current = recorder;
    const { blob } = await recorder.promise;
    setIsRecording(false); clearInterval(timerRef.current); recorderRef.current = null;
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    onRecorded(blob, url);
  };

  const stop = () => { recorderRef.current?.stop(); recorderRef.current = null; setIsRecording(false); clearInterval(timerRef.current); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    onRecorded(f, url);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={isRecording ? stop : start}
          className={"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all " + (isRecording ? "bg-red-500 text-white animate-pulse" : "bg-[#5A5A40] text-white hover:bg-[#6A6A50]")}>
          {isRecording ? <Square size={10} fill="currentColor" /> : <Mic size={10} />}
          {isRecording ? "Stop (" + seconds + "s)" : "Record"}
        </button>
        <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleFile} />
        <button type="button" onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#2A2A2A] text-[#8A8A60] hover:bg-[#3A3A3A] transition-all">
          <Upload size={10} /> Upload
        </button>
        {previewUrl && (
          <>
            <button type="button" onClick={() => new Audio(previewUrl).play()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all">
              <Play size={10} fill="currentColor" /> Preview
            </button>
            <button type="button" onClick={() => { setPreviewUrl(null); onRecorded(new Blob(), ""); }}
              className="p-1.5 text-[#3A3A3A] hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
          </>
        )}
      </div>
      {isRecording && <p className="text-[9px] text-red-400 animate-pulse font-bold uppercase">Recording... press Stop when done</p>}
      {previewUrl && !isRecording && <p className="text-[9px] text-green-400 font-bold uppercase">Audio ready</p>}
    </div>
  );
}

function TrainingCard({ entry, expanded, onToggle, onDelete }: { entry: TrainingEntry; expanded: boolean; onToggle: () => void; onDelete: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editNativeText, setEditNativeText] = useState(entry.nativeText);
  const [editEnglishText, setEditEnglishText] = useState(entry.englishText);
  const [editPhonetics, setEditPhonetics] = useState(entry.phonetics || "");
  const [editContext, setEditContext] = useState(entry.context || "");
  const [editCorrection, setEditCorrection] = useState(entry.correction || "");
  const [editAudioBlob, setEditAudioBlob] = useState<Blob | null>(null);
  const [editAudioUrl, setEditAudioUrl] = useState<string | null>(entry.audioUrl ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const meta = TYPE_LABELS[entry.type];

  useEffect(() => {
    setEditNativeText(entry.nativeText); 
    setEditEnglishText(entry.englishText);
    setEditPhonetics(entry.phonetics || "");
    setEditContext(entry.context || ""); 
    setEditCorrection(entry.correction || "");
    setEditAudioUrl(entry.audioUrl ?? null); 
    setEditAudioBlob(null);
  }, [entry]);

  const openEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    if (!expanded) onToggle();
  };

  const saveEdits = async () => {
    if (!editNativeText.trim() || !editEnglishText.trim()) return;
    setIsSaving(true);
    try {
      let audioUrl: string | undefined = entry.audioUrl;
      if (editAudioBlob && editAudioBlob.size > 0) {
        audioUrl = await uploadAudio("training-audio/" + Date.now() + "-" + editNativeText.slice(0, 20) + ".webm", editAudioBlob);
      }
      const updateData: any = {
        nativeText: editNativeText.trim(), 
        englishText: editEnglishText.trim(), 
        phonetics: editPhonetics.trim() || null,
        updatedAt: serverTimestamp(),
        context: editContext.trim() || null, 
        correction: editCorrection.trim() || null,
      };
      if (audioUrl) updateData.audioUrl = audioUrl;
      await updateDoc(doc(db, "aiTraining", entry.id), updateData);
      setEditAudioBlob(null); setIsEditing(false);
    } catch (err) {
      alert("Failed to save: " + (err instanceof Error ? err.message : String(err)));
    } finally { setIsSaving(false); }
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden hover:border-[#00ff88]/20 transition-colors">
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={onToggle}>
        <span className={"text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border shrink-0 " + meta.color}>{meta.label}</span>
        <div className="text-[10px] px-2 py-1 bg-[#00ff88]/10 text-[#00ff88] rounded-full font-bold uppercase tracking-wider">
          {entry.languageName}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{entry.nativeText}</div>
          <div className="text-xs text-white/60 truncate">{entry.englishText}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {entry.audioUrl && (
            <button onClick={e => { e.stopPropagation(); new Audio(entry.audioUrl!).play(); }}
              className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Play audio"><Volume2 size={14} /></button>
          )}
          <button onClick={openEdit} className="p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors" title="Edit"><Edit2 size={14} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete"><Trash2 size={14} /></button>
          {expanded ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-5 border-t border-[#2A2A2A]">
              {isEditing ? (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 pb-1">
                    <Edit2 size={12} className="text-[#00ff88]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#00ff88]">Editing Entry — all fields replaceable</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] uppercase tracking-widest text-white/60 font-bold block mb-1">{entry.languageName} Text *</label>
                      <textarea value={editNativeText} onChange={e => setEditNativeText(e.target.value)} rows={3}
                        className={INPUT_CLASS + " resize-none"} placeholder={`Text in ${entry.languageName}`} />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-widest text-white/60 font-bold block mb-1">English Meaning *</label>
                      <textarea value={editEnglishText} onChange={e => setEditEnglishText(e.target.value)} rows={3}
                        className={INPUT_CLASS + " resize-none"} placeholder="English translation" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-widest text-white/60 font-bold block mb-1">Phonetics / Pronunciation</label>
                    <input value={editPhonetics} onChange={e => setEditPhonetics(e.target.value)} className={INPUT_CLASS} 
                      placeholder="How to pronounce (e.g., ko-yo, or IPA: /kɔjɔ/)" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-widest text-white/60 font-bold block mb-1">Context / Usage Note</label>
                    <input value={editContext} onChange={e => setEditContext(e.target.value)} className={INPUT_CLASS} placeholder="Optional usage context" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-widest text-red-400 font-bold block mb-1">Correction Note</label>
                    <input value={editCorrection} onChange={e => setEditCorrection(e.target.value)}
                      className={INPUT_CLASS + " border-red-500/20 focus:ring-red-500/40"} placeholder="What the AI said wrong and what it should say" />
                  </div>
                  <div className="p-3 bg-black/30 rounded-xl border border-white/10">
                    <label className="text-[9px] uppercase tracking-widest text-white/60 font-bold block mb-2">
                      Audio Pronunciation {entry.audioUrl ? "(replace existing)" : "(optional)"}
                    </label>
                    <AudioRecorder
                      existingUrl={editAudioUrl}
                      onRecorded={(blob, url) => { setEditAudioBlob(blob.size > 0 ? blob : null); setEditAudioUrl(url || null); }}
                    />
                    {!editAudioBlob && entry.audioUrl && <p className="text-[9px] text-blue-400 font-bold uppercase mt-1">Existing audio saved — record new to replace</p>}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={saveEdits} disabled={isSaving || !editNativeText.trim() || !editEnglishText.trim()}
                      className="flex items-center gap-1.5 px-5 py-2 bg-[#00ff88] text-black rounded-xl text-sm font-bold hover:bg-[#00ff88]/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-1 justify-center">
                      <Save size={14} /> {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                    <button onClick={() => { setIsEditing(false); setEditAudioBlob(null); setEditAudioUrl(entry.audioUrl ?? null); }}
                      className="px-5 py-2 border border-white/20 text-white/60 rounded-xl text-sm font-bold hover:bg-white/5 transition-all">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-4">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">{entry.languageName}</p>
                      <p className="text-base font-serif text-white">{entry.nativeText}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">English</p>
                      <p className="text-sm text-white/80">{entry.englishText}</p>
                    </div>
                  </div>
                  {entry.phonetics && (
                    <div className="p-3 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-xl">
                      <p className="text-[9px] uppercase tracking-widest text-[#00ff88] mb-1">Phonetics / Pronunciation</p>
                      <p className="text-sm text-white font-mono">{entry.phonetics}</p>
                    </div>
                  )}
                  {entry.context && <div><p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Context</p><p className="text-xs text-white/60">{entry.context}</p></div>}
                  {entry.correction && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-[9px] uppercase tracking-widest text-red-400 mb-1">Correction</p>
                      <p className="text-xs text-white/80">{entry.correction}</p>
                    </div>
                  )}
                  {entry.audioUrl && (
                    <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <Volume2 size={16} className="text-blue-400 shrink-0" />
                      <div className="flex-1"><p className="text-[9px] uppercase tracking-widest text-blue-400">Audio Saved</p></div>
                      <button onClick={() => new Audio(entry.audioUrl!).play()}
                        className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-500/30 transition-colors flex items-center gap-1">
                        <Play size={12} fill="currentColor" /> Play
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BulkAddForm({ onDone, defaultLanguage }: { onDone: () => void; defaultLanguage?: string }) {
  const [inputMode, setInputMode] = useState<'smart' | 'structured' | 'freeform'>('smart');
  const [type, setType] = useState<TrainingType>("vocabulary");
  const [language, setLanguage] = useState(defaultLanguage || "edo");
  const [bulkText, setBulkText] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const selectedLanguage = ALL_LANGUAGES.find(l => l.id === language) || ALL_LANGUAGES[0];

  const parseBulkText = (text: string) => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const entries: any[] = [];

    for (const line of lines) {
      // Support multiple formats:
      // 1. Tab-separated: word\tmeaning\tphonetics\tcontext
      // 2. Pipe-separated: word | meaning | phonetics | context
      // 3. Comma-separated: word, meaning, phonetics, context
      const parts = line.includes('\t') 
        ? line.split('\t')
        : line.includes('|')
        ? line.split('|').map(p => p.trim())
        : line.split(',').map(p => p.trim());

      if (parts.length >= 2) {
        entries.push({
          nativeText: parts[0]?.trim() || '',
          englishText: parts[1]?.trim() || '',
          phonetics: parts[2]?.trim() || '',
          context: parts[3]?.trim() || '',
          type: type // Use manually selected type for structured mode
        });
      }
    }

    return entries;
  };

  const analyzeWithAI = async (text: string): Promise<any[]> => {
    setAnalyzing(true);
    try {
      // Call AI to analyze and categorize the content
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
            content: `Analyze this ${selectedLanguage.name} language material and extract training data:\n\n${text}`
          }]
        })
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.content || '';
      
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed) ? parsed : [];
      }
      
      return [];
    } catch (error) {
      console.error('AI analysis failed:', error);
      alert('AI analysis failed. Try structured paste instead.');
      return [];
    } finally {
      setAnalyzing(false);
    }
  };

  const extractFromFreeform = (text: string): any[] => {
    // Simple extraction for free-form text
    // Look for patterns like "word - meaning" or "word: meaning"
    const entries: any[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Pattern 1: "word - meaning"
      let match = trimmed.match(/^(.+?)\s*[-–—]\s*(.+)$/);
      if (match) {
        entries.push({
          nativeText: match[1].trim(),
          englishText: match[2].trim(),
          phonetics: '',
          context: '',
          type: 'vocabulary'
        });
        continue;
      }

      // Pattern 2: "word: meaning"
      match = trimmed.match(/^(.+?)\s*:\s*(.+)$/);
      if (match) {
        entries.push({
          nativeText: match[1].trim(),
          englishText: match[2].trim(),
          phonetics: '',
          context: '',
          type: 'vocabulary'
        });
        continue;
      }

      // Pattern 3: Quoted phrases with translations
      match = trimmed.match(/["'](.+?)["']\s+(?:means?|translates?\s+to|is)\s+["'](.+?)["']/i);
      if (match) {
        entries.push({
          nativeText: match[1].trim(),
          englishText: match[2].trim(),
          phonetics: '',
          context: '',
          type: 'conversation'
        });
        continue;
      }

      // If line seems substantial, treat as cultural/grammar context
      if (trimmed.length > 50 && trimmed.split(' ').length > 5) {
        entries.push({
          nativeText: `${selectedLanguage.name} cultural note`,
          englishText: trimmed,
          phonetics: '',
          context: 'Extracted from research material',
          type: 'culture'
        });
      }
    }

    return entries;
  };

  const handlePreview = async () => {
    let parsed: any[] = [];

    if (inputMode === 'smart') {
      // AI-powered analysis and categorization
      parsed = await analyzeWithAI(bulkText);
    } else if (inputMode === 'structured') {
      // Manual structured format
      parsed = parseBulkText(bulkText);
    } else {
      // Free-form extraction
      parsed = extractFromFreeform(bulkText);
    }

    setPreview(parsed);
  };

  const handleSaveAll = async () => {
    if (preview.length === 0) {
      alert("Please preview entries first before saving.");
      return;
    }

    setSaving(true);
    try {
      let successCount = 0;
      for (const entry of preview) {
        if (!entry.nativeText || !entry.englishText) continue;

        const trainingEntry: any = {
          type: entry.type || type, // Use AI-detected type or fallback to manual selection
          language: selectedLanguage.id,
          languageName: selectedLanguage.name,
          nativeText: entry.nativeText,
          englishText: entry.englishText,
          phonetics: entry.phonetics || null,
          context: entry.context || null,
          createdAt: serverTimestamp()
        };

        await addDoc(collection(db, "aiTraining"), trainingEntry);
        successCount++;
      }

      alert(`✅ Successfully added ${successCount} training entries!`);
      onDone();
    } catch (err) {
      alert("Failed to save: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#1A1A1A] border border-purple-500/20 rounded-3xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-purple-500 rounded-xl flex items-center justify-center"><Upload size={16} className="text-white" /></div>
        <div>
          <h3 className="font-black text-lg">Bulk Paste Training Data</h3>
          <p className="text-xs text-white/40">Paste research materials - AI will analyze and categorize automatically</p>
        </div>
      </div>

      {/* Input Mode Selection */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-3 block">
          Choose Input Method
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setInputMode('smart')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              inputMode === 'smart'
                ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                : 'bg-[#0F0F0F] border-[#2A2A2A] text-white/60 hover:border-purple-500/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className={inputMode === 'smart' ? 'text-purple-400' : 'text-white/40'} />
              <span className="font-bold text-sm">Smart AI Paste</span>
            </div>
            <p className="text-xs text-white/50">
              Paste any research text, articles, or notes. AI analyzes and categorizes automatically.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('structured')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              inputMode === 'structured'
                ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                : 'bg-[#0F0F0F] border-[#2A2A2A] text-white/60 hover:border-blue-500/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Upload size={16} className={inputMode === 'structured' ? 'text-blue-400' : 'text-white/40'} />
              <span className="font-bold text-sm">Structured Paste</span>
            </div>
            <p className="text-xs text-white/50">
              Paste formatted data: Word | Meaning | Phonetics | Context (one per line)
            </p>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('freeform')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              inputMode === 'freeform'
                ? 'bg-green-500/20 border-green-500 text-green-400'
                : 'bg-[#0F0F0F] border-[#2A2A2A] text-white/60 hover:border-green-500/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Info size={16} className={inputMode === 'freeform' ? 'text-green-400' : 'text-white/40'} />
              <span className="font-bold text-sm">Free-form Paste</span>
            </div>
            <p className="text-xs text-white/50">
              Paste unstructured text with words/phrases. Extracts patterns like "word - meaning"
            </p>
          </button>
        </div>
      </div>

      {/* Language Selection */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-2 block flex items-center gap-2">
          <Globe size={12} className="text-purple-400" />
          Select Language *
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full bg-[#0F0F0F] border border-[#3A3A3A] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          {ALL_LANGUAGES.map(lang => (
            <option key={lang.id} value={lang.id}>{lang.name}</option>
          ))}
        </select>
      </div>

      {/* Entry Type - Only show for structured mode */}
      {inputMode === 'structured' && (
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-2 block">Entry Type</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TYPE_LABELS) as TrainingType[]).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={"px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all " + (type === t ? TYPE_LABELS[t].color : "bg-transparent border-[#2A2A2A] text-white/40 hover:border-purple-500/30")}>
                {TYPE_LABELS[t].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Instructions - Dynamic based on mode */}
      <div className={`border rounded-2xl p-4 ${
        inputMode === 'smart' ? 'bg-purple-500/10 border-purple-500/20' :
        inputMode === 'structured' ? 'bg-blue-500/10 border-blue-500/20' :
        'bg-green-500/10 border-green-500/20'
      }`}>
        <h4 className={`text-xs font-bold mb-2 ${
          inputMode === 'smart' ? 'text-purple-400' :
          inputMode === 'structured' ? 'text-blue-400' :
          'text-green-400'
        }`}>
          📋 {inputMode === 'smart' ? 'Smart AI Analysis' : inputMode === 'structured' ? 'Format Instructions' : 'Free-form Pattern Matching'}
        </h4>
        
        {inputMode === 'smart' && (
          <>
            <p className="text-xs text-white/60 leading-relaxed mb-2">
              Paste any text containing {selectedLanguage.name} language information. The AI will:
            </p>
            <ul className="text-xs text-white/60 space-y-1 ml-4">
              <li>• Extract vocabulary words and their meanings</li>
              <li>• Identify conversation phrases and dialogues</li>
              <li>• Detect grammar rules and patterns</li>
              <li>• Find cultural context and usage notes</li>
              <li>• Automatically categorize each item</li>
            </ul>
            <p className="text-xs text-purple-400 mt-2 font-bold">
              Just paste paragraphs, articles, or notes - AI handles the rest!
            </p>
          </>
        )}

        {inputMode === 'structured' && (
          <>
            <p className="text-xs text-white/60 leading-relaxed mb-2">
              Paste data with each entry on a new line. Separate fields with <strong>|</strong> (pipe), <strong>Tab</strong>, or <strong>,</strong> (comma):
            </p>
            <div className="bg-black/40 rounded-lg p-3 font-mono text-xs text-white/80 space-y-1">
              <div>{selectedLanguage.name} Word | English Meaning | Phonetics | Context</div>
              <div className="text-blue-300">Ọmọ | Child | oh-moh | Used for any young person</div>
              <div className="text-blue-300">Odabo | Goodbye | oh-dah-boh | Formal parting phrase</div>
            </div>
            <p className="text-xs text-white/40 mt-2">
              <strong>Minimum:</strong> Native Text and English Meaning. Phonetics and Context are optional.
            </p>
          </>
        )}

        {inputMode === 'freeform' && (
          <>
            <p className="text-xs text-white/60 leading-relaxed mb-2">
              Paste unstructured text. The system will detect these patterns:
            </p>
            <div className="bg-black/40 rounded-lg p-3 text-xs text-white/80 space-y-1">
              <div className="text-green-300">• Word - Meaning (dash separator)</div>
              <div className="text-green-300">• Word: Meaning (colon separator)</div>
              <div className="text-green-300">• "Phrase" means "Translation"</div>
              <div className="text-green-300">• Cultural notes (long sentences)</div>
            </div>
            <p className="text-xs text-white/40 mt-2">
              Works well with copied text from websites, documents, or notes.
            </p>
          </>
        )}
      </div>

      {/* Bulk Text Input */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-2 block">
          Paste {inputMode === 'smart' ? 'Research Material' : inputMode === 'structured' ? 'Training Data' : 'Text with Vocabulary'} *
        </label>
        <textarea
          value={bulkText}
          onChange={e => setBulkText(e.target.value)}
          rows={12}
          placeholder={
            inputMode === 'smart' 
              ? `Paste any article, research notes, or language learning materials about ${selectedLanguage.name}. AI will extract and categorize everything automatically.\n\nExample:\n"The Edo people greet with 'Kọyọ' (ko-yo) which means hello. In formal settings, they say 'Ọghọ' to show respect. Common phrases include 'Vbèè oye hẹ?' meaning 'how are you?'..."`
              : inputMode === 'structured'
              ? `Example:\n${selectedLanguage.name} Word | English | Phonetics | Context\nWord 1 | Meaning 1 | Pronunciation 1 | Usage 1\nWord 2 | Meaning 2 | Pronunciation 2 | Usage 2`
              : `Example:\nỌmọ - Child\nOdabo: Goodbye\n"Báwo ni?" means "How are you?"\n\nIn Yoruba culture, greetings are very important and show respect...`
          }
          className={INPUT_CLASS + " resize-none font-mono text-xs"}
        />
        <p className="text-xs text-white/40 mt-1">
          {bulkText.trim().split('\n').filter(l => l.trim()).length} lines • {bulkText.length} characters
        </p>
      </div>

      {/* Preview Button */}
      <button
        type="button"
        onClick={handlePreview}
        disabled={!bulkText.trim() || analyzing}
        className={`w-full px-4 py-2.5 rounded-xl border text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          inputMode === 'smart' 
            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30'
            : inputMode === 'structured'
            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30'
            : 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30'
        }`}
      >
        {analyzing ? (
          <>
            <Sparkles size={16} className="inline animate-spin mr-2" />
            AI Analyzing...
          </>
        ) : inputMode === 'smart' ? (
          <>
            <Sparkles size={16} className="inline mr-2" />
            Analyze with AI
          </>
        ) : (
          'Preview Parsed Entries'
        )}
      </button>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          <h4 className="text-xs font-bold text-white/60 uppercase tracking-widest sticky top-0 bg-[#1A1A1A] py-2 flex items-center justify-between">
            <span>Preview ({preview.length} entries)</span>
            {inputMode === 'smart' && (
              <span className="text-purple-400 normal-case">Auto-categorized by AI</span>
            )}
          </h4>
          {preview.map((entry, idx) => (
            <div key={idx} className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs space-y-1">
              <div className="flex items-start gap-2">
                <span className="text-white/40">#{idx + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold">{entry.nativeText}</span>
                    {entry.type && (
                      <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${TYPE_LABELS[entry.type as TrainingType]?.color || 'bg-gray-500/20 text-gray-400'}`}>
                        {TYPE_LABELS[entry.type as TrainingType]?.label || entry.type}
                      </span>
                    )}
                  </div>
                  <div className="text-white/70">{entry.englishText}</div>
                  {entry.phonetics && <div className="text-purple-400">/{entry.phonetics}/</div>}
                  {entry.context && <div className="text-white/40 italic">{entry.context}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={onDone}
          className="flex-1 px-4 py-2.5 rounded-xl bg-[#2A2A2A] text-white/60 text-sm font-bold hover:bg-[#3A3A3A] transition-all">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving || !bulkText.trim()}
          className="flex-1 px-4 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-bold hover:bg-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>Saving...</>
          ) : (
            <>
              <Upload size={16} />
              Save All Entries
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function AddTrainingForm({ onDone, defaultLanguage }: { onDone: () => void; defaultLanguage?: string }) {
  const [type, setType] = useState<TrainingType>("vocabulary");
  const [language, setLanguage] = useState(defaultLanguage || "edo");
  const [nativeText, setNativeText] = useState("");
  const [englishText, setEnglishText] = useState("");
  const [phonetics, setPhonetics] = useState("");
  const [context, setContext] = useState("");
  const [correction, setCorrection] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedLanguage = ALL_LANGUAGES.find(l => l.id === language) || ALL_LANGUAGES[0];

  const handleSave = async () => {
    if (!nativeText.trim() || !englishText.trim()) return;
    setSaving(true);
    try {
      let audioUrl: string | undefined;
      if (audioBlob && audioBlob.size > 0) {
        audioUrl = await uploadAudio("training-audio/" + Date.now() + "-" + nativeText.slice(0, 20) + ".webm", audioBlob);
      }
      const entry: any = { 
        type, 
        language: selectedLanguage.id,
        languageName: selectedLanguage.name,
        nativeText: nativeText.trim(), 
        englishText: englishText.trim(), 
        phonetics: phonetics.trim() || null,
        createdAt: serverTimestamp() 
      };
      if (context.trim()) entry.context = context.trim();
      if (correction.trim()) entry.correction = correction.trim();
      if (audioUrl) entry.audioUrl = audioUrl;
      await addDoc(collection(db, "aiTraining"), entry);
      onDone();
    } catch (err) {
      alert("Failed to save: " + (err instanceof Error ? err.message : String(err)));
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#00ff88]/20 rounded-3xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#00ff88] rounded-xl flex items-center justify-center"><Plus size={16} className="text-black" /></div>
        <h3 className="font-black text-lg">New Training Entry</h3>
      </div>

      {/* Language Selection */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-2 block flex items-center gap-2">
          <Globe size={12} className="text-[#00ff88]" />
          Select Language *
        </label>
        <select 
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full bg-[#0F0F0F] border border-[#3A3A3A] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#00ff88] focus:border-[#00ff88]"
        >
          {ALL_LANGUAGES.map(lang => (
            <option key={lang.id} value={lang.id}>{lang.name}</option>
          ))}
        </select>
        <p className="text-xs text-white/40 mt-2">Choose the African language you're training the AI on</p>
      </div>

      {/* Entry Type */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-2 block">Entry Type</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_LABELS) as TrainingType[]).map(t => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={"px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all " + (type === t ? TYPE_LABELS[t].color : "bg-transparent border-[#2A2A2A] text-white/40 hover:border-[#00ff88]/30")}>
              {TYPE_LABELS[t].label}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/40 mt-2">{TYPE_LABELS[type].desc}</p>
      </div>

      {/* Text Fields */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-2 block">{selectedLanguage.name} Text *</label>
          <textarea value={nativeText} onChange={e => setNativeText(e.target.value)} rows={3}
            placeholder={type === "conversation" ? "e.g. Natural phrase in " + selectedLanguage.name : "e.g. Word or term in " + selectedLanguage.name}
            className={INPUT_CLASS + " resize-none"} />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-2 block">English Meaning *</label>
          <textarea value={englishText} onChange={e => setEnglishText(e.target.value)} rows={3}
            placeholder={type === "conversation" ? "e.g. English translation" : "e.g. Definition or meaning"}
            className={INPUT_CLASS + " resize-none"} />
        </div>
      </div>

      {/* Phonetics */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-2 block">
          Phonetics / How to Pronounce (optional)
        </label>
        <input value={phonetics} onChange={e => setPhonetics(e.target.value)} className={INPUT_CLASS} 
          placeholder="e.g., ko-yo  or  IPA: /kɔjɔ/  or  sounds like 'co-yo'" />
        <p className="text-xs text-white/40 mt-1">Help users learn how to say this word correctly</p>
      </div>

      {/* Context */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-2 block">Context / Usage Note (optional)</label>
        <input value={context} onChange={e => setContext(e.target.value)} className={INPUT_CLASS} 
          placeholder="e.g. Used as a casual greeting between friends" />
      </div>

      {/* Correction (for correction type) */}
      {type === "correction" && (
        <div>
          <label className="text-[10px] uppercase tracking-widest text-red-400 font-bold mb-2 block">What the AI said wrong and what it should say</label>
          <input value={correction} onChange={e => setCorrection(e.target.value)}
            className={INPUT_CLASS + " border-red-500/30 focus:ring-red-500/50"} 
            placeholder='e.g. AI said "Koyo" but correct spelling is "Kòyó" with tone marks' />
        </div>
      )}

      {/* Audio */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-2 block">Audio Pronunciation (optional but highly recommended)</label>
        <AudioRecorder onRecorded={(blob) => setAudioBlob(blob.size > 0 ? blob : null)} />
        <p className="text-xs text-white/40 mt-2">Record native pronunciation to help the AI learn correct sounds</p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
        <button type="button" onClick={onDone} className="px-5 py-2.5 text-sm text-white/60 hover:text-white transition-colors">Cancel</button>
        <button type="button" onClick={handleSave} disabled={!nativeText.trim() || !englishText.trim() || saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#00ff88] text-black rounded-xl text-sm font-bold hover:bg-[#00ff88]/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          {saving ? "Saving..." : <><Save size={14} /> Save Training Entry</>}
        </button>
      </div>
    </div>
  );
}
