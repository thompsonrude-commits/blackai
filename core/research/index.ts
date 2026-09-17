import { defaultCognitiveBrain, defaultLanguageCoordinationEngine } from '../language-intelligence';

export type ResearchDomain = 'medical' | 'one_health' | 'veterinary' | 'plant' | 'environment' | 'general';

export interface ResearchHypothesis {
  title: string;
  rationale: string;
  confidence: number;
  evidence: string[];
  nextSteps: string[];
  cautions: string[];
}

export interface ResearchResponse {
  domain: ResearchDomain[];
  title: string;
  summary: string;
  response: string;
  language: string;
  sourceLanguage: string;
  confidence: number;
  safetyWarnings: string[];
  hypotheses: ResearchHypothesis[];
  evidence: string[];
  provenance: string[];
}

const MEDICAL_HINTS = [
  'symptom', 'symptoms', 'diagnosis', 'diagnostic', 'disease', 'diseases', 'infection', 'infectious',
  'treatment', 'therapy', 'medication', 'medicine', 'clinical', 'health', 'fever', 'cough', 'pain',
  'rash', 'headache', 'fatigue', 'nausea', 'diarrhoea', 'diarrhea', 'doctor', 'hospital', 'clinic',
  'diagnose', 'patient', 'medical', 'screening', 'pathogen', 'outbreak', 'viral', 'bacterial', 'parasitic',
];

const ONE_HEALTH_HINTS = [
  'one health', 'zoonotic', 'cross-species', 'livestock', 'cattle', 'goat', 'poultry', 'animal health',
  'farm', 'crop disease', 'plant health', 'soil health', 'environmental health', 'food safety', 'resistance',
  'antimicrobial resistance', 'human and animal', 'pet and people', 'water quality', 'ecology', 'veterinary',
];

const VETERINARY_HINTS = ['veterinary', 'livestock', 'cattle', 'goat', 'poultry', 'animal', 'cow', 'pig', 'sheep', 'pet', 'farm animal'];
const PLANT_HINTS = ['crop', 'plant disease', 'orchard', 'leaf spot', 'fungal disease', 'soil', 'pest', 'plant health', 'maize', 'cassava'];
const ENVIRONMENT_HINTS = ['environment', 'pollution', 'water quality', 'sanitation', 'ecology', 'air quality', 'vector'];

function normalize(input: string): string {
  return (input || '').toLowerCase().trim();
}

function toSentenceCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function classifyResearchDomains(text: string): ResearchDomain[] {
  const normalized = normalize(text);
  const domains = new Set<ResearchDomain>();

  if (!normalized) return ['general'];

  if (MEDICAL_HINTS.some((hint) => normalized.includes(hint))) domains.add('medical');
  if (ONE_HEALTH_HINTS.some((hint) => normalized.includes(hint))) domains.add('one_health');
  if (VETERINARY_HINTS.some((hint) => normalized.includes(hint))) domains.add('veterinary');
  if (PLANT_HINTS.some((hint) => normalized.includes(hint))) domains.add('plant');
  if (ENVIRONMENT_HINTS.some((hint) => normalized.includes(hint))) domains.add('environment');

  if (domains.size === 0) {
    const hasHealthContext = /(clinic|doctor|symptom|disease|health|illness|treatment|infection|medicine|medication|diagnosis|cattle|crop|soil|water|animal|plant)/i.test(normalized);
    if (hasHealthContext) domains.add('medical');
  }

  if (domains.size === 0) return ['general'];

  if (domains.has('one_health')) {
    domains.add('medical');
    domains.add('veterinary');
    domains.add('environment');
  }

  return [...domains];
}

