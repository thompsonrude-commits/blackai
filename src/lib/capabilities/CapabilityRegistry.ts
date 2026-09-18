/**
 * CAPABILITY REGISTRY
 * Central registry for all BLACK AI capabilities
 * Maps user intent to executable domain engines and tools
 */

export type CapabilityDomain =
  | 'ai_ml'
  | 'software_dev'
  | 'mobile_dev'
  | 'web_cloud'
  | 'database'
  | 'devops'
  | 'cybersecurity'
  | 'blockchain'
  | 'finance'
  | 'medicine'
  | 'engineering'
  | 'science'
  | 'law'
  | 'agriculture'
  | 'history_culture'
  | 'religion'
  | 'education'
  | 'psychology'
  | 'sports'
  | 'creative_arts'
  | 'general';

export type CapabilityTaskType =
  | 'explanation'
  | 'calculation'
  | 'code_generation'
  | 'code_analysis'
  | 'research'
  | 'teaching'
  | 'generation'
  | 'analysis'
  | 'planning'
  | 'diagnosis'
  | 'simulation'
  | 'optimization'
  | 'design'
  | 'documentation'
  | 'testing'
  | 'debugging'
  | 'consultation';

export type SupportLevel = 'none' | 'basic' | 'intermediate' | 'professional' | 'expert';

export interface CapabilityMetadata {
  id: string;
  name: string;
  domain: CapabilityDomain;
  description: string;
  supportedTasks: CapabilityTaskType[];
  requiredTools?: string[];
  inputTypes: string[];
  outputTypes: string[];
  beginnerSupport: SupportLevel;
  professionalSupport: SupportLevel;
  researchSupport: boolean;
  calculationSupport: boolean;
  generationSupport: boolean;
  verificationRequired: boolean;
  safetyRequirements?: string[];
  available: boolean;
  providerRequirements?: string[];
  keywords: string[];
  examples: string[];
}

export interface CapabilityEngine {
  metadata: CapabilityMetadata;
  initialize(): Promise<void>;
  execute(task: CapabilityTask): Promise<CapabilityResult>;
  healthCheck(): Promise<{ healthy: boolean; details?: string }>;
}

export interface CapabilityTask {
  id: string;
  domain: CapabilityDomain;
  taskType: CapabilityTaskType;
  userLevel: 'beginner' | 'intermediate' | 'professional' | 'expert';
  input: {
    text: string;
    files?: any[];
    context?: Record<string, unknown>;
  };
  requirements?: {
    verification?: boolean;
    citations?: boolean;
    stepByStep?: boolean;
  };
}

export interface CapabilityResult {
  taskId: string;
  success: boolean;
  output: {
    text?: string;
    artifacts?: any[];
    calculations?: any[];
    code?: string[];
    citations?: string[];
  };
  metadata: {
    domain: CapabilityDomain;
    taskType: CapabilityTaskType;
    verified?: boolean;
    confidence?: number;
    sources?: string[];
    warnings?: string[];
  };
}

/**
 * Central Capability Registry
 */
class CapabilityRegistryClass {
  private capabilities = new Map<string, CapabilityMetadata>();
  private engines = new Map<string, CapabilityEngine>();

  /**
   * Register a capability
   */
  register(metadata: CapabilityMetadata): void {
    this.capabilities.set(metadata.id, metadata);
  }

  /**
   * Register an engine
   */
  registerEngine(engine: CapabilityEngine): void {
    this.engines.set(engine.metadata.id, engine);
    this.register(engine.metadata);
  }

  /**
   * Get capability by ID
   */
  getCapability(id: string): CapabilityMetadata | undefined {
    return this.capabilities.get(id);
  }

  /**
   * Get engine by ID
   */
  getEngine(id: string): CapabilityEngine | undefined {
    return this.engines.get(id);
  }

  /**
   * Find capabilities by domain
   */
  findByDomain(domain: CapabilityDomain): CapabilityMetadata[] {
    return Array.from(this.capabilities.values()).filter(c => c.domain === domain);
  }

  /**
   * Find capabilities by keywords
   */
  findByKeywords(keywords: string[]): CapabilityMetadata[] {
    const lowerKeywords = keywords.map(k => k.toLowerCase());
    return Array.from(this.capabilities.values()).filter(cap => {
      return cap.keywords.some(k => lowerKeywords.includes(k.toLowerCase()));
    });
  }

  /**
   * Detect capability from user request
   */
  detectCapability(userRequest: string): CapabilityMetadata[] {
    const normalized = userRequest.toLowerCase();
    const matches: Array<{ cap: CapabilityMetadata; score: number }> = [];

    for (const capability of this.capabilities.values()) {
      let score = 0;

      // Check keywords
      for (const keyword of capability.keywords) {
        if (normalized.includes(keyword.toLowerCase())) {
          score += 10;
        }
      }

      // Check domain-specific patterns
      if (normalized.includes(capability.domain.replace(/_/g, ' '))) {
        score += 5;
      }

      // Check task types
      for (const taskType of capability.supportedTasks) {
        if (normalized.includes(taskType.replace(/_/g, ' '))) {
          score += 8;
        }
      }

      if (score > 0) {
        matches.push({ cap: capability, score });
      }
    }

    // Sort by score and return top matches
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(m => m.cap);
  }

  /**
   * Get all available capabilities
   */
  getAllCapabilities(): CapabilityMetadata[] {
    return Array.from(this.capabilities.values()).filter(c => c.available);
  }

  /**
   * Get capability summary for UI
   */
  getCapabilitySummary(): Record<CapabilityDomain, string[]> {
    const summary: Partial<Record<CapabilityDomain, string[]>> = {};
    
    for (const capability of this.capabilities.values()) {
      if (!capability.available) continue;
      
      if (!summary[capability.domain]) {
        summary[capability.domain] = [];
      }
      summary[capability.domain]!.push(capability.name);
    }

    return summary as Record<CapabilityDomain, string[]>;
  }
}

// Singleton instance
export const CapabilityRegistry = new CapabilityRegistryClass();
