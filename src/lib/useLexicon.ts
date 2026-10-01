/**
 * useLexicon — shared hook that provides the complete Edo vocabulary
 * from both the static LINGUISTIC_REPOSITORY and Firestore (coreVocabAudio + communityVocab).
 *
 * Used by: LanguageExplorer (dictionary tab), EdoAssistant (vocab context),
 * Voice Lab (drills), and any future component that needs Edo words.
 */
import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { db, isFirebaseUnavailableError } from './firebase';
import { LINGUISTIC_REPOSITORY } from './repository';
import { customAudioCache } from './voice';

export type LexiconValidationStatus =
  | 'candidate'
  | 'under-review'
  | 'verified'
  | 'community-supported'
  | 'conflicting'
  | 'rejected'
  | 'superseded';

export const LEXICON_CATEGORIES = [
  'Words', 'Pronouns', 'Nouns', 'Verbs', 'Adjectives', 'Adverbs', 'Places', 'People / Names',
  'Numbers', 'Dates', 'Time', 'Countries', 'Cities', 'Organizations', 'Animals', 'Plants',
  'Food', 'Objects', 'Colors', 'Technology', 'Science', 'Medicine', 'Engineering',
  'Professional terminology', 'Idioms', 'Expressions', 'Proper nouns', 'Cultural terminology', 'General'
] as const;

export const LEXICON_VALIDATION_STATUSES: LexiconValidationStatus[] = [
  'candidate', 'under-review', 'verified', 'community-supported', 'conflicting', 'rejected', 'superseded'
];

export interface LexiconEntry {
  id: string;
  language: string;
  dialect?: string;
  writtenForm: string;
  pronunciationGuide?: string;
  pronunciation?: string;
  phonology?: string;
  phonemic?: string;
  phoneticRepresentation?: string;
  audioEvidence?: string;
  meaning: string;
  category: string;
  partOfSpeech?: string;
  grammaticalRole?: string;
  semanticConcept?: string;
  exampleSentence?: string;
  translation?: string;
  alternateForms?: string[];
  aliases?: string[];
  register?: string;
  usageNotes?: string;
  source?: string;
  provenance?: string;
  confidence?: number;
  validationStatus?: LexiconValidationStatus;
  createdBy?: string;
  createdAt?: string | number | null;
  updatedAt?: string | number | null;
  version?: number;
  edoWord?: string;
  english?: string;
  phonetic?: string;
  audioUrl?: string;
  context?: string;
  isSeeded: boolean;
}

export interface LexiconCategory {
  category: string;
  entries: LexiconEntry[];
}

export function normalizeLexiconKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toLowerCase();
}

export function createLexiconEntryRecord(input: Partial<LexiconEntry> & { id?: string; writtenForm?: string; meaning?: string; category?: string; language?: string; }): LexiconEntry {
  const language = input.language || 'edo';
  const category = input.category || 'General';
  const writtenForm = input.writtenForm || input.edoWord || input.translation || '';
  const meaning = input.meaning || input.english || input.translation || '';
  const normalizedPhonology = typeof input.phonology === 'string' && input.phonology.trim().length > 0 ? input.phonology.trim() : undefined;
  const normalizedPronunciationGuide = typeof input.pronunciationGuide === 'string' && input.pronunciationGuide.trim().length > 0
    ? input.pronunciationGuide.trim()
    : (typeof input.pronunciation === 'string' && input.pronunciation.trim().length > 0 ? input.pronunciation.trim() : (input.phonetic || undefined));
  return {
    id: input.id || writtenForm || `${language}-${Date.now()}`,
    language,
    dialect: input.dialect,
    writtenForm,
    pronunciationGuide: normalizedPronunciationGuide,
    pronunciation: normalizedPronunciationGuide,
    phonology: normalizedPhonology,
    meaning,
    category,
    partOfSpeech: input.partOfSpeech,
    grammaticalRole: input.grammaticalRole,
    semanticConcept: input.semanticConcept,
    exampleSentence: input.exampleSentence,
    translation: input.translation || meaning,
    alternateForms: input.alternateForms ?? [],
    aliases: input.aliases ?? [],
    register: input.register,
    usageNotes: input.usageNotes || input.context,
    source: input.source || 'admin-training',
    provenance: input.provenance || 'admin-training',
    confidence: input.confidence ?? 0.5,
    validationStatus: input.validationStatus ?? 'candidate',
    createdBy: input.createdBy,
    createdAt: input.createdAt ?? Date.now(),
    updatedAt: input.updatedAt ?? Date.now(),
    version: input.version ?? 1,
    edoWord: writtenForm,
    english: meaning,
    phonetic: normalizedPronunciationGuide || '',
    audioUrl: input.audioUrl,
    context: input.context || input.usageNotes,
    isSeeded: Boolean(input.isSeeded),
  };
}

