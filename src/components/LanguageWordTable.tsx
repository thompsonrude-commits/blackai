/**
 * LanguageWordTable — Comprehensive word entry form and table for admin language training.
 *
 * Fields covered:
 * - Local language word + English meaning
 * - Phonetics + tonal pattern
 * - Singular & plural forms
 * - Antonym (opposite) in local language + English
 * - Synonym
 * - Part of speech, category, grammatical role
 * - Example sentence in LOCAL LANGUAGE + English translation
 * - Second example sentence in LOCAL LANGUAGE + English translation
 * - Sentence using antonym (local language + English)
 * - Sentence using plural form (local language + English)
 * - Proverb / saying containing this word
 * - Cultural notes, register, word family, usage notes
 * - Validation status, confidence score
 */

import React, { useState, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { LexiconEntry, LEXICON_CATEGORIES, LEXICON_VALIDATION_STATUSES, LexiconValidationStatus } from '../lib/useLexicon';
import {
  Plus, Edit2, Trash2, Save, X, Search, Download,
  ChevronDown, ChevronUp, BookOpen
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────
const PARTS_OF_SPEECH = [
  'Noun', 'Verb', 'Adjective', 'Adverb', 'Pronoun', 'Preposition',
  'Conjunction', 'Interjection', 'Article', 'Numeral', 'Particle', 'Phrase', 'Idiom', 'Proverb'
];

const REGISTERS = [
  'Everyday / Informal', 'Formal', 'Sacred / Religious',
  'Colloquial / Slang', 'Archaic / Old form', "Children's speech", 'Honorific'
];

const TONAL_PATTERNS = [
  'N/A', 'High (H)', 'Low (L)', 'Mid (M)', 'High-Low (HL)', 'Low-High (LH)',
  'High-Low-High (HLH)', 'Low-High-Low (LHL)', 'Rising', 'Falling', 'Level'
];

const INPUT = "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:ring-1 focus:ring-[#00ff88]/40 focus:border-[#00ff88]/40 transition-colors";
const LABEL = "block text-xs text-[#888] mb-1 font-medium uppercase tracking-wide";
const REQ_LABEL = "block text-xs text-[#888] mb-1 font-medium uppercase tracking-wide after:content-['*'] after:text-red-400 after:ml-0.5";
const TEXTAREA = "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:ring-1 focus:ring-[#00ff88]/40 focus:border-[#00ff88]/40 transition-colors resize-none";

// ── Empty draft ─────────────────────────────────────────────────────────────────
function emptyDraft(lang = 'edo') {
  return {
    language: lang,
    dialect: '',
    writtenForm: '',
    meaning: '',
    phonetic: '',
    tonalPattern: '',
    phonology: '',
    partOfSpeech: '',
    category: 'General',
    // Singular / Plural
    singularForm: '',
    pluralForm: '',
    // Antonym
    antonym: '',
    antonymEnglish: '',
    // Synonym
    synonym: '',
    relatedWords: '',
    // Street names, slang, nicknames
    streetName: '',        // popular street name / nickname for this word or place
    slangUsage: '',        // how it's used in slang/informal speech
    popularIn: '',         // which region/group uses this most
    // Example sentences — LOCAL LANGUAGE + English translation (pairs)
    exSentence1Local: '',
    exSentence1English: '',
    exSentence2Local: '',
    exSentence2English: '',
    // Sentence using antonym
    antonymSentenceLocal: '',
    antonymSentenceEnglish: '',
    // Sentence using plural form
    pluralSentenceLocal: '',
    pluralSentenceEnglish: '',
    // Proverb / saying
    proverbLocal: '',
    proverbEnglish: '',
    // Cultural / linguistic
    register: '',
    wordFamily: '',
    usageNotes: '',
    culturalNote: '',
    grammaticalRole: '',
    semanticConcept: '',
    alternateForms: '',
    aliases: '',
    // Meta
    validationStatus: 'candidate' as LexiconValidationStatus,
    confidence: '0.8',
  };
}

// ── Sentence pair widget ────────────────────────────────────────────────────────
function SentencePair({
  label, icon,
  localValue, localChange, localPlaceholder,
  englishValue, englishChange, englishPlaceholder,
}: {
  label: string; icon: string;
  localValue: string; localChange: (v: string) => void; localPlaceholder: string;
  englishValue: string; englishChange: (v: string) => void; englishPlaceholder: string;
}) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-3 space-y-2">
      <p className="text-[#00ff88] text-xs font-semibold">{icon} {label}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className={LABEL}>In Local Language</label>
          <textarea className={TEXTAREA} rows={2} value={localValue}
            onChange={e => localChange(e.target.value)} placeholder={localPlaceholder} />
        </div>
        <div>
          <label className={LABEL}>English Translation</label>
          <textarea className={TEXTAREA} rows={2} value={englishValue}
            onChange={e => englishChange(e.target.value)} placeholder={englishPlaceholder} />
        </div>
      </div>
    </div>
  );
}

