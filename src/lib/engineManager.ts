/**
 * Engine Manager - Unified initialization and management of all BLACK AI engines
 * Integrates: NLIE, Knowledge, Agent System into the main chat flow
 */

import { DefaultKnowledgeEngine } from '../../core/knowledge/KnowledgeEngine';
import { AgentRegistry } from '../../core/agent/registry';
import { AgentPlanner } from '../../core/agent/planner';
import { WorkflowManager } from '../../core/agent/WorkflowManager';

// Note: We're not directly importing NlieEngine to avoid Node.js EventEmitter dependency
// Instead, we'll create a lightweight browser-compatible version

/**
 * Browser-compatible Nigerian Language Intelligence Engine
 */
class BrowserNlieEngine {
  async detectLanguage(text: string): Promise<{
    language: string;
    confidence: number;
    isCodeSwitched: boolean;
  }> {
    const lower = text.toLowerCase();
    
    // Comprehensive Nigerian language patterns
    const patterns = {
      pcm: /\b(abeg|wetin|dey|don|go|no|wahala|ehen|na|am|fit|chop|waka|abi)\b/i,
      yo: /\b(ẹ|ọ|ṣ|ẹwa|owó|ilé|baba|mama|ọmọ|bawo|daadaa)\b/i,
      ig: /\b(ị|ụ|ọ|nnọọ|kedu|daalụ|biko|ọ\s+dị\s+mma)\b/i,
      ha: /\b(sannu|yaya|ina|gobe|don|allah|barawo|wahala)\b/i,
      edo: /\b(kọyọ|vbèè|ọbowi|lahọ|ọbahvan|obiluu)\b/i,
    };
    
    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(lower)) {
        const matches = (lower.match(pattern) || []).length;
        const confidence = Math.min(0.95, 0.7 + (matches * 0.05));
        return {
          language: lang,
          confidence,
          isCodeSwitched: /\b(the|is|are|was|were|and|but|for)\b/i.test(text),
        };
      }
    }
    
    // Fallback to English
    return {
      language: 'en',
      confidence: 0.6,
      isCodeSwitched: false,
    };
  }
  
  async translate(text: string, target: string): Promise<{
    translated: string;
    confidence: number;
  }> {
    // Placeholder - actual translation would use the AI model
    return {
      translated: text,
      confidence: 0.6,
    };
  }
}

/**
 * Singleton engine instances
 */
class EngineManager {
  // Nigerian Language Intelligence Engine (browser-compatible)
  private _nlieEngine: BrowserNlieEngine | null = null;
  
  // Knowledge Engine for document retrieval
  private _knowledgeEngine: DefaultKnowledgeEngine | null = null;
  
  // Agent System components
  private _agentRegistry: AgentRegistry | null = null;
  private _agentPlanner: AgentPlanner | null = null;
  private _workflowManager: WorkflowManager | null = null;
  
  // Initialization flags
  private _initialized = false;