export function isLexiconEntryEligibleForCompiler(entry: Partial<LexiconEntry>): boolean {
  const status = entry.validationStatus ?? 'candidate';
  if (status === 'candidate' || status === 'under-review' || status === 'conflicting' || status === 'rejected' || status === 'superseded') {
    return false;
  }
  const written = (entry.writtenForm || entry.edoWord || '').trim();
  const meaning = (entry.meaning || entry.english || '').trim();
  return Boolean(written && meaning && entry.language);
}

export function detectDuplicateLexiconEntry(entries: LexiconEntry[], candidate: Partial<LexiconEntry>): boolean {
  const comparison = normalizeLexiconKey((candidate.writtenForm || candidate.edoWord || '').trim());
  if (!comparison) return false;
  const targetCategory = candidate.category || 'General';
  const targetLanguage = candidate.language || 'edo';
  const targetDialect = candidate.dialect || 'default';
  return entries.some((entry) => {
    const sameLanguage = (entry.language || 'edo') === targetLanguage;
    const sameDialect = (entry.dialect || 'default') === targetDialect;
    const sameCategory = (entry.category || 'General') === targetCategory;
    return sameLanguage && sameDialect && sameCategory && normalizeLexiconKey((entry.writtenForm || entry.edoWord || '').trim()) === comparison;
  });
}

/**
 * Seed all LINGUISTIC_REPOSITORY words into Firestore coreVocabAudio
 * so they are available app-wide. Only writes if the doc doesn't exist.
 */
export async function seedLexiconToFirestore() {
  // Disabled: There is no need to bulk write the static dictionary to Firestore on every load.
  // The app merges static data with Firebase overrides in-memory via the useLexicon hook.
  // Admin edits (updateCoreWord) will automatically create the document using { merge: true } if needed.
  return Promise.resolve();
}

