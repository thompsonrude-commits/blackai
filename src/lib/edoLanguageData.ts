/**
 * EDO (BINI) LANGUAGE REFERENCE
 * Authentic words, phrases, and sentences from:
 * - https://en.wikivoyage.org/wiki/Bini_phrasebook
 * - https://www.edo-nation.net/edowords.htm
 * - Melzian Dictionary of Bini Language (1937)
 * - Edo linguistic resources
 */

export const EDO_LANGUAGE_DATA = {
  sources: [
    {
      title: 'Bini phrasebook',
      url: 'https://en.wikivoyage.org/wiki/Bini_phrasebook',
      status: 'reviewed',
    },
    {
      title: 'General Rule Learning Edo - Nigerian Language',
      url: 'https://edonationsatelite.blogspot.com/2014/02/general-rule-learning-edo-nigerian.html',
      status: 'cross-checked',
      note: 'Used to confirm common Edo greetings and phrases in the model reference library.',
    },
    {
      title: 'Edo Africa names dictionary E-E',
      url: 'https://www.edoworld.net/Edo_Africa_names_dictionary_E_Ehtml.html',
      status: 'cross-checked',
      note: 'Added to improve lexical coverage for names and common cultural vocabulary.',
    },
    {
      title: 'Agheysi, Rebecca N. - An Edo-English Dictionary',
      url: 'https://www.scribd.com/document/715624609/Agheysi-Rebecca-N-An-Edo-English-Dictionary',
      status: 'cross-checked',
      note: 'Used as a dictionary reference for everyday Edo terms and translation quality.',
    },
    {
      title: 'Translation of some Edo words',
      url: 'https://www.nairaland.com/1929131/translation-some-edo-words',
      status: 'community-checked',
      note: 'Community-language reference added to improve natural phrasing in the assistant.',
    },
    {
      title: 'Edo Grammar',
      url: 'https://www.scribd.com/document/878770620/Edo-Grammar',
      status: 'cross-checked',
      note: 'Used to improve word-class notes, noun/verb examples, and sentence patterns for the assistant.',
    },
    {
      title: 'Adverbial clauses in Edo language',
      url: 'https://www.scribd.com/document/715624485/ADVERBIAL-CLAUSES-IN-EDO-LANGUAGE',
      status: 'cross-checked',
      note: 'Used to add clause-level examples and adverbial phrasing guidance to the Edo grammar notes.',
    },
    {
      title: 'Tense and Aspect in Edo',
      url: 'https://www.researchgate.net/publication/261613802_Tense_and_Aspect_in_Edo',
      status: 'cross-checked',
      note: 'Used to refine the conservatively phrased tense/aspect guidance and avoid over-generalized verb claims.',
    },
    {
      title: 'Focus and question formation in Edo',
      url: 'https://scispace.com/pdf/focus-and-question-formation-in-edo-6ym5usew9a.pdf',
      status: 'needs-document-verification',
      note: 'Review note for question-formation patterns; retained as a source for further validation and grammar research.',
    },
    {
      title: 'The Edo Verb',
      url: 'https://www.academia.edu/6772783/The_Edo_Verb',
      status: 'needs-document-verification',
    },
    {
      title: 'Edo Words/Language - Phonology',
      url: 'https://www.edo-nation.net/edowords.htm',
      status: 'reviewed',
      note: 'Reviewed for the historical and cultural glossary; entries are labeled as cultural terms where appropriate.',
    },
  ],

  // Bini orthography uses contrastive vowel qualities and consonant clusters.
  // Keep these distinctions when normalising or pronouncing Edo text.
  pronunciationGuide: {
    vowels: {
      'ẹ': '[e/open-mid]',
      'ọ': '[ɔ]',
    },
    clusters: {
      'gh': 'voiced velar fricative',
      'vb': 'labial-velar consonant sequence',
      'rh': 'rhotic consonant sequence',
      'kh': 'aspirated velar consonant sequence',
      'kp': 'labial-velar stop',
      'gb': 'voiced labial-velar stop',
      'mw': 'labialized nasal sequence',
    },
    note: 'Tone and vowel quality can change meaning. Preserve diacritics when a speaker supplies them.',
  },

  // Conservative verb guidance for the assistant. Do not invent conjugations
  // until the full Edo Verb reference has been verified.
  verbNotes: {
    wordOrder: 'Prefer subject-verb-object examples unless a verified source specifies another construction.',
    aspect: 'Treat tense, aspect, negation, and focus as construction-level features; ask for context when a form is ambiguous.',
    examples: [
      { edo: 'Rrie', english: 'go' },
      { edo: 'Rre', english: 'come' },
      { edo: 'Re', english: 'eat' },
      { edo: 'Guan', english: 'speak / talk' },
      { edo: 'Rẹn', english: 'know' },
      { edo: 'Miẹ', english: 'find / get / receive' },
    ],
  },

  grammarNotes: {
    wordClasses: [
      'Nouns such as Ọmwan (person), Iye (mother), and Ẹrhiẹ (water) help anchor descriptive Edo sentences.',
      'Verbs and motion expressions such as Rre (come), Gho (go), and Vbe (be / stay) are commonly used in daily speech.',
      'Adverbial clause patterns are structure-sensitive and should be handled with short contextual examples instead of invented suffixes.',
      'Question formation in Edo often relies on particles or intonation, so a conservative phrase-based approach is safer than aggressive inference.',
    ],
    clausePatterns: [
      'Greeting + question: Kọyọ, vbèè óye hé?',
      'Greeting + reply: Dọmọ! Vbọ yehẹ?',
      'State + compliment: Ma vbe khian mue.',
      'Request + politeness: Lahọ, ma vbe khian.',
    ],
    tenseAspect: 'Use context-sensitive phrasing for time and aspect unless a specific Edo source supplies the exact marking. The research literature emphasizes that tense/aspect in Edo is often clause-based and not always encoded by a single fixed marker.',
    questionFormation: 'When generating Edo questions, prefer known forms such as “Vbọ yehẹ?” or “Vbèè óye hé?” and avoid overgeneralizing unverified interrogative particles.',
  },

  // ── GREETINGS & BASICS ────────────────────────────────────────────
  greetings: {
    'kọyọ': 'Hello (common)',
    'kọọ': 'Hello (variant)',
    'dọmọ': 'Respectful greeting / welcome',
    'vbèè óye hé?': 'How are you?',
    'vbọ yehẹ': 'How are you? (variant)',
    'mio': 'I am fine / okay',
    'ọvbi': 'child / family member',
    'ẹvbi': 'child / offspring',
    'erha': 'father',
    'iye': 'mother',
    'ẹrhiẹ': 'water',
    'iyan': 'yam',
    'ọka': 'corn / maize',
    'ọbowiẹ': 'Good morning',
    'ọbavan': 'Good afternoon',
    'ọbota': 'Good evening',
    'òkhíen òwie': 'Good night / Until tomorrow morning',
    'obo kia': 'Welcome',
    'obiluu': 'Thank you',
    'lahọ': 'Please',
    'i horen': 'Greetings accepted',
    'uzébu': 'Great / Excellent',
    'osa no fangbe u wa hia': 'God blesses you all',
    'khian': 'Good / beautiful / well',
    'vbe': 'Be / stay / be in a state',
    'rre': 'Come',
    'gho': 'Go',
    'riẹ': 'Eat',
  },

  // ── NUMBERS (OGO) ────────────────────────────────────────────────
  numbers: {
    'owo': 'One',
    'ọkpa': 'One (variant)',
    'eva': 'Two',
    'eha': 'Three',
    'enẹ': 'Four',
    'isẹn': 'Five',
    'ehan': 'Six',
    'ihinrọn': 'Seven',
    'erẹnrẹn': 'Eight',
    'ihinrin': 'Nine',
    'igbe': 'Ten',
    'owọọrọ': 'Eleven',
    'iweeva': 'Twelve',
    'iweeha': 'Thirteen',
    'iweenẹ': 'Fourteen',
    'ekesugie': 'Fifteen',
    'ọkpa yan ekesugie': 'Sixteen',
    'eva yan ekesugie': 'Seventeen',
    'eha yan ekesugie': 'Eighteen',
    'enẹ yan ekesugie': 'Nineteen',
    'ugie': 'Twenty',
    'ọgban': 'Thirty',
    'iyeva': 'Forty',
    'ekigbesiyeha': 'Fifty',
    'iyeha': 'Sixty',
    'ekigbesiyenẹ': 'Seventy',
    'isẹn yan ekigbesiyenẹ': 'Seventy-five',
    'iyenẹ': 'Eighty',
    'isẹn yan iyenẹ': 'Eighty-five',
    'ekigbesiyisẹn': 'Ninety',
    'isẹn yan ekigbesiyisẹn': 'Ninety-five',
    'iyisẹn': '100',
    'uri': '200',
  },

  // ── DAYS OF THE WEEK (EDU) ────────────────────────────────────────
  days: {
    'uzóla-nokhua': 'Sunday',
    'èdè okaro vbe uzóla': 'Monday',
    'èdè ogieva vbe uzóla': 'Tuesday',
    'èdè ogieha vbe uzóla': 'Wednesday',
    'ede ogiene vbe uzóla': 'Thursday',
    'ede ogisen uzóla': 'Friday',
    'uzóla-nekhere': 'Saturday',
  },

  // ── MONTHS (UKI) ──────────────────────────────────────────────────
  months: {
    'uki ague': 'January',
    'uki ifie': 'February',
    'uki egbo': 'March',
    'uki ekhuen': 'April',
    'uki egua': 'May',
    'uki ikpesi': 'June',
    'uki iviema': 'July',
    'uki ohie': 'August',
    'uki eho': 'September',
    'uki emorho': 'October',
    'uki ewe': 'November',
    'uki igue': 'December',
  },

  // ── SEASONS ────────────────────────────────────────────────────────
  seasons: {
    'uyunmwu': 'Dry season',
    'ohonrre': 'Spring',
    'orho': 'Rainy season',
    'erho': 'Harvest season',
  },

  // ── COLORS (IKỌLỌ) ────────────────────────────────────────────────
  colors: {
    'ọfasẹ': 'White',
    'nekhui': 'Black',
    'ọbishi': 'Black (variant)',
    'ọlilẹ': 'Red',
    'ọmebe': 'Green',
    'ọdane': 'Blue',
    'ọnivọ': 'Yellow',
    'ọbiebie': 'Purple',
  },

  // ── BODY PARTS (ARHE) ──────────────────────────────────────────────
  bodyParts: {
    'uhun': 'Head',
    'ehor': 'Ear',
    'eto': 'Hair',
    'aro': 'Eyes',
    'ihue': 'Nose',
    'arramwen': 'Tongue',
    'ukpunu': 'Lips',
    'ihere': 'Armpit',
    'ewęn': 'Breast',
    'atata obọ': 'Palm',
    'ekuaowẹ': 'Thigh',
    'ikpian\'owẹ': 'Toes',
    'ikpian\'bọ': 'Fingers',
    'akọn': 'Teeth',
    'igbọn': 'Knee',
    'unu': 'Mouth',
    'atata owẹ': 'Foot',
    'ugb\'aro': 'Face',
    'iyeke': 'Back',
    'eko': 'Belly',
    'izabọ': 'Shoulder',
  },

  // ── FAMILY (EGBALE) ────────────────────────────────────────────────
  family: {
    'érhá': 'Father',
    'iye': 'Mother',
    'byėcana': 'Child',
    'omo': 'Child (variant)',
    'erha nokhua': 'Grandfather',
  },

  // ── FOOD (OHEN) ────────────────────────────────────────────────────
  food: {
    'akasan': 'Native pudding',
    'eka': 'Beans fired cake',
    'imieki': 'Plantain baked cake',
    'emieki': 'Plantain baked cake (variant)',
    'ọka': 'Corn/Maize',
    'izẹ': 'Rice',
    'erere': 'Beans',
    'iyenbo': 'Sweet potato',
    'ekaebo': 'Biscuits',
    'ikpogi': 'Melon soup',
    'uwonmwen ohere': 'Ogbolor soup',
    'ema': 'Pounded yam',
    'iýan': 'Yam',
    'iýan igiowa': 'Water yam',
    'akarha': 'Coco yam',
    'akarha iyokho': 'Purple coco yam',
    'ọghẹdẹ': 'Plantain',
    'ogi': 'Melon',
    'ekoko': 'Cocoa',
    'ẹkọ': 'Maize puddy',
    'usi': 'Starch',
  },

  // ── INGREDIENTS (EMEJE) ────────────────────────────────────────────
  ingredients: {
    'umwen': 'Salt',
    'emagi': 'Maggi',
    'ofigbon': 'Palm oil',
    'etomatosi': 'Tomatoes',
    'ikhiavbor': 'Okro',
    'alubarra': 'Onion',
    'evbarhie': 'Locust bean paste/Maggi',
  },

  // ── FRUITS ────────────────────────────────────────────────────────
  fruits: {
    'alimo': 'Orange',
    'alimo asidi': 'Grape',
    'alimo negiẹrẹ': 'Lime',
    'ako': 'Pepper fruit',
    'ebanana': 'Banana',
    'ẹdin': 'Palm fruits',
    'ẹdin-ebo': 'Pineapple',
    'ekasiu': 'Cashew',
    'etengari': 'Tangerine',
    'orruru': 'Cherry',
    'ikpẹdin': 'Palm nut',
    'uvbohoro': 'Pawpaw',
    'ogui': 'Bush mango',
    'ohun': 'Pear',
  },

  // ── COMMON WORDS & PHRASES ────────────────────────────────────────
  commonWords: {
    'ẹ̀dó': 'Edo (language/people)',
    'bini': 'Bini (language/people)',
    'dọmọ': 'A respectful greeting or response; often used in place of hello/welcome',
    'vbọ yehẹ': 'How are you?',
    'mio': 'I am fine / okay',
    'obiluu': 'Thank you',
    'lahọ': 'Please',
    'iyoba': 'Queen',
    'oba': 'King',
    'omwan': 'Chief/Prince',
    'ọvbi': 'child / family member',
    'ẹvbi': 'child / offspring',
    'erha': 'father',
    'iye': 'mother',
    'ẹrhiẹ': 'water',
    'iyan': 'yam',
    'ọka': 'corn / maize',
    'ẹvbo': 'people / community',
    'ẹsẹ': 'road / path',
    'oronmwen': 'Marriage',
    'ìsélógbé': 'Complements of the seasons',
    'i horen': 'Response to greeting - accepted',
    'ma vbe khian': 'I am okay / I am in a good state',
    'ma vbe khian mue': 'Help me / please help me',
    'ma gho hia': 'Let me go there',
    'rre hia': 'Come here',
    'gho hia': 'Go there',
  },

  // Curated entries from Edo Nation's historical/cultural glossary. These
  // should not be treated as a modern everyday dictionary without context.
  edoNationWords: [
    { edo: 'Ada', english: 'Scimitar carried before the Oba', category: 'Cultural object' },
    { edo: 'Agba', english: 'Rectangular stool', category: 'Cultural object' },
    { edo: 'Agbado', english: 'Important market in Benin City', category: 'Place' },
    { edo: 'Aho', english: 'Fourth day of the Edo week', category: 'Calendar' },
    { edo: 'Amazeh / Amaze', english: 'Moulded clay figure of a human being', category: 'Art' },
    { edo: 'Amufi', english: 'Guild associated with catching eagles alive and tree-top acrobatics', category: 'Guild' },
    { edo: 'Arhuanran', english: 'Giant', category: 'Description' },
    { edo: 'Avan', english: 'Afternoon', category: 'Time' },
    { edo: 'Aza', english: 'Treasury', category: 'Administration' },
    { edo: 'Eben', english: 'Sword of authority carried before the Oba', category: 'Cultural object' },
    { edo: 'Ebo', english: 'Guild of diviners; also a symbolic object representing a deity', category: 'Religion', context: 'The source records two meanings with different pronunciation guidance; ask for context.' },
    { edo: 'Edaiken', english: 'Title of the heir apparent to the Benin throne', category: 'Royal title' },
    { edo: 'Edion', english: 'Elders; Odion is singular elder', category: 'People' },
    { edo: 'Edion Edo', english: 'Ancestors of the Edo people', category: 'Heritage' },
    { edo: 'Edo Orisiagbon', english: 'Edo/Benin is the cradle of the world', category: 'Heritage phrase' },
    { edo: 'Eghae vbo', english: 'Counsellor', category: 'Title' },
    { edo: 'Eghae vbo n’ore', english: 'Town or state counsellor', category: 'Title' },
    { edo: 'Eguae', english: 'Palace', category: 'Place' },
    { edo: 'Egue', english: 'Hoe', category: 'Tool' },
    { edo: 'Eguen', english: 'Entry recorded by the source; meaning requires native-speaker verification', category: 'Needs verification' },
  ],

  // ── PRONUNCIATION GUIDE ────────────────────────────────────────────
  pronunciation: {
    'kọyọ': 'CORE-your',
    'kọọ': 'core',
    'dọmọ': 'DOH-moh',
    'vbọ yehẹ': 'VBOH yeh-HEH',
    'vbèè óye hé': 'VBAY-AY O-yay HAY',
    'mio': 'mee-OH',
    'ọbowiẹ': 'OR-BOW-we-YEAH',
    'ọbavan': 'OR-BAR-van',
    'ọbota': 'OR-BOW-tar',
    'obiluu': 'O-bi-lu',
    'lahọ': 'lah-HOH',
    'uzébu': 'u-ZAY-boo',
  },

  // ── SAMPLE CONVERSATIONAL PHRASES ──────────────────────────────────
  conversations: [
    { edo: 'Kọyọ, vbèè óye hé?', english: 'Hello, how are you?' },
    { edo: 'Dọmọ! Vbọ yehẹ?', english: 'Hello! How are you?' },
    { edo: 'Mio. Obiluu.', english: 'I am fine. Thank you.' },
    { edo: 'Ọbowiẹ, nyamọ.', english: 'Good morning.' },
    { edo: 'Ọbavan, Dọmọ.', english: 'Good afternoon. Hello.' },
    { edo: 'Ọbota, obo kia.', english: 'Good evening, welcome.' },
    { edo: 'Lahọ, ma vbe khian.', english: 'Please, help me.' },
    { edo: 'Ma vbe khian mue.', english: 'I am okay / help me.' },
    { edo: 'Rre hia, ma vbe khian.', english: 'Come here, I am okay.' },
    { edo: 'Gho hia, ma vbe khian.', english: 'Go there, I am okay.' },
    { edo: 'Ọvbi khian.', english: 'The child is good.' },
    { edo: 'Ẹrhiẹ khian.', english: 'The water is good / clean.' },
    { edo: 'Obiluu, i dey fine.', english: 'Thank you, I am fine.' },
    { edo: 'Obo kia, welcome.', english: 'Welcome, welcome.' },
    { edo: 'Osa no fangbe u wa hia.', english: 'God blesses you all.' },
    { edo: 'Uzébu, uzébu.', english: 'Great, great.' },
    { edo: 'I horen, thank you.', english: 'Greetings accepted, thank you.' },
    { edo: 'Òkhíen òwie.', english: 'Good night / See you tomorrow morning.' },
  ],
};

/**
 * Get Edo keyword for language detection
 */
export function isEdoKeyword(word: string): boolean {
  const normalized = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const allKeywords = Object.keys(EDO_LANGUAGE_DATA.greetings)
    .concat(Object.keys(EDO_LANGUAGE_DATA.commonWords))
    .concat(Object.keys(EDO_LANGUAGE_DATA.food))
    .concat(EDO_LANGUAGE_DATA.edoNationWords.map(entry => entry.edo));

  return allKeywords.some(kw => {
    const kwNorm = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalized === kwNorm || normalized.includes(kwNorm) || kwNorm.includes(normalized);
  });
}

/**
 * Get Edo phrase with English translation
 */
export function getEdoPhrase(edo: string): string | null {
  const phrase = EDO_LANGUAGE_DATA.conversations.find(
    p => p.edo.toLowerCase().includes(edo.toLowerCase())
  );
  return phrase ? phrase.english : null;
}

/**
 * Get pronunciation for Edo word
 */
export function getEdoPronunciation(word: string): string | null {
  return EDO_LANGUAGE_DATA.pronunciation[word] || null;
}

export default EDO_LANGUAGE_DATA;
