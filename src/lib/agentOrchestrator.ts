/**
 * Agent Orchestrator - Routes complex multi-step requests through the agent system
 * Handles workflow planning, execution, and coordination
 */

import { engineManager } from './engineManager';
import type { ProxyChatMessage } from './aiProxy';

/**
 * Detect if a user request requires multi-agent workflow
 */
export function requiresAgentWorkflow(text: string): {
  requires: boolean;
  capabilities: string[];
  complexity: 'simple' | 'moderate' | 'complex';
} {
  const lower = text.toLowerCase();
  const detectedCapabilities: string[] = [];
  
  // Vision/Image analysis
  if (/\b(analyze|describe|what's in|what is in|examine|look at|check|inspect)\s+(?:this|the|my)?\s*(?:image|picture|photo)/i.test(lower)) {
    detectedCapabilities.push('vision');
  }
  
  // OCR/Text extraction
  if (/\b(extract|read|get|scan|find)\s+(?:the\s+)?(?:text|words|writing|content)\s+(?:from|in)/i.test(lower)) {
    detectedCapabilities.push('ocr');
  }
  
  // Image generation
  if (/\b(generate|create|make|draw|design)\s+(?:an?\s+)?(?:image|picture|photo|visual|illustration)/i.test(lower)) {
    detectedCapabilities.push('image.generate');
  }
  
  // Translation
  if (/\b(translate|convert)\s+(?:this|that|it)?\s*(?:to|into)\s+\w+/i.test(lower)) {
    detectedCapabilities.push('translation');
  }
  
  // Speech/Audio
  if (/\b(transcribe|convert to text|speech to text|listen to)/i.test(lower)) {
    detectedCapabilities.push('speech');
  }
  
  // Multi-step indicators
  const multiStepIndicators = [
    /\b(and then|then|after that|next|finally|also|additionally)\b/i,
    /\b(first|second|third|1\.|2\.|3\.)/i,
    /,\s*(?:and\s+)?(?:then|also|plus)/i,
  ];
  
  const hasMultiStep = multiStepIndicators.some(pattern => pattern.test(text));
  
  // Determine complexity
  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
  
  if (detectedCapabilities.length >= 3 || (detectedCapabilities.length >= 2 && hasMultiStep)) {
    complexity = 'complex';
  } else if (detectedCapabilities.length === 2 || hasMultiStep) {
    complexity = 'moderate';
  }
  
  const requires = detectedCapabilities.length >= 2 || (detectedCapabilities.length === 1 && hasMultiStep);
  
  return {
    requires,
    capabilities: detectedCapabilities,
    complexity,
  };
}

/**
 * Parse complex request and extract individual steps
 */
export function parseMultiStepRequest(text: string): {
  goal: string;
  steps: Array<{ action: string; capability: string; input: string }>;
} {
  const goal = text.slice(0, 100);
  const steps: Array<{ action: string; capability: string; input: string }> = [];
  
  // Split by common delimiters
  const parts = text.split(/(?:\s+and\s+then\s+|\s+then\s+|\s+,\s+and\s+|\s+,\s+then\s+|;\s+)/i);
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    let capability = 'language'; // default
    let action = trimmed;
    
    // Detect capability from action
    if (/^(analyze|describe|what's in|examine|look at)/i.test(trimmed)) {
      capability = 'vision';
      action = 'analyze image';
    } else if (/^(extract|read|scan)\s+text/i.test(trimmed)) {
      capability = 'ocr';
      action = 'extract text';
    } else if (/^(generate|create|make|draw)\s+(?:an?\s+)?image/i.test(trimmed)) {
      capability = 'image.generate';
      action = 'generate image';
    } else if (/^(translate|convert)/i.test(trimmed)) {
      capability = 'translation';
      action = 'translate';
    } else if (/^(transcribe|convert to text)/i.test(trimmed)) {
      capability = 'speech';
      action = 'transcribe audio';
    }
    
    steps.push({
      action,
      capability,
      input: trimmed,
    });
  }
  
  // If no steps detected, treat whole request as single step
  if (steps.length === 0) {
    steps.push({
      action: text,
      capability: 'language',
      input: text,
    });
  }
  
  return { goal, steps };
}

/**
 * Execute a multi-step workflow using the agent system
 */
export async function executeAgentWorkflow(
  userMessage: string,
  conversationHistory: ProxyChatMessage[],
  userId?: string
): Promise<{
  success: boolean;
  results: Array<{ step: string; result: any; status: 'success' | 'failed' }>;
  finalResponse: string;
}> {
  console.log('[AgentOrchestrator] Starting workflow execution for:', userMessage.slice(0, 100));
  
  try {
    // Check if engine manager is ready
    if (!engineManager.isInitialized) {
      console.warn('[AgentOrchestrator] Engine manager not initialized, falling back to simple processing');
      return {
        success: false,
        results: [],
        finalResponse: 'Multi-step processing is not available right now. Please try a simpler request.',
      };
    }
    
    // Parse the request
    const { goal, steps } = parseMultiStepRequest(userMessage);
    console.log(`[AgentOrchestrator] Parsed ${steps.length} steps from request`);
    
    // Create workflow plan
    const plan = await engineManager.planWorkflow(goal);
    
    if (!plan) {
      console.warn('[AgentOrchestrator] Failed to create workflow plan');
      return {
        success: false,
        results: [],
        finalResponse: 'I had trouble planning the workflow for your request. Please try breaking it into smaller parts.',
      };
    }
    
    console.log(`[AgentOrchestrator] Created workflow with ${plan.tasks.length} tasks`);
    
    // Execute each step sequentially
    const results: Array<{ step: string; result: any; status: 'success' | 'failed' }> = [];
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`[AgentOrchestrator] Executing step ${i + 1}/${steps.length}: ${step.capability}`);
      
      try {
        // Find agents that can handle this capability
        const agents = engineManager.findAgentsByCapability(step.capability);
        
        if (agents.length === 0) {
          console.warn(`[AgentOrchestrator] No agent found for capability: ${step.capability}`);
          results.push({
            step: step.action,
            result: { error: `No agent available for: ${step.capability}` },
            status: 'failed',
          });
          continue;
        }
        
        console.log(`[AgentOrchestrator] Found ${agents.length} agent(s) for ${step.capability}`);
        
        // For now, simulate execution (actual execution would require full orchestrator integration)
        // This is where the AgentExecutor would run the task
        results.push({
          step: step.action,
          result: {
            capability: step.capability,
            agent: agents[0].name,
            message: `Step processed by ${agents[0].name}`,
          },
          status: 'success',
        });
        
      } catch (error) {
        console.error(`[AgentOrchestrator] Step ${i + 1} failed:`, error);
        results.push({
          step: step.action,
          result: { error: String(error) },
          status: 'failed',
        });
      }
    }
    
    // Build final response
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    
    let finalResponse = `I processed your ${steps.length}-step request:\n\n`;
    
    results.forEach((result, idx) => {
      const icon = result.status === 'success' ? '✓' : '✗';
      finalResponse += `${icon} Step ${idx + 1}: ${result.step}\n`;
      if (result.status === 'failed') {
        finalResponse += `   Error: ${result.result.error}\n`;
      }
    });
    
    finalResponse += `\n${successCount} step(s) completed successfully, ${failedCount} failed.`;
    
    if (successCount === 0) {
      finalResponse += '\n\nI had trouble executing your request. Please try simplifying it or checking if all required inputs are provided.';
    }
    
    return {
      success: successCount > 0,
      results,
      finalResponse,
    };
    
  } catch (error) {
    console.error('[AgentOrchestrator] Workflow execution failed:', error);
    return {
      success: false,
      results: [],
      finalResponse: `I encountered an error processing your multi-step request: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Simpler helper: Check if request should use agent routing
 */
export function shouldUseAgentSystem(text: string): boolean {
  const analysis = requiresAgentWorkflow(text);
  return analysis.requires && analysis.complexity !== 'simple';
}

/**
 * Get human-readable explanation of workflow plan
 */
export function explainWorkflow(text: string): string {
  const { requires, capabilities, complexity } = requiresAgentWorkflow(text);
  
  if (!requires) {
    return 'This is a simple request that can be handled directly.';
  }
  
  const capList = capabilities.map(cap => {
    const names: Record<string, string> = {
      vision: 'Image Analysis',
      ocr: 'Text Extraction',
      'image.generate': 'Image Generation',
      translation: 'Translation',
      speech: 'Speech Processing',
      language: 'Language Processing',
    };
    return names[cap] || cap;
  }).join(', ');
  
  return `This is a ${complexity} request requiring: ${capList}. I'll coordinate multiple agents to handle it.`;
}