export function useLexicon() {
  const [categories, setCategories] = useState<LexiconCategory[]>([]);
  const [allEntries, setAllEntries] = useState<LexiconEntry[]>([]);
  const [trainingContext, setTrainingContext] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const baseMap = new Map<string, LexiconEntry>();

    for (const cat of LINGUISTIC_REPOSITORY) {
      for (const item of cat.items) {
        const seedEntry = createLexiconEntryRecord({
          id: item.term,
          language: 'edo',
          writtenForm: item.term,
          meaning: item.translation,
          pronunciationGuide: item.phonetic,
          category: cat.category,
          source: 'linguistic-repository',
          provenance: 'linguistic-repository',
          validationStatus: 'verified',
          context: item.context,
          isSeeded: true,
        });
        baseMap.set(item.term, seedEntry);
      }
    }

    const unsubCore = onSnapshot(collection(db, 'coreVocabAudio'), (snap) => {
      if (!active) return;
      snap.docs.forEach(d => {
        const data = d.data();
        const staticId = d.id;
        if (data.deleted === true) {
          baseMap.delete(staticId);
          return;
        }
        const existing = baseMap.get(staticId);
        const merged = createLexiconEntryRecord({
          id: staticId,
          language: data.language || existing?.language || 'edo',
          dialect: data.dialect || existing?.dialect,
          writtenForm: data.writtenForm || data.translation || existing?.writtenForm || existing?.edoWord || staticId,
          pronunciationGuide: typeof data.pronunciationGuide === 'string' ? data.pronunciationGuide : (typeof data.pronunciation === 'string' ? data.pronunciation : data.phonetic || existing?.pronunciationGuide),
          phonology: typeof data.phonology === 'string' ? data.phonology : undefined,
          meaning: data.meaning || data.word || existing?.meaning || existing?.english || '',
          category: data.category || existing?.category || 'General',
          partOfSpeech: data.partOfSpeech || existing?.partOfSpeech,
          grammaticalRole: data.grammaticalRole || existing?.grammaticalRole,
          semanticConcept: data.semanticConcept || existing?.semanticConcept,
          exampleSentence: data.exampleSentence || existing?.exampleSentence,
          translation: data.translation || data.word || existing?.translation || existing?.english || '',
          alternateForms: Array.isArray(data.alternateForms) ? data.alternateForms : existing?.alternateForms || [],
          aliases: Array.isArray(data.aliases) ? data.aliases : existing?.aliases || [],
          register: data.register || existing?.register,
          usageNotes: data.usageNotes || data.context || existing?.usageNotes || existing?.context,
          source: data.source || existing?.source || 'coreVocabAudio',
          provenance: data.provenance || existing?.provenance || 'coreVocabAudio',
          confidence: typeof data.confidence === 'number' ? data.confidence : existing?.confidence ?? 0.6,
          validationStatus: data.validationStatus || existing?.validationStatus || 'candidate',
          createdBy: data.createdBy || existing?.createdBy,
          createdAt: data.createdAt || existing?.createdAt,
          updatedAt: data.updatedAt || existing?.updatedAt,
          version: data.version || existing?.version || 1,
          audioUrl: data.audioUrl || existing?.audioUrl,
          context: data.context || existing?.context,
          isSeeded: true,
        });
        if (merged.audioUrl && merged.writtenForm) {
          customAudioCache[merged.writtenForm.toLowerCase().trim()] = merged.audioUrl;
          if (merged.meaning) customAudioCache[merged.meaning.toLowerCase().trim()] = merged.audioUrl;
        }
        baseMap.set(staticId, merged);
      });
      rebuild(baseMap);
    }, (error) => {
      if (!isFirebaseUnavailableError(error) && active) {
        console.error('Error fetching coreVocabAudio:', error);
      }
      if (active) rebuild(baseMap);
    });

    const unsubCommunity = onSnapshot(collection(db, 'communityVocab'), (snap) => {
      if (!active) return;
      snap.docs.forEach(d => {
        const data = d.data();
        if (!data.writtenForm && !data.translation) return;
        const entry = createLexiconEntryRecord({
          id: d.id,
          language: data.language || 'edo',
          dialect: data.dialect,
          writtenForm: data.writtenForm || data.translation,
          pronunciationGuide: data.pronunciationGuide || data.pronunciation || data.phonetic,
          phonology: typeof data.phonology === 'string' ? data.phonology : undefined,
          meaning: data.meaning || data.word || data.translation || '',
          category: data.category || 'Community',
          source: 'communityVocab',
          provenance: 'communityVocab',
          validationStatus: data.validationStatus || 'candidate',
          audioUrl: data.audioUrl,
          context: data.context,
          isSeeded: false,
        });
        if (entry.audioUrl && entry.writtenForm) {
          customAudioCache[entry.writtenForm.toLowerCase().trim()] = entry.audioUrl;
          if (entry.meaning) customAudioCache[entry.meaning.toLowerCase().trim()] = entry.audioUrl;
        }
        baseMap.set(entry.id, entry);
      });
      rebuild(baseMap);
    }, (error) => {
      if (!isFirebaseUnavailableError(error) && active) {
        console.error('Error fetching communityVocab:', error);
      }
      if (active) rebuild(baseMap);
    });

    function rebuild(map: Map<string, LexiconEntry>) {
      const entries = Array.from(map.values());
      setAllEntries(entries);

      const catOrder = [...new Set([...LINGUISTIC_REPOSITORY.map(c => c.category), ...LEXICON_CATEGORIES])];
      const catMap = new Map<string, LexiconEntry[]>();
      for (const entry of entries) {
        const cat = entry.category || 'General';
        if (!catMap.has(cat)) catMap.set(cat, []);
        catMap.get(cat)!.push(entry);
      }

      const ordered: LexiconCategory[] = [];
      for (const cat of catOrder) {
        if (catMap.has(cat)) {
          ordered.push({ category: cat, entries: catMap.get(cat)! });
          catMap.delete(cat);
        }
      }
      for (const [cat, entries] of catMap) {
        ordered.push({ category: cat, entries });
      }

      setCategories(ordered);
      setLoading(false);
    }

    return () => {
      active = false;
      unsubCore();
      unsubCommunity();
    };
  }, []);

  // Subscribe to admin training data
  useEffect(() => {
    const unsubTraining = onSnapshot(
      collection(db, 'aiTraining'),
      (snap) => {
        if (snap.empty) { setTrainingContext(''); return; }
        const lines: string[] = [];
        snap.docs.forEach(d => {
          const data = d.data();
          const type = data.type ?? 'general';
          const edo = data.edoText ?? '';
          const eng = data.englishText ?? '';
          const ctx = data.context ? ` [${data.context}]` : '';
          const corr = data.correction ? ` CORRECTION: ${data.correction}` : '';
          lines.push(`[${type.toUpperCase()}] ${edo} = ${eng}${ctx}${corr}`);
        });
        setTrainingContext(lines.join('\n'));
      }
    );
    return unsubTraining;
  }, []);

  // Build a plain text vocab context string for the AI assistant
  const vocabContextString = allEntries
    .map(e => `${e.meaning || e.english} = ${e.writtenForm || e.edoWord}${e.pronunciationGuide ? ` (pronunciation guide: ${e.pronunciationGuide})` : ''}${e.phonology ? ` (verified phonology: ${e.phonology})` : ''}`)
    .join('\n');

  return { categories, allEntries, loading, vocabContextString, trainingContext };
}
