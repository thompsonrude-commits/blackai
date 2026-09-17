/**
 * Knowledge Helper - Utilities for managing knowledge documents
 * Allows users to add documents to the knowledge base for context retrieval
 */

import { engineManager } from './engineManager';

/**
 * Parse user command to add knowledge
 * Examples:
 * - "remember that Python is my favorite language"
 * - "save this: React uses virtual DOM"
 * - "add to knowledge: Nigeria's capital is Abuja"
 */
export function parseKnowledgeCommand(text: string): { 
  isKnowledgeCommand: boolean; 
  content?: string;
  title?: string;
} {
  const lower = text.toLowerCase();
  
  // Commands that indicate user wants to save knowledge
  const savePatterns = [
    /^(?:remember|save|store|add to knowledge|memorize|keep in mind|note|record)\s*(?:this|that)?:?\s*(.+)/i,
    /^(?:i want you to|please)\s+(?:remember|save|store|memorize)\s*(?:this|that)?:?\s*(.+)/i,
  ];
  
  for (const pattern of savePatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        isKnowledgeCommand: true,
        content: match[1].trim(),
        title: match[1].slice(0, 50).trim(),
      };
    }
  }
  
  return { isKnowledgeCommand: false };
}

/**
 * Parse user command to forget/clear knowledge
 */
export function parseForgetCommand(text: string): { 
  isForgetCommand: boolean; 
  clearAll: boolean;
} {
  const lower = text.toLowerCase();
  
  if (/(forget|clear|delete|remove)\s+(everything|all|all knowledge|memory|all memories)/i.test(lower)) {
    return { isForgetCommand: true, clearAll: true };
  }
  
  if (/^(forget|clear|delete)\s+(that|this|it)$/i.test(lower)) {
    return { isForgetCommand: true, clearAll: false };
  }
  
  return { isForgetCommand: false, clearAll: false };
}

/**
 * Add user-provided knowledge to the engine
 */
export async function addUserKnowledge(
  content: string, 
  userId: string = 'anonymous',
  metadata?: { title?: string; tags?: string[] }
): Promise<boolean> {
  try {
    const doc = {
      id: `user-${userId}-${Date.now()}`,
      title: metadata?.title || content.slice(0, 50),
      source: `user:${userId}`,
      content: content,
      tags: metadata?.tags || ['user-added', 'personal'],
    };
    
    const success = await engineManager.indexDocument(doc);
    
    if (success) {
      console.log('[KnowledgeHelper] Added user knowledge:', doc.title);
    }
    
    return success;
  } catch (error) {
    console.error('[KnowledgeHelper] Failed to add user knowledge:', error);
    return false;
  }
}

/**
 * Clear all user knowledge
 */
export async function clearUserKnowledge(): Promise<boolean> {
  try {
    const success = await engineManager.clearKnowledge();
    
    if (success) {
      console.log('[KnowledgeHelper] Cleared all user knowledge');
    }
    
    return success;
  } catch (error) {
    console.error('[KnowledgeHelper] Failed to clear knowledge:', error);
    return false;
  }
}

/**
 * Automatically extract and index knowledge from conversation context
 * This can index important facts mentioned during chat
 */
export async function autoIndexFromConversation(
  userMessage: string,
  aiResponse: string,
  userId: string = 'anonymous'
): Promise<void> {
  // Only auto-index if response contains factual information patterns
  const hasFactualInfo = /\b(is|are|was|were|means|refers to|called|known as|equals|represents)\b/i.test(aiResponse);
  
  if (!hasFactualInfo || aiResponse.length < 50 || aiResponse.length > 500) {
    return; // Skip if too short, too long, or not factual
  }
  
  try {
    // Extract key information
    const doc = {
      id: `auto-${userId}-${Date.now()}`,
      title: userMessage.slice(0, 50),
      source: `auto:${userId}`,
      content: `Q: ${userMessage}\nA: ${aiResponse}`,
      tags: ['auto-indexed', 'conversation', 'factual'],
    };
    
    await engineManager.indexDocument(doc);
    console.log('[KnowledgeHelper] Auto-indexed conversation snippet');
  } catch (error) {
    console.error('[KnowledgeHelper] Auto-indexing failed:', error);
  }
}

/**
 * Index pre-seeded knowledge (Nigerian facts, cultural info, etc.)
 */
export async function seedInitialKnowledge(): Promise<void> {
  const seedDocs = [
    {
      id: 'seed-nigeria-capital',
      title: 'Nigeria Capital City',
      source: 'seed:geographic',
      content: 'Nigeria\'s capital city is Abuja, located in the Federal Capital Territory. It became the capital in 1991, replacing Lagos.',
      tags: ['nigeria', 'geography', 'capital', 'abuja'],
    },
    {
      id: 'seed-nigeria-languages',
      title: 'Nigerian Languages',
      source: 'seed:linguistic',
      content: 'Nigeria has over 500 indigenous languages. The major ones are Hausa, Yoruba, and Igbo. English is the official language. Nigerian Pidgin English is widely spoken across the country.',
      tags: ['nigeria', 'languages', 'hausa', 'yoruba', 'igbo', 'pidgin'],
    },
    {
      id: 'seed-nigeria-population',
      title: 'Nigeria Population',
      source: 'seed:demographic',
      content: 'Nigeria is Africa\'s most populous country with over 220 million people. It is the 6th most populous country in the world.',
      tags: ['nigeria', 'population', 'demographics', 'africa'],
    },
    {
      id: 'seed-pidgin-basics',
      title: 'Nigerian Pidgin Basics',
      source: 'seed:linguistic',
      content: 'Nigerian Pidgin grammar rules: Use "dey" for present continuous (I dey go = I am going), "don" for past/perfect (I don finish = I finished), "go" for future (I go do = I will do). Never use "me" as subject, always "I". Object pronouns: "me" (tell me), "am" (see am).',
      tags: ['pidgin', 'grammar', 'nigerian-pidgin', 'language-rules'],
    },
    {
      id: 'seed-blackai-creator',
      title: 'BLACK AI Creator',
      source: 'seed:identity',
      content: 'BLACK AI was created by Obosa Thompson Emuze, a Nigerian developer who built it to serve Africa. It was NOT created by OpenAI, Meta, Anthropic, or any other company.',
      tags: ['blackai', 'creator', 'obosa-thompson-emuze', 'identity'],
    },
  ];
  
  for (const doc of seedDocs) {
    try {
      await engineManager.indexDocument(doc);
    } catch (error) {
      console.warn('[KnowledgeHelper] Failed to seed document:', doc.id, error);
    }
  }
  
  console.log(`[KnowledgeHelper] Seeded ${seedDocs.length} initial knowledge documents`);
}

// Auto-seed knowledge when module loads
if (typeof window !== 'undefined') {
  // Wait for engine manager to initialize, then seed
  const checkAndSeed = async () => {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      if (engineManager.isInitialized) {
        await seedInitialKnowledge();
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
  };
  
  checkAndSeed().catch(err => {
    console.error('[KnowledgeHelper] Failed to seed initial knowledge:', err);
  });
}