export class MedicalProblemSolver {
  async solve(problem: string): Promise<ResearchResponse> {
    const detection = defaultLanguageCoordinationEngine.detectLanguage(problem);
    const semantic = await defaultLanguageCoordinationEngine.interpret(problem, detection.languageId);
    const language = detection.languageId || 'en';
    const symptoms = [
      'fever', 'body pain', 'fatigue', 'cough', 'diarrhoea', 'headache', 'rash', 'weakness',
    ].filter((term) => new RegExp(term.replace(/\s+/g, '.*'), 'i').test(problem));

    const hypotheses: ResearchHypothesis[] = [
      {
        title: 'Infectious or inflammatory illness remains a leading possibility',
        rationale: 'The request includes a symptom set consistent with a general infectious/inflammatory condition, so the first pass should look for common patterns rather than assuming a diagnosis.',
        confidence: 0.62,
        evidence: symptoms.length > 0 ? [`Detected symptoms: ${symptoms.join(', ')}`] : ['The request mentions a health concern but not a verified diagnosis.'],
        nextSteps: [
          'Clarify the timeline, severity, and any red flags such as breathing trouble, dehydration, chest pain, confusion, or severe weakness.',
          'Ask which body systems are involved so the differential stays anchored to actual symptoms.',
        ],
        cautions: [
          'This is not a diagnosis or treatment recommendation.',
          'Urgent care is needed for trouble breathing, fainting, confusion, persistent chest pain, or severe dehydration.',
        ],
      },
      {
        title: 'Context-specific differential should be narrowed by exposures and duration',
        rationale: 'Common diagnoses depend heavily on recent exposures, travel, contact history, food or water issues, and how long the symptoms have been present.',
        confidence: 0.46,
        evidence: [
          'Symptom timing and exposure context are not yet available from the prompt alone.',
          'Medical reasoning should rely on context and red-flag screening before any claim becomes treatment guidance.',
        ],
        nextSteps: [
          'Collect onset time, fever pattern, location, exposure to sick contacts, and whether the patient has a chronic condition.',
          'Use a structured symptom review to separate common illness, allergic reaction, and urgent conditions.',
        ],
        cautions: [
          'Do not infer a diagnosis from a short message alone.',
          'Any severe or rapidly worsening illness should be escalated to qualified healthcare professionals.',
        ],
      },
    ];

    const plan = await defaultCognitiveBrain.plan(problem, 'research-medical');
    const summary = `This looks like a medical reasoning request in ${language}. The system should maintain the original health context, avoid pretending to diagnose, and focus on a cautious differential plus red-flag screening.`;
    const response = `${summary}\n\n${hypotheses.map((h, index) => `${index + 1}. ${h.title}: ${h.rationale}`).join('\n')}\n\nSafety note: do not treat this as a diagnosis. Seek in-person clinical assessment for severe symptoms, worsening conditions, or signs of emergency.`;

    return {
      domain: ['medical'],
      title: 'Medical problem-solving and differential review',
      summary,
      response,
      language,
      sourceLanguage: semantic.sourceLanguage,
      confidence: 0.68,
      safetyWarnings: [
        'This is a general clinical reasoning aid, not a diagnosis.',
        'Urgent symptoms require immediate medical evaluation.',
      ],
      hypotheses,
      evidence: semantic.entities.map((entity) => `${entity.type}: ${entity.value}`),
      provenance: plan.knowledge.map((record) => record.sourceType),
    };
  }
}

