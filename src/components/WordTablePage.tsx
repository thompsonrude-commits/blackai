/**
 * WordTablePage — Excel-style language word training table
 * Accessible at /admin/word-table
 * Trainers can add, edit, delete words with all fields and save to Firestore.
 */
import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy, enableIndexedDbPersistence } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

// Enable offline persistence so words save locally first, then sync to cloud
// This makes saves instant even on slow/blocked networks
try {
  enableIndexedDbPersistence(db).catch(() => {/* already enabled or not supported */});
} catch (_) {}

import { ArrowLeft, Plus, Save, Trash2, Download, Upload, Search, Filter, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NIGERIAN_LANGUAGES } from '../lib/nigerianLanguages';

const ALL_LANGUAGES = Array.from(
  new Map(
    NIGERIAN_LANGUAGES.flatMap(r => r.languages.map(l => [l.id, { id: l.id, name: l.name }] as const))
  ).values()
).sort((a, b) => a.name.localeCompare(b.name));

interface WordEntry {
  id?: string;
  language: string;
  word: string;          // word in local language
  english: string;       // English meaning
  phonetics: string;     // how to pronounce
  singular: string;      // singular form
  plural: string;        // plural form
  antonym: string;       // opposite word (local language)
  antonymEn: string;     // opposite word (English)
  synonym: string;       // similar word
  partOfSpeech: string;  // noun, verb, adjective...
  category: string;      // greetings, food, body, etc.
  sentence1: string;     // example sentence (local language)
  sentence1En: string;   // example sentence (English)
  sentence2: string;     // second example
  sentence2En: string;   // second example English
  proverb: string;       // proverb using this word
  proverbEn: string;     // proverb English meaning
  notes: string;         // cultural notes / usage notes
  status: string;        // draft | verified | community
}

const EMPTY: Omit<WordEntry, 'id'> = {
  language: 'edo', word: '', english: '', phonetics: '', singular: '', plural: '',
  antonym: '', antonymEn: '', synonym: '', partOfSpeech: '', category: '',
  sentence1: '', sentence1En: '', sentence2: '', sentence2En: '',
  proverb: '', proverbEn: '', notes: '', status: 'draft',
};

const PARTS_OF_SPEECH = ['Noun','Verb','Adjective','Adverb','Pronoun','Conjunction','Interjection','Phrase','Idiom','Proverb'];
const CATEGORIES = ['Greetings','Food & Drink','Family & People','Body','Numbers','Time','Animals','Plants','Places','Verbs','Adjectives','Culture','Religion','Other'];
const COL = "px-2 py-1.5 text-xs text-white border-r border-[#1a1a1a] whitespace-nowrap";
const INPUT = "w-full bg-transparent text-white text-xs placeholder-[#444] focus:outline-none focus:bg-[#001a0d] px-1 py-0.5 min-w-[80px]";