  /**
   * Initialize all engines
   */
  async initialize() {
    if (this._initialized) {
      console.log('[EngineManager] Already initialized');
      return;
    }

    console.log('[EngineManager] Initializing all engines...');

    try {
      // Initialize browser-compatible NLIE Engine
      this._nlieEngine = new BrowserNlieEngine();
      console.log('[EngineManager] ✓ NlieEngine initialized');

      // Initialize Knowledge Engine
      this._knowledgeEngine = new DefaultKnowledgeEngine();
      console.log('[EngineManager] ✓ KnowledgeEngine initialized');

      // Initialize Agent System
      this._agentRegistry = new AgentRegistry();
      this._agentPlanner = new AgentPlanner(this._agentRegistry);
      this._workflowManager = new WorkflowManager();
      console.log('[EngineManager] ✓ Agent System initialized');

      // Register default agents
      this._registerDefaultAgents();

      this._initialized = true;
      console.log('[EngineManager] ✅ All engines initialized successfully');
    } catch (error) {
      console.error('[EngineManager] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register default agent capabilities
   */
  private _registerDefaultAgents() {
    if (!this._agentRegistry) return;

    const defaultAgents = [
      {
        agentId: 'blackai.vision',
        name: 'Vision Agent',
        description: 'Analyzes images and visual content',
        capabilities: ['vision', 'image.analyze'],
        priority: 50,
      },
      {
        agentId: 'blackai.ocr',
        name: 'OCR Agent',
        description: 'Extracts text from images and documents',
        capabilities: ['ocr', 'text.extract'],
        priority: 40,
      },
      {
        agentId: 'blackai.speech',
        name: 'Speech Agent',
        description: 'Processes audio and speech',
        capabilities: ['speech', 'audio.transcribe', 'audio.tts'],
        priority: 40,
      },
      {
        agentId: 'blackai.image.generate',
        name: 'Image Generation Agent',
        description: 'Generates images from text prompts',
        capabilities: ['image.generate', 'image.create'],
        priority: 45,
      },
      {
        agentId: 'blackai.video',
        name: 'Video Agent',
        description: 'Generates and processes video content',
        capabilities: ['video.generate', 'video.analyze'],
        priority: 35,
      },
      {
        agentId: 'blackai.language',
        name: 'Language Agent',
        description: 'Processes natural language and translations',
        capabilities: ['language', 'translation', 'nlie'],
        priority: 60,
      },
      {
        agentId: 'blackai.memory',
        name: 'Memory Agent',
        description: 'Manages conversation memory and context',
        capabilities: ['memory', 'context.retrieve'],
        priority: 55,
      },
      {
        agentId: 'blackai.knowledge',
        name: 'Knowledge Agent',
        description: 'Retrieves and indexes knowledge documents',
        capabilities: ['knowledge', 'document.search', 'document.index'],
        priority: 50,
      },
    ];

    defaultAgents.forEach(agent => {
      this._agentRegistry!.register(agent);
    });

    console.log(`[EngineManager] Registered ${defaultAgents.length} default agents`);
  }

  /**
   * Get NLIE Engine instance
   */
  get nlieEngine(): BrowserNlieEngine {
    if (!this._nlieEngine) {
      throw new Error('[EngineManager] NLIE Engine not initialized. Call initialize() first.');
    }
    return this._nlieEngine;
  }

  /**
   * Get Knowledge Engine instance
   */
  get knowledgeEngine(): DefaultKnowledgeEngine {
    if (!this._knowledgeEngine) {
      throw new Error('[EngineManager] Knowledge Engine not initialized. Call initialize() first.');
    }
    return this._knowledgeEngine;
  }

  /**
   * Get Agent Registry instance
   */
  get agentRegistry(): AgentRegistry {
    if (!this._agentRegistry) {
      throw new Error('[EngineManager] Agent Registry not initialized. Call initialize() first.');
    }
    return this._agentRegistry;
  }

  /**
   * Get Agent Planner instance
   */
  get agentPlanner(): AgentPlanner {
    if (!this._agentPlanner) {
      throw new Error('[EngineManager] Agent Planner not initialized. Call initialize() first.');
    }
    return this._agentPlanner;
  }

  /**
   * Get Workflow Manager instance
   */
  get workflowManager(): WorkflowManager {
    if (!this._workflowManager) {
      throw new Error('[EngineManager] Workflow Manager not initialized. Call initialize() first.');
    }
    return this._workflowManager;
  }

  /**
   * Check if engines are initialized
   */
  get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Detect language using NLIE Engine
   */
  async detectLanguage(text: string) {
    try {
      const result = await this.nlieEngine.detectLanguage(text);
      console.log('[EngineManager] Language detection:', result);
      return result;
    } catch (error) {
      console.error('[EngineManager] Language detection failed:', error);
      return { language: 'en', confidence: 0.5, isCodeSwitched: false };
    }
  }

  /**
   * Query knowledge base
   */
  async queryKnowledge(query: string, options?: { maxResults?: number; language?: string }) {
    try {
      const results = await this.knowledgeEngine.query({
        query,
        language: options?.language,
        maxResults: options?.maxResults ?? 3,
      });
      console.log(`[EngineManager] Knowledge query returned ${results.length} results`);
      return results;
    } catch (error) {
      console.error('[EngineManager] Knowledge query failed:', error);
      return [];
    }
  }

  /**
   * Index a document into knowledge base
   */
  async indexDocument(document: {
    id: string;
    title: string;
    source: string;
    content: string;
    tags?: string[];
  }) {
    try {
      await this.knowledgeEngine.index(document);
      console.log(`[EngineManager] Indexed document: ${document.title}`);
      return true;
    } catch (error) {
      console.error('[EngineManager] Document indexing failed:', error);
      return false;
    }
  }

  /**
   * Plan a multi-step workflow using agent system
   */
  async planWorkflow(goal: string) {
    try {
      const plan = this.agentPlanner.decomposeGoal(goal);
      console.log(`[EngineManager] Created workflow with ${plan.tasks.length} tasks`);
      return plan;
    } catch (error) {
      console.error('[EngineManager] Workflow planning failed:', error);
      return null;
    }
  }

  /**
   * Find agents by capability
   */
  findAgentsByCapability(capability: string) {
    try {
      const agents = this.agentRegistry.findByCapability(capability);
      console.log(`[EngineManager] Found ${agents.length} agents for capability: ${capability}`);
      return agents;
    } catch (error) {
      console.error('[EngineManager] Agent search failed:', error);
      return [];
    }
  }

  /**
   * Clear knowledge base
   */
  async clearKnowledge() {
    try {
      await this.knowledgeEngine.clear();
      console.log('[EngineManager] Knowledge base cleared');
      return true;
    } catch (error) {
      console.error('[EngineManager] Failed to clear knowledge base:', error);
      return false;
    }
  }
}

// Export singleton instance
export const engineManager = new EngineManager();

// Export helper functions for easy access
export const detectLanguage = (text: string) => engineManager.detectLanguage(text);
export const queryKnowledge = (query: string, options?: { maxResults?: number; language?: string }) => 
  engineManager.queryKnowledge(query, options);
export const indexDocument = (doc: { id: string; title: string; source: string; content: string; tags?: string[] }) => 
  engineManager.indexDocument(doc);
export const planWorkflow = (goal: string) => engineManager.planWorkflow(goal);
export const findAgents = (capability: string) => engineManager.findAgentsByCapability(capability);

// Initialize engines on module load (async, non-blocking)
if (typeof window !== 'undefined') {
  engineManager.initialize().catch(err => {
    console.error('[EngineManager] Auto-initialization failed:', err);
  });
}