// ── Status badge ────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    'verified': 'bg-green-500/20 text-green-400 border border-green-500/30',
    'community-supported': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    'under-review': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    'candidate': 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
    'conflicting': 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    'rejected': 'bg-red-500/20 text-red-400 border border-red-500/30',
    'superseded': 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  };
  const s = status || 'candidate';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${colors[s] || colors['candidate']}`}>
      {s.replace(/-/g, ' ')}
    </span>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────
interface LanguageWordTableProps {
  entries: LexiconEntry[];
  selectedLanguage?: string;
}

export default function LanguageWordTable({ entries, selectedLanguage = 'edo' }: LanguageWordTableProps) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [posFilter, setPosFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<'writtenForm' | 'meaning' | 'category' | 'partOfSpeech' | 'validationStatus'>('writtenForm');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => emptyDraft(selectedLanguage));
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'core' | 'sentences' | 'grammar' | 'cultural' | 'meta'>('core');

  const set = (k: keyof ReturnType<typeof emptyDraft>) => (v: string) =>
    setDraft(prev => ({ ...prev, [k]: v }));

  // Filter + sort
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter(e => {
        const text = [
          e.writtenForm, e.edoWord, e.meaning, e.english,
          e.phonetic, e.exampleSentence, e.antonym, e.singularForm, e.pluralForm
        ].map(v => (v || '').toLowerCase()).join(' ');
        return (!q || text.includes(q))
          && (catFilter === 'all' || e.category === catFilter)
          && (posFilter === 'all' || e.partOfSpeech === posFilter)
          && (statusFilter === 'all' || (e.validationStatus || 'candidate') === statusFilter);
      })
      .sort((a, b) => {
        const av = String((a as any)[sortField] || '').toLowerCase();
        const bv = String((b as any)[sortField] || '').toLowerCase();
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [entries, search, catFilter, posFilter, statusFilter, sortField, sortDir]);

  const toggleSort = (f: typeof sortField) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('asc'); }
  };

  const startAdd = () => {
    setDraft(emptyDraft(selectedLanguage));
    setEditingId(null); setIsAdding(true); setTab('core');
  };

  const startEdit = (e: LexiconEntry) => {
    setDraft({
      language: e.language || selectedLanguage,
      dialect: e.dialect || '',
      writtenForm: e.writtenForm || e.edoWord || '',
      meaning: e.meaning || e.english || '',
      phonetic: e.pronunciationGuide || e.phonetic || '',
      tonalPattern: e.tonalPattern || '',
      phonology: e.phonology || '',
      partOfSpeech: e.partOfSpeech || '',
      category: e.category || 'General',
      singularForm: e.singularForm || '',
      pluralForm: e.pluralForm || '',
      antonym: e.antonym || '',
      antonymEnglish: e.antonymEnglish || '',
      synonym: e.synonym || '',
      relatedWords: (e.relatedWords || []).join(', '),
      exSentence1Local: e.exampleSentence || '',
      exSentence1English: e.exampleSentenceEnglish || '',
      exSentence2Local: e.exampleSentence2 || '',
      exSentence2English: e.exampleSentence2English || '',
      antonymSentenceLocal: (e as any).antonymSentenceLocal || '',
      antonymSentenceEnglish: (e as any).antonymSentenceEnglish || '',
      pluralSentenceLocal: (e as any).pluralSentenceLocal || '',
      pluralSentenceEnglish: (e as any).pluralSentenceEnglish || '',
      proverbLocal: (e as any).proverbLocal || '',
      proverbEnglish: (e as any).proverbEnglish || '',
      register: e.register || '',
      wordFamily: (e as any).wordFamily || '',
      usageNotes: e.usageNotes || '',
      culturalNote: (e as any).culturalNote || '',
      grammaticalRole: e.grammaticalRole || '',
      semanticConcept: e.semanticConcept || '',
      alternateForms: (e.alternateForms || []).join(', '),
      aliases: (e.aliases || []).join(', '),
      validationStatus: e.validationStatus || 'candidate',
      confidence: String(e.confidence ?? 0.8),
    });
    setEditingId(e.id); setIsAdding(true); setTab('core');
  };

  const cancel = () => { setIsAdding(false); setEditingId(null); };

  const save = async () => {
    if (!draft.writtenForm.trim() || !draft.meaning.trim()) {
      alert('Local language word and English meaning are required.');
      return;
    }
    setSaving(true);
    try {
      const user = auth.currentUser;
      const data = {
        language: draft.language,
        dialect: draft.dialect || undefined,
        writtenForm: draft.writtenForm.trim(),
        edoWord: draft.writtenForm.trim(),
        meaning: draft.meaning.trim(),
        english: draft.meaning.trim(),
        pronunciationGuide: draft.phonetic.trim() || undefined,
        phonetic: draft.phonetic.trim() || undefined,
        tonalPattern: draft.tonalPattern || undefined,
        phonology: draft.phonology.trim() || undefined,
        partOfSpeech: draft.partOfSpeech || undefined,
        category: draft.category || 'General',
        singularForm: draft.singularForm.trim() || undefined,
        pluralForm: draft.pluralForm.trim() || undefined,
        antonym: draft.antonym.trim() || undefined,
        antonymEnglish: draft.antonymEnglish.trim() || undefined,
        synonym: draft.synonym.trim() || undefined,
        relatedWords: draft.relatedWords.split(',').map(v => v.trim()).filter(Boolean),
        streetName: draft.streetName.trim() || undefined,
        slangUsage: draft.slangUsage.trim() || undefined,
        popularIn: draft.popularIn.trim() || undefined,
        // Sentences — local language paired with English
        exampleSentence: draft.exSentence1Local.trim() || undefined,
        exampleSentenceEnglish: draft.exSentence1English.trim() || undefined,
        exampleSentence2: draft.exSentence2Local.trim() || undefined,
        exampleSentence2English: draft.exSentence2English.trim() || undefined,
        antonymSentenceLocal: draft.antonymSentenceLocal.trim() || undefined,
        antonymSentenceEnglish: draft.antonymSentenceEnglish.trim() || undefined,
        pluralSentenceLocal: draft.pluralSentenceLocal.trim() || undefined,
        pluralSentenceEnglish: draft.pluralSentenceEnglish.trim() || undefined,
        proverbLocal: draft.proverbLocal.trim() || undefined,
        proverbEnglish: draft.proverbEnglish.trim() || undefined,
        register: draft.register || undefined,
        wordFamily: draft.wordFamily.trim() || undefined,
        usageNotes: draft.usageNotes.trim() || undefined,
        culturalNote: draft.culturalNote.trim() || undefined,
        grammaticalRole: draft.grammaticalRole || undefined,
        semanticConcept: draft.semanticConcept.trim() || undefined,
        alternateForms: draft.alternateForms.split(',').map(v => v.trim()).filter(Boolean),
        aliases: draft.aliases.split(',').map(v => v.trim()).filter(Boolean),
        validationStatus: draft.validationStatus,
        confidence: Number(draft.confidence) || 0.8,
        provenance: 'admin-training',
        createdBy: user?.email || user?.uid || 'admin',
        isSeeded: false,
      };
      if (editingId) {
        await updateDoc(doc(db, 'coreVocabAudio', editingId), { ...data, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'coreVocabAudio'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      setIsAdding(false); setEditingId(null);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id: string, word: string) => {
    if (!confirm(`Delete "${word}"? This cannot be undone.`)) return;
    await deleteDoc(doc(db, 'coreVocabAudio', id));
  };

  const exportCSV = () => {
    const h = ['Word (Local)', 'English Meaning', 'Phonetics', 'Tonal Pattern', 'Part of Speech',
      'Category', 'Singular', 'Plural', 'Antonym (Local)', 'Antonym (English)', 'Synonym',
      'Ex Sentence 1 (Local)', 'Ex Sentence 1 (English)',
      'Ex Sentence 2 (Local)', 'Ex Sentence 2 (English)',
      'Antonym Sentence (Local)', 'Antonym Sentence (English)',
      'Plural Sentence (Local)', 'Plural Sentence (English)',
      'Proverb (Local)', 'Proverb (English)',
      'Register', 'Word Family', 'Usage Notes', 'Cultural Note',
      'Related Words', 'Status', 'Confidence', 'Language'];
    const rows = filtered.map(e => [
      e.writtenForm, e.meaning, e.phonetic || e.pronunciationGuide || '',
      e.tonalPattern || '', e.partOfSpeech || '', e.category,
      e.singularForm || '', e.pluralForm || '',
      e.antonym || '', e.antonymEnglish || '', e.synonym || '',
      e.exampleSentence || '', e.exampleSentenceEnglish || '',
      e.exampleSentence2 || '', e.exampleSentence2English || '',
      (e as any).antonymSentenceLocal || '', (e as any).antonymSentenceEnglish || '',
      (e as any).pluralSentenceLocal || '', (e as any).pluralSentenceEnglish || '',
      (e as any).proverbLocal || '', (e as any).proverbEnglish || '',
      e.register || '', (e as any).wordFamily || '',
      e.usageNotes || '', (e as any).culturalNote || '',
      (e.relatedWords || []).join('; '),
      e.validationStatus || 'candidate',
      String(e.confidence ?? ''), e.language,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`));
    const csv = [h.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `words-${selectedLanguage}-${Date.now()}.csv`;
    a.click();
  };

  // ── ENTRY FORM ─────────────────────────────────────────────────────────────
  const EntryForm = () => (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#00ff88] font-bold text-sm">
          {editingId ? '✏️ Edit Word Entry' : '➕ New Word Entry'}
        </h3>
        <button onClick={cancel} className="text-[#555] hover:text-white transition-colors"><X size={16} /></button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 flex-wrap">
        {([
          ['core', '📝 Core'],
          ['sentences', '💬 Sentences'],
          ['grammar', '🔤 Grammar'],
          ['cultural', '🌍 Cultural'],
          ['meta', '⚙️ Meta'],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === t ? 'bg-[#00ff88] text-black' : 'bg-[#1a1a1a] text-[#777] hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* TAB: Core */}
      {tab === 'core' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={REQ_LABEL}>Word in Local Language</label>
            <input className={INPUT} value={draft.writtenForm} onChange={e => set('writtenForm')(e.target.value)}
              placeholder="e.g. Ọbowiẹ, ìfẹ́, ọ dị mma, sannu" />
          </div>
          <div>
            <label className={REQ_LABEL}>English Meaning</label>
            <input className={INPUT} value={draft.meaning} onChange={e => set('meaning')(e.target.value)}
              placeholder="e.g. Good morning, love, it is good, hello" />
          </div>
          <div>
            <label className={LABEL}>Phonetics (how to pronounce)</label>
            <input className={INPUT} value={draft.phonetic} onChange={e => set('phonetic')(e.target.value)}
              placeholder="e.g. oh-BOH-wee-EH  or  /ɔ̀bɔ̀wíɛ/" />
          </div>
          <div>
            <label className={LABEL}>Tonal Pattern</label>
            <select className={INPUT} value={draft.tonalPattern} onChange={e => set('tonalPattern')(e.target.value)}>
              {TONAL_PATTERNS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Singular Form</label>
            <input className={INPUT} value={draft.singularForm} onChange={e => set('singularForm')(e.target.value)}
              placeholder="Singular form (if noun)" />
          </div>
          <div>
            <label className={LABEL}>Plural Form</label>
            <input className={INPUT} value={draft.pluralForm} onChange={e => set('pluralForm')(e.target.value)}
              placeholder="Plural form (if noun)" />
          </div>
          <div>
            <label className={LABEL}>Antonym — Opposite Word (Local Language)</label>
            <input className={INPUT} value={draft.antonym} onChange={e => set('antonym')(e.target.value)}
              placeholder="Opposite word in local language" />
          </div>
          <div>
            <label className={LABEL}>Antonym — English Meaning</label>
            <input className={INPUT} value={draft.antonymEnglish} onChange={e => set('antonymEnglish')(e.target.value)}
              placeholder="English meaning of the opposite" />
          </div>
          <div>
            <label className={LABEL}>Synonym / Similar Word</label>
            <input className={INPUT} value={draft.synonym} onChange={e => set('synonym')(e.target.value)}
              placeholder="Word with similar meaning" />
          </div>
          <div>
            <label className={LABEL}>Category</label>
            <select className={INPUT} value={draft.category} onChange={e => set('category')(e.target.value)}>
              {LEXICON_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Street Name / Nickname / Popular Alias</label>
            <input className={INPUT} value={draft.streetName} onChange={e => set('streetName')(e.target.value)}
              placeholder="e.g. Naija for Nigeria, AJ for Ajegunle, Lasgidi for Lagos, VI for Victoria Island" />
          </div>
          <div>
            <label className={LABEL}>Slang Usage / Informal Expression</label>
            <input className={INPUT} value={draft.slangUsage} onChange={e => set('slangUsage')(e.target.value)}
              placeholder="e.g. 'E don do' means it's finished — used to end a matter" />
          </div>
          <div className="md:col-span-2">
            <label className={LABEL}>Popular In (region / group / context)</label>
            <input className={INPUT} value={draft.popularIn} onChange={e => set('popularIn')(e.target.value)}
              placeholder="e.g. Lagos street youth, Warri boys, South-South Nigeria, Pan-Nigeria, social media" />
          </div>
        </div>
      )}

      {/* TAB: Sentences — all in local language + English */}
      {tab === 'sentences' && (
        <div className="space-y-4">
          <div className="bg-[#111] rounded-xl p-3 text-xs text-[#666] border border-[#1a1a1a]">
            💡 <strong className="text-[#888]">Important:</strong> Write all sentences first in the <strong className="text-[#00ff88]">local language</strong>, then provide the English translation. This is what the AI learns from.
          </div>

          <SentencePair
            label="Example Sentence 1" icon="📌"
            localValue={draft.exSentence1Local} localChange={set('exSentence1Local')}
            localPlaceholder="Write a sentence using this word in the local language..."
            englishValue={draft.exSentence1English} englishChange={set('exSentence1English')}
            englishPlaceholder="English translation of the sentence above..."
          />

          <SentencePair
            label="Example Sentence 2" icon="📌"
            localValue={draft.exSentence2Local} localChange={set('exSentence2Local')}
            localPlaceholder="Another sentence using this word in the local language..."
            englishValue={draft.exSentence2English} englishChange={set('exSentence2English')}
            englishPlaceholder="English translation of sentence 2..."
          />

          <SentencePair
            label="Sentence Using the Antonym (Opposite Word)" icon="↔️"
            localValue={draft.antonymSentenceLocal} localChange={set('antonymSentenceLocal')}
            localPlaceholder="A sentence showing the antonym in context (local language)..."
            englishValue={draft.antonymSentenceEnglish} englishChange={set('antonymSentenceEnglish')}
            englishPlaceholder="English translation of the antonym sentence..."
          />

          <SentencePair
            label="Sentence Using the Plural Form" icon="🔢"
            localValue={draft.pluralSentenceLocal} localChange={set('pluralSentenceLocal')}
            localPlaceholder="A sentence using the plural form of this word (local language)..."
            englishValue={draft.pluralSentenceEnglish} englishChange={set('pluralSentenceEnglish')}
            englishPlaceholder="English translation of the plural sentence..."
          />

          <SentencePair
            label="Proverb / Saying Containing This Word" icon="📜"
            localValue={draft.proverbLocal} localChange={set('proverbLocal')}
            localPlaceholder="A proverb, saying, or idiomatic expression using this word (local language)..."
            englishValue={draft.proverbEnglish} englishChange={set('proverbEnglish')}
            englishPlaceholder="English meaning / translation of the proverb..."
          />
        </div>
      )}

      {/* TAB: Grammar */}
      {tab === 'grammar' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Part of Speech</label>
            <select className={INPUT} value={draft.partOfSpeech} onChange={e => set('partOfSpeech')(e.target.value)}>
              <option value="">Select...</option>
              {PARTS_OF_SPEECH.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Grammatical Role</label>
            <input className={INPUT} value={draft.grammaticalRole} onChange={e => set('grammaticalRole')(e.target.value)}
              placeholder="e.g. Subject marker, Copula, Object pronoun" />
          </div>
          <div>
            <label className={LABEL}>Word Family / Root</label>
            <input className={INPUT} value={draft.wordFamily} onChange={e => set('wordFamily')(e.target.value)}
              placeholder="e.g. Root: gha (to go). Family: gha, ma gha, gha rre" />
          </div>
          <div>
            <label className={LABEL}>Register / Usage Level</label>
            <select className={INPUT} value={draft.register} onChange={e => set('register')(e.target.value)}>
              <option value="">Select...</option>
              {REGISTERS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Phonology / Syllable Structure</label>
            <input className={INPUT} value={draft.phonology} onChange={e => set('phonology')(e.target.value)}
              placeholder="e.g. CV, CVCV, nasal initial" />
          </div>
          <div>
            <label className={LABEL}>Semantic Concept</label>
            <input className={INPUT} value={draft.semanticConcept} onChange={e => set('semanticConcept')(e.target.value)}
              placeholder="e.g. Greeting, Kinship term, Time expression" />
          </div>
          <div>
            <label className={LABEL}>Alternate Forms (comma-separated)</label>
            <input className={INPUT} value={draft.alternateForms} onChange={e => set('alternateForms')(e.target.value)}
              placeholder="e.g. ọbẹ, ọbẹẹ, obee" />
          </div>
          <div>
            <label className={LABEL}>Related Words (comma-separated)</label>
            <input className={INPUT} value={draft.relatedWords} onChange={e => set('relatedWords')(e.target.value)}
              placeholder="e.g. ọghe, ẹre, rẹn" />
          </div>
          <div className="md:col-span-2">
            <label className={LABEL}>Usage Notes / Common Mistakes</label>
            <textarea className={TEXTAREA} rows={2} value={draft.usageNotes}
              onChange={e => set('usageNotes')(e.target.value)}
              placeholder="e.g. Only used by elders. Often confused with [word]. Do not use in formal settings." />
          </div>
        </div>
      )}

      {/* TAB: Cultural */}
      {tab === 'cultural' && (
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Cultural Note / Significance</label>
            <textarea className={TEXTAREA} rows={3} value={draft.culturalNote}
              onChange={e => set('culturalNote')(e.target.value)}
              placeholder="e.g. This word is only used at night. It comes from the tradition of... Using it in the wrong context is considered disrespectful..." />
          </div>
          <div>
            <label className={LABEL}>Dialect</label>
            <input className={INPUT} value={draft.dialect} onChange={e => set('dialect')(e.target.value)}
              placeholder="e.g. Benin City dialect, Owan dialect, Etsako dialect, Uromi dialect" />
          </div>
          <div>
            <label className={LABEL}>Aliases / Also Known As (comma-separated)</label>
            <input className={INPUT} value={draft.aliases} onChange={e => set('aliases')(e.target.value)}
              placeholder="Alternative spellings or regional names for this word" />
          </div>
        </div>
      )}

      {/* TAB: Meta */}
      {tab === 'meta' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Validation Status</label>
            <select className={INPUT} value={draft.validationStatus}
              onChange={e => set('validationStatus')(e.target.value as LexiconValidationStatus)}>
              {LEXICON_VALIDATION_STATUSES.map(s => (
                <option key={s} value={s}>{s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Confidence Score (0.0 – 1.0)</label>
            <input type="number" min="0" max="1" step="0.1" className={INPUT}
              value={draft.confidence} onChange={e => set('confidence')(e.target.value)} />
          </div>
          <div className="md:col-span-2 p-3 bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] text-xs text-[#666]">
            <strong className="text-[#888]">Confidence guide:</strong>{' '}
            1.0 = verified by linguist | 0.8 = confirmed native speaker | 0.6 = community supported | 0.4 = needs verification | 0.2 = tentative
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-5 pt-4 border-t border-[#1e1e1e] flex-wrap">
        <button onClick={save} disabled={saving || !draft.writtenForm.trim() || !draft.meaning.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#00ff88] text-black font-bold rounded-xl hover:bg-[#00dd77] transition-all disabled:opacity-40 text-sm">
          <Save size={15} /> {saving ? 'Saving...' : editingId ? 'Update Entry' : 'Save Word'}
        </button>
        <button onClick={cancel}
          className="flex items-center gap-2 px-4 py-2.5 border border-[#333] text-[#777] font-semibold rounded-xl hover:text-white hover:border-[#555] transition-all text-sm">
          <X size={15} /> Cancel
        </button>
        <span className="text-xs text-[#444] ml-auto">* Required fields</span>
      </div>
    </div>
  );

  // ── TABLE ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-[#00ff88]" />
          <h2 className="text-white font-bold text-base">Word Entry Table</h2>
          <span className="px-2 py-0.5 bg-[#00ff88]/10 text-[#00ff88] rounded-full text-xs font-semibold">
            {filtered.length} / {entries.length}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#333] text-[#777] rounded-lg hover:text-white text-xs font-semibold transition-all">
            <Download size={13} /> Export CSV
          </button>
          <button onClick={startAdd}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#00ff88] text-black rounded-lg hover:bg-[#00dd77] text-xs font-bold transition-all">
            <Plus size={13} /> Add Word
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="relative col-span-2 md:col-span-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" />
          <input className={INPUT + ' pl-8'} placeholder="Search words..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={INPUT} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {LEXICON_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={INPUT} value={posFilter} onChange={e => setPosFilter(e.target.value)}>
          <option value="all">All Parts of Speech</option>
          {PARTS_OF_SPEECH.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className={INPUT} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          {LEXICON_VALIDATION_STATUSES.map(s => <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>)}
        </select>
      </div>

      {/* Entry form */}
      {isAdding && <EntryForm />}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#1e1e1e]">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-[#0d0d0d] border-b border-[#1e1e1e]">
              {([
                ['writtenForm', '🗣 Word (Local)'],
                ['meaning', '🇬🇧 English'],
                [null, '🔊 Phonetics'],
                [null, '↔️ Antonym'],
                [null, '1️⃣ Singular / Plural'],
                ['partOfSpeech', '📖 Part of Speech'],
                ['category', '🏷 Category'],
                ['validationStatus', '✅ Status'],
                [null, ''],
              ] as [string | null, string][]).map(([f, lbl]) => (
                <th key={lbl}
                  className={`px-3 py-2.5 text-left text-[#555] text-xs font-semibold whitespace-nowrap ${f ? 'cursor-pointer hover:text-[#00ff88] select-none' : ''}`}
                  onClick={() => f && toggleSort(f as typeof sortField)}>
                  <span className="flex items-center gap-1">
                    {lbl}
                    {f && sortField === f && (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-[#444] text-sm">
                No words found. Click <strong className="text-[#00ff88]">Add Word</strong> to start training the AI.
              </td></tr>
            ) : filtered.map(e => (
              <React.Fragment key={e.id}>
                <tr className="border-b border-[#111] hover:bg-[#0d0d0d] transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="text-white font-semibold">{e.writtenForm || e.edoWord}</div>
                    {(e.alternateForms || []).length > 0 && (
                      <div className="text-[#444] text-xs mt-0.5">{(e.alternateForms || []).join(', ')}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 max-w-[140px]">
                    <div className="text-[#ccc] truncate">{e.meaning || e.english}</div>
                    {e.synonym && <div className="text-[#444] text-xs mt-0.5">≈ {e.synonym}</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-[#00ff88] font-mono text-xs">{e.phonetic || e.pronunciationGuide || '—'}</div>
                    {e.tonalPattern && e.tonalPattern !== 'N/A' && (
                      <div className="text-[#555] text-xs mt-0.5">{e.tonalPattern}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {e.antonym ? (
                      <>
                        <div className="text-[#ff6b6b] text-xs font-semibold">{e.antonym}</div>
                        {e.antonymEnglish && <div className="text-[#555] text-xs">{e.antonymEnglish}</div>}
                      </>
                    ) : <span className="text-[#333]">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <div className="flex flex-col gap-0.5">
                      {e.singularForm && <span className="text-[#999]">1: <strong className="text-white">{e.singularForm}</strong></span>}
                      {e.pluralForm && <span className="text-[#999]">+: <strong className="text-white">{e.pluralForm}</strong></span>}
                      {!e.singularForm && !e.pluralForm && <span className="text-[#333]">—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[#777] text-xs">{e.partOfSpeech || '—'}</td>
                  <td className="px-3 py-2.5 text-[#777] text-xs whitespace-nowrap">{e.category}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={e.validationStatus} /></td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(e)}
                        className="p-1.5 rounded-lg text-[#444] hover:text-[#00ff88] hover:bg-[#00ff88]/10 transition-all" title="Edit">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => deleteEntry(e.id, e.writtenForm || e.edoWord || '')}
                        className="p-1.5 rounded-lg text-[#444] hover:text-red-400 hover:bg-red-400/10 transition-all" title="Delete">
                        <Trash2 size={13} />
                      </button>
                      <button onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                        className="p-1.5 rounded-lg text-[#444] hover:text-white hover:bg-[#222] transition-all" title="Expand">
                        {expandedId === e.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expanded row — sentences and extra info */}
                {expandedId === e.id && (
                  <tr className="border-b border-[#0d0d0d] bg-[#070707]">
                    <td colSpan={9} className="px-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">

                        {/* Sentences column */}
                        <div className="space-y-3">
                          <p className="text-[#00ff88] font-semibold uppercase tracking-wide mb-2">💬 Sentences in Local Language</p>

                          {e.exampleSentence ? (
                            <div className="bg-[#0d0d0d] rounded-lg p-3 border border-[#1a1a1a]">
                              <p className="text-[#555] text-xs mb-1">Example 1</p>
                              <p className="text-white font-semibold">{e.exampleSentence}</p>
                              {e.exampleSentenceEnglish && <p className="text-[#777] italic mt-1">"{e.exampleSentenceEnglish}"</p>}
                            </div>
                          ) : null}

                          {e.exampleSentence2 ? (
                            <div className="bg-[#0d0d0d] rounded-lg p-3 border border-[#1a1a1a]">
                              <p className="text-[#555] text-xs mb-1">Example 2</p>
                              <p className="text-white font-semibold">{e.exampleSentence2}</p>
                              {e.exampleSentence2English && <p className="text-[#777] italic mt-1">"{e.exampleSentence2English}"</p>}
                            </div>
                          ) : null}

                          {(e as any).antonymSentenceLocal ? (
                            <div className="bg-[#0d0d0d] rounded-lg p-3 border border-[#ff6b6b]/20">
                              <p className="text-[#ff6b6b] text-xs mb-1">↔️ Antonym in use</p>
                              <p className="text-white font-semibold">{(e as any).antonymSentenceLocal}</p>
                              {(e as any).antonymSentenceEnglish && <p className="text-[#777] italic mt-1">"{(e as any).antonymSentenceEnglish}"</p>}
                            </div>
                          ) : null}

                          {(e as any).pluralSentenceLocal ? (
                            <div className="bg-[#0d0d0d] rounded-lg p-3 border border-[#1a1a1a]">
                              <p className="text-[#888] text-xs mb-1">🔢 Plural form in use</p>
                              <p className="text-white font-semibold">{(e as any).pluralSentenceLocal}</p>
                              {(e as any).pluralSentenceEnglish && <p className="text-[#777] italic mt-1">"{(e as any).pluralSentenceEnglish}"</p>}
                            </div>
                          ) : null}

                          {(e as any).proverbLocal ? (
                            <div className="bg-[#0d0d0d] rounded-lg p-3 border border-[#00ff88]/20">
                              <p className="text-[#00ff88] text-xs mb-1">📜 Proverb / Saying</p>
                              <p className="text-white font-semibold italic">{(e as any).proverbLocal}</p>
                              {(e as any).proverbEnglish && <p className="text-[#777] mt-1">"{(e as any).proverbEnglish}"</p>}
                            </div>
                          ) : null}

                          {!e.exampleSentence && !e.exampleSentence2 && !(e as any).antonymSentenceLocal && !(e as any).proverbLocal && (
                            <p className="text-[#333]">No sentences added yet. Edit this entry to add sentences.</p>
                          )}
                        </div>

                        {/* Notes column */}
                        <div className="space-y-2">
                          <p className="text-[#00ff88] font-semibold uppercase tracking-wide mb-2">📋 Details</p>
                          {(e as any).culturalNote && <div><span className="text-[#555]">Culture: </span><span className="text-[#bbb]">{(e as any).culturalNote}</span></div>}
                          {e.usageNotes && <div><span className="text-[#555]">Usage: </span><span className="text-[#bbb]">{e.usageNotes}</span></div>}
                          {(e as any).wordFamily && <div><span className="text-[#555]">Word family: </span><span className="text-[#bbb]">{(e as any).wordFamily}</span></div>}
                          {e.register && <div><span className="text-[#555]">Register: </span><span className="text-[#bbb]">{e.register}</span></div>}
                          {(e.relatedWords || []).length > 0 && <div><span className="text-[#555]">Related: </span><span className="text-[#bbb]">{(e.relatedWords || []).join(', ')}</span></div>}
                          {e.dialect && <div><span className="text-[#555]">Dialect: </span><span className="text-[#bbb]">{e.dialect}</span></div>}
                          {e.grammaticalRole && <div><span className="text-[#555]">Grammar role: </span><span className="text-[#bbb]">{e.grammaticalRole}</span></div>}
                          <div><span className="text-[#555]">Confidence: </span><span className="text-[#bbb]">{((e.confidence || 0) * 100).toFixed(0)}%</span></div>
                          {(e.aliases || []).length > 0 && <div><span className="text-[#555]">Also known as: </span><span className="text-[#bbb]">{(e.aliases || []).join(', ')}</span></div>}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: 'Total Words', value: entries.length, color: 'text-white' },
          { label: 'Verified', value: entries.filter(e => e.validationStatus === 'verified').length, color: 'text-green-400' },
          { label: 'With Sentences', value: entries.filter(e => e.exampleSentence).length, color: 'text-[#00ff88]' },
          { label: 'With Antonyms', value: entries.filter(e => e.antonym).length, color: 'text-[#ff6b6b]' },
          { label: 'With Proverbs', value: entries.filter(e => (e as any).proverbLocal).length, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl px-3 py-2.5 text-center">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[#555] text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