export class OneHealthOrchestrator {
  async analyze(question: string): Promise<ResearchResponse> {
    const detection = defaultLanguageCoordinationEngine.detectLanguage(question);
    const semantic = await defaultLanguageCoordinationEngine.interpret(question, detection.languageId);
    const domains = classifyResearchDomains(question);
    const humanRisk = /human|people|community|family|hospital|patient/i.test(question);
    const animalRisk = /cattle|livestock|goat|poultry|animal|farm/i.test(question);
    const plantRisk = /crop|plant|soil|leaf|fungus|pest|maize|cassava/i.test(question);
    const environmentRisk = /water|air|soil|pollution|sanitation|vector|ecology|environment/i.test(question);

    const hypotheses: ResearchHypothesis[] = [
      {
        title: 'One Health signal is present across at least one domain',
        rationale: 'The prompt contains cross-domain signals that may link human, animal, plant, or environmental conditions through shared exposures and transmission dynamics.',
        confidence: 0.7,
        evidence: [
          humanRisk ? 'Human exposure indicators are present.' : 'No direct human exposure signal was detected.',
          animalRisk ? 'Animal or livestock risk indicators are present.' : 'No livestock or animal signal was detected.',
          plantRisk ? 'Plant or crop risk indicators are present.' : 'No crop or plant signal was detected.',
          environmentRisk ? 'Environmental risk indicators are present.' : 'No explicit environmental hazard signal was detected.',
        ],
        nextSteps: [
          'Map the exposure chain across people, animals, crops, and environment.',
          'Check whether the issue clusters in location, time, or shared vectors/infrastructure.',
        ],
        cautions: [
          'This should be framed as a risk-assessment prompt, not a confirmed diagnosis.',
          'Any actionable treatment or intervention should be handled by trained professionals and local authorities.',
        ],
      },
      {
        title: 'The working hypothesis should stay conservative until actual evidence is collected',
        rationale: 'Cross-species health problems can share patterns without sharing the same root cause, so a safe analysis avoids premature certainty.',
        confidence: 0.56,
        evidence: [
          'The request is broad and lacks confirmed clinical or field observations.',
          'Domain overlap alone should not be treated as evidence that one disease is responsible for all observed effects.',
        ],
        nextSteps: [
          'Collect sample observations, timelines, and affected species.',
          'Validate with veterinarians, agronomists, environmental health staff, or public health teams where relevant.',
        ],
        cautions: [
          'Do not start treatments without a timely verification path.',
          'Escalate if there are acute outbreaks, severe illness, or mortality risk.',
        ],
      },
    ];

    const plan = await defaultCognitiveBrain.plan(question, 'research-one-health');
    const response = `This request appears to be a One Health or cross-domain health problem. The safest interpretation is a risk-oriented, evidence-first assessment that links human, animal, plant, and environmental information without pretending to diagnose a confirmed condition.\n\n${hypotheses.map((h, index) => `${index + 1}. ${h.title}: ${h.rationale}`).join('\n')}\n\nRecommended next steps: record affected species, timing, exposures, and local patterns before making any intervention or treatment claim.`;

    return {
      domain: domains,
      title: 'One Health research and risk triage',
      summary: `Cross-domain health and environment question detected in ${detection.languageId}.`,
      response,
      language: detection.languageId,
      sourceLanguage: semantic.sourceLanguage,
      confidence: 0.74,
      safetyWarnings: [
        'This is not a confirmed diagnosis or field verification.',
        'Interventions should follow relevant health, veterinary, agricultural, or environmental guidance.',
      ],
      hypotheses,
      evidence: semantic.entities.map((entity) => `${entity.type}: ${entity.value}`),
      provenance: plan.knowledge.map((record) => record.sourceType),
    };
  }
}

export async function routeResearchRequest(question: string): Promise<ResearchResponse | null> {
  const normalized = (question || '').trim();
  if (!normalized) return null;

  const domains = classifyResearchDomains(normalized);
  if (domains.includes('general')) {
    const explicitResearch = /(diagnosis|symptom|infectious|treatment|medical|veterinary|zoonotic|crop|plant health|environmental|water quality|one health)/i.test(normalized);
    if (!explicitResearch) return null;
  }

  const plan = await defaultCognitiveBrain.plan(normalized, 'research-runtime');
  if (plan.capability !== 'research' && !domains.some((domain) => domain !== 'general')) {
    return null;
  }

  if (domains.includes('one_health') || /(zoonotic|one health|livestock|crop|soil|environment|veterinary|farm)/i.test(normalized)) {
    return new OneHealthOrchestrator().analyze(normalized);
  }

  if (domains.includes('medical') || /(symptom|diagnosis|disease|patient|medicine|treatment|clinic|doctor|health)/i.test(normalized)) {
    return new MedicalProblemSolver().solve(normalized);
  }

  return null;
}

export function buildMedicalResearchPrompt(question: string): string {
  const text = toSentenceCase((question || '').trim());
  return `You are helping with a careful medical and public-health reasoning prompt. ${text} Provide a cautious, evidence-first summary that distinguishes known patterns from unverified conclusions. Do not present any answer as a diagnosis or medical treatment without patient-specific evaluation.`;
}

export function buildOneHealthResearchPrompt(question: string): string {
  const text = toSentenceCase((question || '').trim());
  return `You are helping with a One Health risk assessment. ${text} Combine human, animal, plant, and environmental factors, keep the reasoning conservative, and describe any uncertainty or need for local expert verification.`;
}

export default {
  classifyResearchDomains,
  MedicalProblemSolver,
  OneHealthOrchestrator,
  routeResearchRequest,
  buildMedicalResearchPrompt,
  buildOneHealthResearchPrompt,
};
