const MOJIBAKE_REPLACEMENTS: Array<[string, string]> = [
  ['â€™', '’'],
  ['â€œ', '“'],
  ['â€', '”'],
  ['â€“', '–'],
  ['â€”', '—'],
  ['Â ', ' '],
  ['Ã©', 'é'],
  ['Ã¨', 'è'],
  ['Ã¬', 'ì'],
  ['Ã²', 'ò'],
  ['Ã¹', 'ù'],
  ['Ã¡', 'á'],
  ['Ã³', 'ó'],
  ['Ãº', 'ú'],
  ['Ã‰', 'É'],
  ['Ã€', 'À'],
  ['Ãˆ', 'È'],
  ['ÃŒ', 'Ì'],
  ['Ã’', 'Ò'],
  ['Ã™', 'Ù'],
  ['â€¦', '…'],
];

export function repairMojibake(text: string): string {
  const repaired = MOJIBAKE_REPLACEMENTS.reduce(
    (result, [broken, fixed]) => result.replaceAll(broken, fixed),
    text
  );

  // Replacement glyphs cannot be reconstructed, so remove both the Unicode
  // glyph and its common UTF-8-as-Latin-1 form wherever they occur.
  return repaired
    .replace(/ï¿½/giu, '')
    .replace(/\uFFFD/g, '')
    .replace(/\bvb(?=\s+ugie\b)/giu, 'vb')
    .replace(/[ \t]{2,}/g, ' ');
}
