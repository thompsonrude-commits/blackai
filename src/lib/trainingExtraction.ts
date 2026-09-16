export interface ExtractedTrainingEntry {
  nativeText: string;
  englishText: string;
  phonetics: string;
  context: string;
  type: 'vocabulary' | 'conversation' | 'culture';
}

const NUMBER_NAMES = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
  'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
  'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty',
];

function addEntry(entries: ExtractedTrainingEntry[], nativeText: string, englishText: string, context: string, type: ExtractedTrainingEntry['type'] = 'vocabulary') {
  const native = String(nativeText || '').replace(/[*_]/g, '').trim();
  const english = String(englishText || '').replace(/[*_]/g, '').trim();
  if (!native || !english || native.length > 120 || english.length > 300) return;
  if (/https?:\/\/|mailto:|!\[|\]\(|^#{1,6}\s|^(Title|URL Source|Published Time)$/i.test(`${native} ${english}`)) return;
  if (!entries.some(entry => entry.nativeText.toLowerCase() === native.toLowerCase() && entry.englishText.toLowerCase() === english.toLowerCase())) {
    entries.push({ nativeText: native, englishText: english, phonetics: '', context, type });
  }
}

export function extractTrainingEntries(text: string, languageName: string): ExtractedTrainingEntry[] {
  const entries: ExtractedTrainingEntry[] = [];
  const source = repairMojibake(text).replace(/\r/g, '');

  // Supports the Edo Nation page format: **Edo phrase** English meaning.
  const boldPairPattern = /(?:\*\*[_]?)([^*_\n]+?)(?:[_]?\*\*)\s+([^*_]+?)(?=\s+(?:[_]?\*\*)|$)/g;
  for (const match of source.matchAll(boldPairPattern)) {
    addEntry(entries, match[1], match[2], `Extracted from ${languageName} source`, 'vocabulary');
  }

  for (const line of source.split('\n')) {
    const trimmed = line.replace(/^\s*[-*]\s*/, '').trim();
    if (!trimmed) continue;

    let match = trimmed.match(/^(.+?)\s*[-–—:]\s*(.+)$/);
    if (match) {
      addEntry(entries, match[1], match[2], `Extracted from ${languageName} source`);
      continue;
    }

    match = trimmed.match(/["'](.+?)["']\s+(?:means?|translates?\s+to|is)\s+["'](.+?)["']/i);
    if (match) {
      addEntry(entries, match[1], match[2], `Extracted from ${languageName} source`, 'conversation');
    }
  }

  // Numbered lists such as "1. Owo / Okpa 2. Eva 3. Eha" contain useful
  // vocabulary even when the source does not provide an English column.
  const numberedPattern = /(?:^|\s)(\d{1,2})\.\s*([^0-9]+?)(?=\s+\d{1,2}\.\s*|$)/g;
  for (const match of source.matchAll(numberedPattern)) {
    const number = Number(match[1]);
    const native = match[2].replace(/[|;].*$/, '').trim();
    if (number > 0 && number <= NUMBER_NAMES.length && native.length <= 80) {
      addEntry(entries, native, NUMBER_NAMES[number], `Numbered vocabulary from ${languageName} source`);
    }
  }

  return entries;
}
import { repairMojibake } from './textEncoding';