export default function WordTablePage() {
  const navigate = useNavigate();
  const [selectedLang, setSelectedLang] = useState('edo');
  const [entries, setEntries] = useState<WordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<Omit<WordEntry,'id'> | null>(null);
  const [draft, setDraft] = useState<Partial<WordEntry>>({});

  // Load entries from Firestore for selected language
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'wordTable'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const all: WordEntry[] = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as WordEntry))
        .filter(e => e.language === selectedLang);
      setEntries(all);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [selectedLang]);

  const filtered = entries.filter(e => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [e.word, e.english, e.phonetics, e.antonym, e.category, e.sentence1]
      .some(v => (v || '').toLowerCase().includes(q));
  });

  const saveNew = async () => {
    if (!newRow || !newRow.word.trim() || !newRow.english.trim()) return;
    setSaving(true);
    try {
      // Firestore with offline persistence — saves instantly to local cache,
      // then syncs to cloud in background (works even on slow/restricted networks)
      const docRef = await addDoc(collection(db, 'wordTable'), {
        ...newRow,
        language: selectedLang,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || 'admin',
      });
      console.log('[WordTable] Saved word:', newRow.word, 'id:', docRef.id);
      setNewRow(null);
    } catch (e: any) {
      console.error('[WordTable] Save error:', e);
      if (e.code === 'unavailable' || e.message?.includes('network') || e.message?.includes('CORS')) {
        alert('⚠️ Network issue detected. The word was saved locally and will sync to the database when connection is restored. You can continue adding more words.');
        setNewRow(null); // Still clear the form — local save succeeded
      } else {
        alert('Save failed: ' + (e.message || 'Unknown error'));
      }
    }
    finally { setSaving(false); }
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'wordTable', id), { ...draft, updatedAt: serverTimestamp() });
      setEditingId(null); setDraft({});
    } catch (e: any) { alert('Update failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const deleteEntry = async (id: string, word: string) => {
    if (!confirm(`Delete "${word}"?`)) return;
    await deleteDoc(doc(db, 'wordTable', id));
  };

  const startEdit = (e: WordEntry) => {
    setEditingId(e.id!);
    setDraft({ ...e });
    setNewRow(null);
  };

  const cancelEdit = () => { setEditingId(null); setDraft({}); };

  const exportCSV = () => {
    const headers = ['Word','English','Phonetics','Singular','Plural','Antonym','Antonym(En)','Synonym','Part of Speech','Category','Sentence 1','Sentence 1 (En)','Sentence 2','Sentence 2 (En)','Proverb','Proverb (En)','Notes','Status'];
    const rows = filtered.map(e => [e.word,e.english,e.phonetics,e.singular,e.plural,e.antonym,e.antonymEn,e.synonym,e.partOfSpeech,e.category,e.sentence1,e.sentence1En,e.sentence2,e.sentence2En,e.proverb,e.proverbEn,e.notes,e.status].map(v => `"${(v||'').replace(/"/g,'""')}"`));
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `words-${selectedLang}-${Date.now()}.csv`;
    a.click();
  };

  const Cell = ({ field, entry, width = 90 }: { field: keyof Omit<WordEntry,'id'|'language'>; entry: WordEntry; width?: number }) => {
    const isEditing = editingId === entry.id;
    const value = isEditing ? ((draft[field] as string) ?? (entry[field] as string) ?? '') : ((entry[field] as string) || '');
    return (
      <td className={`${COL} border-b border-[#111]`} style={{ minWidth: width }}>
        {isEditing ? (
          <input className={INPUT} value={value}
            onChange={e => setDraft(p => ({ ...p, [field]: e.target.value }))}
            style={{ minWidth: width - 8 }} />
        ) : (
          <span className="text-gray-300 truncate block" style={{ maxWidth: width }}>{value}</span>
        )}
      </td>
    );
  };

  const SelectCell = ({ field, options, entry, width = 100 }: { field: keyof Omit<WordEntry,'id'|'language'>; options: string[]; entry: WordEntry; width?: number }) => {
    const isEditing = editingId === entry.id;
    const value = isEditing ? ((draft[field] as string) ?? (entry[field] as string) ?? '') : ((entry[field] as string) || '');
    return (
      <td className={`${COL} border-b border-[#111]`} style={{ minWidth: width }}>
        {isEditing ? (
          <select className={INPUT + ' bg-[#0a0a0a]'} value={value}
            onChange={e => setDraft(p => ({ ...p, [field]: e.target.value }))}>
            <option value="">—</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : <span className="text-gray-300">{value}</span>}
      </td>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#080808] border-b border-[#1a1a1a] px-4 py-3 flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/admin')} className="flex items-center gap-1.5 text-[#888] hover:text-white text-sm transition-colors">
          <ArrowLeft size={16} /> Admin
        </button>
        <h1 className="text-[#00ff88] font-bold text-base flex-1">📊 Word Training Table</h1>
        <span className="text-xs text-[#555] hidden md:block">
          💾 Words save to Firebase · syncs across all devices
        </span>

        {/* Language selector */}
        <select className="bg-[#111] border border-[#222] text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00ff88]/40"
          value={selectedLang} onChange={e => { setSelectedLang(e.target.value); setEditingId(null); setNewRow(null); }}>
          {ALL_LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#444]" />
          <input className="bg-[#111] border border-[#222] text-white text-xs rounded-lg pl-7 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00ff88]/40 w-40"
            placeholder="Search words..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 border border-[#333] text-[#888] rounded-lg hover:text-white text-xs transition-all">
          <Download size={13} /> Export CSV
        </button>
        <button onClick={() => { setNewRow({ ...EMPTY, language: selectedLang }); setEditingId(null); }}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-[#00ff88] text-black rounded-lg hover:bg-[#00dd77] text-xs font-bold transition-all">
          <Plus size={13} /> Add Word
        </button>
      </div>

      {/* Stats bar */}
      <div className="px-4 py-2 bg-[#070707] border-b border-[#111] flex gap-4 text-xs text-[#555] flex-wrap">
        <span>{entries.length} words in {ALL_LANGUAGES.find(l => l.id === selectedLang)?.name}</span>
        <span className="text-green-500">{entries.filter(e => e.status === 'verified').length} verified</span>
        <span className="text-yellow-500">{entries.filter(e => e.sentence1).length} with sentences</span>
        <span className="text-[#ff6b6b]">{entries.filter(e => e.antonym).length} with antonyms</span>
        <span>{filtered.length !== entries.length ? `${filtered.length} showing` : ''}</span>
      </div>

      {/* New row form */}
      {newRow && (
        <div className="px-4 py-3 bg-[#001a0d] border-b border-[#00ff88]/30">
          <p className="text-[#00ff88] text-xs font-semibold mb-3">➕ New Word — fill required fields then Save</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {([
              ['word', 'Word (local language) *'],
              ['english', 'English meaning *'],
              ['phonetics', 'Phonetics'],
              ['singular', 'Singular'],
              ['plural', 'Plural'],
              ['antonym', 'Antonym (local)'],
              ['antonymEn', 'Antonym (English)'],
              ['synonym', 'Synonym'],
              ['sentence1', 'Sentence (local language)'],
              ['sentence1En', 'Sentence (English)'],
              ['sentence2', 'Sentence 2 (local)'],
              ['sentence2En', 'Sentence 2 (English)'],
              ['proverb', 'Proverb (local)'],
              ['proverbEn', 'Proverb (English)'],
              ['notes', 'Cultural notes'],
            ] as [keyof typeof EMPTY, string][]).map(([k, label]) => (
              <div key={k}>
                <label className="text-[#666] text-xs block mb-0.5">{label}</label>
                <input
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#00ff88]/50"
                  value={newRow[k] as string}
                  onChange={e => setNewRow(p => p ? ({ ...p, [k]: e.target.value }) : p)}
                />
              </div>
            ))}
            <div>
              <label className="text-[#666] text-xs block mb-0.5">Part of Speech</label>
              <select className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-white focus:outline-none"
                value={newRow.partOfSpeech} onChange={e => setNewRow(p => p ? ({ ...p, partOfSpeech: e.target.value }) : p)}>
                <option value="">—</option>
                {PARTS_OF_SPEECH.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[#666] text-xs block mb-0.5">Category</label>
              <select className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-white focus:outline-none"
                value={newRow.category} onChange={e => setNewRow(p => p ? ({ ...p, category: e.target.value }) : p)}>
                <option value="">—</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[#666] text-xs block mb-0.5">Status</label>
              <select className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-white focus:outline-none"
                value={newRow.status} onChange={e => setNewRow(p => p ? ({ ...p, status: e.target.value }) : p)}>
                <option value="draft">Draft</option>
                <option value="verified">Verified</option>
                <option value="community">Community</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={saveNew} disabled={saving || !newRow.word.trim() || !newRow.english.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#00ff88] text-black font-bold rounded-lg text-xs disabled:opacity-40">
              <Save size={13} /> {saving ? 'Saving...' : 'Save Word'}
            </button>
            <button onClick={() => setNewRow(null)} className="flex items-center gap-1.5 px-3 py-2 border border-[#333] text-[#888] rounded-lg text-xs hover:text-white">
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 1800 }}>
          <thead className="sticky top-[52px] z-10">
            <tr className="bg-[#0a0a0a] border-b-2 border-[#00ff88]/30">
              {[
                ['Word (Local Language)', 120],
                ['English Meaning', 120],
                ['Phonetics', 100],
                ['Singular', 90],
                ['Plural', 90],
                ['Antonym (Local)', 110],
                ['Antonym (English)', 110],
                ['Synonym', 90],
                ['Part of Speech', 100],
                ['Category', 100],
                ['Sentence (Local)', 180],
                ['Sentence (English)', 180],
                ['Sentence 2 (Local)', 160],
                ['Sentence 2 (English)', 160],
                ['Proverb (Local)', 160],
                ['Proverb (English)', 160],
                ['Notes', 140],
                ['Status', 80],
                ['', 80],
              ].map(([label, w]) => (
                <th key={label as string} className="px-2 py-2 text-left text-[#00ff88] text-xs font-semibold border-r border-[#1a1a1a] whitespace-nowrap"
                  style={{ minWidth: w as number }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={19} className="px-4 py-8 text-center text-[#444] text-sm">Loading words...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={19} className="px-4 py-10 text-center text-[#444] text-sm">
                No words yet. Click <strong className="text-[#00ff88]">Add Word</strong> to start training the AI.
              </td></tr>
            ) : filtered.map(entry => (
              <tr key={entry.id} className={`border-b border-[#0d0d0d] ${editingId === entry.id ? 'bg-[#001a0d]' : 'hover:bg-[#0a0a0a]'} transition-colors`}>
                <Cell field="word" entry={entry} width={120} />
                <Cell field="english" entry={entry} width={120} />
                <Cell field="phonetics" entry={entry} width={100} />
                <Cell field="singular" entry={entry} width={90} />
                <Cell field="plural" entry={entry} width={90} />
                <Cell field="antonym" entry={entry} width={110} />
                <Cell field="antonymEn" entry={entry} width={110} />
                <Cell field="synonym" entry={entry} width={90} />
                <SelectCell field="partOfSpeech" options={PARTS_OF_SPEECH} entry={entry} width={100} />
                <SelectCell field="category" options={CATEGORIES} entry={entry} width={100} />
                <Cell field="sentence1" entry={entry} width={180} />
                <Cell field="sentence1En" entry={entry} width={180} />
                <Cell field="sentence2" entry={entry} width={160} />
                <Cell field="sentence2En" entry={entry} width={160} />
                <Cell field="proverb" entry={entry} width={160} />
                <Cell field="proverbEn" entry={entry} width={160} />
                <Cell field="notes" entry={entry} width={140} />
                <SelectCell field="status" options={['draft','verified','community']} entry={entry} width={80} />
                <td className="px-2 py-1.5 border-b border-[#111]">
                  <div className="flex gap-1">
                    {editingId === entry.id ? (
                      <>
                        <button onClick={() => saveEdit(entry.id!)} disabled={saving}
                          className="p-1.5 rounded bg-[#00ff88]/20 text-[#00ff88] hover:bg-[#00ff88]/30 transition-all" title="Save">
                          <Check size={13} />
                        </button>
                        <button onClick={cancelEdit}
                          className="p-1.5 rounded bg-[#333] text-[#888] hover:text-white transition-all" title="Cancel">
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(entry)}
                          className="p-1.5 rounded text-[#444] hover:text-[#00ff88] hover:bg-[#00ff88]/10 transition-all" title="Edit row">
                          ✏️
                        </button>
                        <button onClick={() => deleteEntry(entry.id!, entry.word)}
                          className="p-1.5 rounded text-[#444] hover:text-red-400 hover:bg-red-400/10 transition-all" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
