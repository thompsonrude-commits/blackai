/**
 * Professional Training System
 * Opt-in access to specialized training engines for medical, engineering, etc.
 * Only activates on explicit user commands - never interrupts normal chat
 */

import { engineManager } from './engineManager';
import { executeAgentWorkflow } from './agentOrchestrator';

export interface TrainingSession {
  type: 'medical' | 'engineering' | 'law' | 'agriculture' | 'technology';
  isActive: boolean;
  sessionId: string;
  startedAt: number;
}

const TRAINING_TRIGGERS = {
  medical: /\b(train me (?:to become|as) (?:a )?(?:medical )?doctor|teach me medicine|medical training|medical course|learn medicine professionally)\b/i,
  engineering: /\b(train me (?:to become|as) (?:an )?engineer|teach me engineering|engineering training|engineering course)\b/i,
  law: /\b(train me (?:to become|as) (?:a )?lawyer|teach me law|law training|law course)\b/i,
  agriculture: /\b(train me (?:in )?agriculture|teach me farming|agriculture training|farming course)\b/i,
  technology: /\b(train me (?:in )?(?:programming|coding|software)|teach me (?:to code|programming)|software training)\b/i,
};

/**
 * Check if user wants to start professional training
 */
export function detectTrainingRequest(message: string): {
  shouldStartTraining: boolean;
  trainingType?: 'medical' | 'engineering' | 'law' | 'agriculture' | 'technology';
  confidence: number;
} {
  const lower = message.toLowerCase();

  // Check each training type
  for (const [type, pattern] of Object.entries(TRAINING_TRIGGERS)) {
    if (pattern.test(lower)) {
      return {
        shouldStartTraining: true,
        trainingType: type as any,
        confidence: 0.9,
      };
    }
  }

  // Not a training request
  return {
    shouldStartTraining: false,
    confidence: 0,
  };
}

/**
 * Generate training introduction for a specific field
 */
export function getTrainingIntroduction(trainingType: string): string {
  const intros: Record<string, string> = {
    medical: `🏥 **Medical Training Mode Activated**

Welcome to professional medical training! I'll guide you through:

**📚 Core Medical Topics:**
• Anatomy & Physiology
• Pathophysiology & Disease Processes
• Pharmacology & Drug Mechanisms
• Clinical Diagnosis & Differential Diagnosis
• Emergency Medicine & Critical Care
• Surgery Fundamentals
• Pediatrics, Internal Medicine, OB/GYN

**🎯 Learning Approach:**
• Structured curriculum from basics to advanced
• Case-based learning with real scenarios
• Clinical reasoning and decision-making
• Evidence-based medicine
• Nigerian medical context & local diseases

**💬 How to Use:**
• Ask about any medical topic: "explain diabetes pathophysiology"
• Request case studies: "give me a malaria case study"
• Quiz yourself: "quiz me on respiratory system"
• Say "exit training" to return to normal chat

Let's begin! What area of medicine would you like to start with?`,

    engineering: `🔧 **Engineering Training Mode Activated**

Welcome to professional engineering training! I'll guide you through:

**📚 Core Engineering Topics:**
• Mathematics & Physics Fundamentals
• Mechanics & Dynamics
• Thermodynamics & Heat Transfer
• Electrical Circuits & Electronics
• Materials Science & Properties
• Structural Analysis & Design
• Programming & Automation

**🎯 Learning Approach:**
• Problem-solving methodology
• Real-world engineering applications
• Design principles and best practices
• Nigerian infrastructure context
• Hands-on project guidance

**💬 How to Use:**
• Ask about concepts: "explain stress and strain"
• Work on problems: "help me design a simple bridge"
• Get project guidance: "I want to build a solar system"
• Say "exit training" to return to normal chat

What engineering discipline interests you? (Civil, Mechanical, Electrical, Software, Chemical)`,

    law: `⚖️ **Law Training Mode Activated**

Welcome to professional legal training! I'll guide you through:

**📚 Core Legal Topics:**
• Nigerian Constitution & Legal System
• Contract Law & Agreements
• Criminal Law & Procedure
• Tort Law & Civil Liability
• Property Law & Land Use
• Company & Business Law
• Legal Research & Writing

**🎯 Learning Approach:**
• Case law analysis (Nigerian & Common Law)
• Legal reasoning and argumentation
• Statutory interpretation
• Legal drafting practice
• Court procedures

**💬 How to Use:**
• Ask about legal concepts: "explain tort of negligence"
• Analyze cases: "give me a contract law case"
• Practice drafting: "help me draft a simple contract"
• Say "exit training" to return to normal chat

Which area of law would you like to explore first?`,

    agriculture: `🌾 **Agriculture Training Mode Activated**

Welcome to professional agricultural training! I'll guide you through:

**📚 Core Agricultural Topics:**
• Crop Science & Agronomy
• Soil Science & Fertility Management
• Pest & Disease Management
• Irrigation & Water Management
• Livestock & Animal Husbandry
• Agricultural Economics & Business
• Sustainable Farming Practices

**🎯 Learning Approach:**
• Nigerian climate & crop context
• Traditional & modern techniques
• Farm management & profitability
• Practical problem-solving
• Value chain & agribusiness

**💬 How to Use:**
• Ask about crops: "how do I grow cassava commercially?"
• Solve problems: "my maize crops have yellow leaves"
• Business planning: "help me plan a poultry farm"
• Say "exit training" to return to normal chat

What area of agriculture interests you most?`,

    technology: `💻 **Technology Training Mode Activated**

Welcome to professional software development training! I'll guide you through:

**📚 Core Technology Topics:**
• Programming Languages (Python, JavaScript, etc.)
• Web Development (HTML, CSS, React, Node.js)
• Mobile App Development (React Native, Flutter)
• Databases & Backend Systems
• Algorithms & Data Structures
• Software Architecture & Design Patterns
• DevOps & Deployment

**🎯 Learning Approach:**
• Learn by building real projects
• Best practices & clean code
• Problem-solving & debugging
• Industry-standard tools & workflows
• Portfolio building

**💬 How to Use:**
• Learn a language: "teach me Python basics"
• Build projects: "help me build a website"
• Debug code: "why isn't my code working?"
• Say "exit training" to return to normal chat

What programming language or technology would you like to learn?`,
  };

  return intros[trainingType] || 'Training mode activated. What would you like to learn?';
}

/**
 * Check if message is requesting to exit training
 */
export function isExitTraining(message: string): boolean {
  const exitPatterns = [
    /\b(?:exit|leave|stop|quit|end) (?:training|course|lesson)\b/i,
    /\b(?:go back|return) to (?:normal|regular) (?:chat|mode)\b/i,
    /\b(?:cancel|disable) training\b/i,
  ];

  return exitPatterns.some(pattern => pattern.test(message));
}

/**
 * Format training response with visual indicators
 */
export function formatTrainingResponse(response: string, trainingType: string): string {
  const icons: Record<string, string> = {
    medical: '🏥',
    engineering: '🔧',
    law: '⚖️',
    agriculture: '🌾',
    technology: '💻',
  };

  const icon = icons[trainingType] || '📚';
  
  return `${icon} **Training Mode**\n\n${response}\n\n---\n_Say "exit training" to return to normal chat_`;
}
