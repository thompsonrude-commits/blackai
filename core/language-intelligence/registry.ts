import type { LanguageProfile } from './types';

const baseCapabilities = {
  textInput: true,
  textOutput: true,
  translation: true,
  interpretation: true,
  speechRecognition: false,
  textToSpeech: false,
  conversation: true,
  learning: true,
};

function profile(
  languageId: string,
  displayName: string,
  nativeName: string,
  languageFamily: string,
  countryRegions: string[],
  detectionHints: string[],
  options: Partial<LanguageProfile> = {},
): LanguageProfile {
  return {
    languageId,
    displayName,
    nativeName,
    alternativeNames: [],
    languageFamily,
    countryRegions,
    dialects: [],
    writingSystems: ['Latin'],
    supportLevel: 'partial',
    rtl: false,
    capabilities: { ...baseCapabilities },
    culturalContextAvailable: true,
    trainingDataAvailable: false,
    detectionHints,
    ...options,
  };
}

export const AFRICAN_LANGUAGE_PROFILES: LanguageProfile[] = [
  profile('edo', 'Edo / Bini', 'Ẹ̀dó', 'Edoid', ['Nigeria: Edo State'], ['koyo', 'kọyo', 'vbèè', 'oye', 'obọ', 'ọvbi'], { supportLevel: 'supported', trainingDataAvailable: true, dialects: ['Benin', 'Owan', 'Etsako'] }),
  profile('pcm', 'Nigerian Pidgin', 'Naija', 'English-lexified Creole', ['Nigeria'], ['abeg', 'how far', 'wetin', 'dey', 'make we', 'no wahala', 'na so'], { supportLevel: 'supported', trainingDataAvailable: true, alternativeNames: ['Pidgin', 'Naija'] }),
  profile('yo', 'Yoruba', 'Yorùbá', 'Yoruboid', ['Nigeria', 'Benin', 'Togo'], ['bawo', 'ẹ ṣé', 'mo fẹ́', 'ọ̀rẹ́', 'ẹ káàrọ̀'], { supportLevel: 'supported', trainingDataAvailable: true, dialects: ['Standard Yoruba'] }),
  profile('ig', 'Igbo', 'Asụsụ Igbo', 'Igboid', ['Nigeria'], ['kedu', 'biko', 'nno', 'daalu', 'anyị', 'onye'], { supportLevel: 'supported', trainingDataAvailable: true, dialects: ['Standard Igbo'] }),
  profile('ha', 'Hausa', 'Hausa', 'Chadic', ['Nigeria', 'Niger', 'Ghana'], ['sannu', 'yaya', 'lafiya', 'na gode', 'ina kwana'], { supportLevel: 'supported', trainingDataAvailable: true }),
  profile('efik', 'Efik', 'Efịk', 'Cross River', ['Nigeria: Cross River'], ['m̀mọ', 'ñkpọ', 'efik'], { supportLevel: 'experimental' }),
  profile('ibibio', 'Ibibio', 'Ibibio', 'Cross River', ['Nigeria: Akwa Ibom'], ['ibibio', 'akwa ibom'], { supportLevel: 'experimental' }),
  profile('tiv', 'Tiv', 'Tiv', 'Benue-Congo', ['Nigeria: Benue'], ['tiv', 'tar', 'aondo'], { supportLevel: 'experimental' }),
  profile('kanuri', 'Kanuri', 'Kanuri', 'Saharan', ['Nigeria: Borno', 'Niger', 'Chad'], ['kanuri'], { supportLevel: 'planned' }),
  profile('nupe', 'Nupe', 'Nupe', 'Nupoid', ['Nigeria: Niger'], ['nupe'], { supportLevel: 'planned' }),
  profile('itsekiri', 'Itsekiri', 'Itsekiri', 'Yoruboid', ['Nigeria: Delta'], ['itsekiri'], { supportLevel: 'experimental' }),
  profile('sw', 'Swahili', 'Kiswahili', 'Bantu', ['East Africa'], ['habari', 'asante', 'jambo', 'tafadhali'], { supportLevel: 'experimental' }),
  profile('am', 'Amharic', 'አማርኛ', 'Semitic', ['Ethiopia'], ['አማርኛ'], { supportLevel: 'planned', writingSystems: ['Geʽez'] }),
  profile('zu', 'Zulu', 'isiZulu', 'Bantu', ['South Africa'], ['sawubona', 'ngiyabonga'], { supportLevel: 'planned' }),
  profile('xh', 'Xhosa', 'isiXhosa', 'Bantu', ['South Africa'], ['molo', 'enkosi'], { supportLevel: 'planned' }),
  profile('wo', 'Wolof', 'Wolof', 'Senegambian', ['Senegal', 'Gambia'], ['jamm rekk'], { supportLevel: 'planned' }),
];

export class LanguageRegistry {
  private readonly profiles = new Map(AFRICAN_LANGUAGE_PROFILES.map((item) => [item.languageId, item]));

  register(profileToAdd: LanguageProfile): void {
    if (!profileToAdd.languageId.trim()) throw new Error('languageId is required');
    this.profiles.set(profileToAdd.languageId, { ...profileToAdd, detectionHints: [...profileToAdd.detectionHints] });
  }

  get(languageId: string): LanguageProfile | undefined {
    return this.profiles.get(languageId);
  }

  require(languageId: string): LanguageProfile {
    const found = this.get(languageId);
    if (!found) throw new Error(`Unsupported language: ${languageId}`);
    return found;
  }

  list(): LanguageProfile[] {
    return [...this.profiles.values()].map((item) => ({ ...item, detectionHints: [...item.detectionHints] }));
  }
}

export const defaultLanguageRegistry = new LanguageRegistry();
