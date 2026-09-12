/**
 * Direct Groq API client - bypasses Firebase Functions
 * Calls Groq API directly from frontend
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqChatOptions {
  messages: GroqMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface GroqChatResult {
  text: string;
  provider: string;
  model: string;
  latencyMs: number;
  cached: boolean;
  tokensUsed?: number;
  error?: string;
}

/**
 * Call Groq API directly from frontend
 */
export async function groqChatDirect(options: GroqChatOptions): Promise<GroqChatResult> {
  const startTime = Date.now();

  if (!GROQ_API_KEY) {
    console.error('[GroqDirect] No API key found. Set VITE_GROQ_KEY in environment variables.');
    return {
      text: 'API key not configured. Please add VITE_GROQ_KEY to your environment variables.',
      provider: 'groq-direct',
      model: 'none',
      latencyMs: 0,
      cached: false,
      error: 'Missing GROQ_API_KEY'
    };
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || 'llama-3.3-70b-versatile',
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GroqDirect] API error:', response.status, errorText);
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('Invalid response format from Groq API');
    }

    return {
      text: data.choices[0].message.content,
      provider: 'groq-direct',
      model: data.model || options.model || 'llama-3.3-70b-versatile',
      latencyMs,
      cached: false,
      tokensUsed: data.usage?.total_tokens,
    };

  } catch (err: any) {
    console.error('[GroqDirect] Chat failed:', err);
    return {
      text: `Failed to connect to AI: ${err.message}`,
      provider: 'groq-direct',
      model: 'error',
      latencyMs: Date.now() - startTime,
      cached: false,
      error: err.message,
    };
  }
}

/**
 * Streaming version - calls Groq API with streaming enabled
 */
export async function* groqChatStreamDirect(options: GroqChatOptions): AsyncGenerator<string> {
  if (!GROQ_API_KEY) {
    yield 'API key not configured. Please add VITE_GROQ_KEY to your environment variables.';
    return;
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || 'llama-3.3-70b-versatile',
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GroqDirect] Stream error:', response.status, errorText);
      yield `Failed to connect to AI: ${response.status}`;
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield 'Failed to read response stream';
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || line.trim() === 'data: [DONE]') continue;
        if (!line.startsWith('data: ')) continue;

        try {
          const jsonStr = line.slice(6); // Remove 'data: ' prefix
          const data = JSON.parse(jsonStr);
          const content = data.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch (err) {
          console.warn('[GroqDirect] Failed to parse SSE line:', line);
        }
      }
    }

  } catch (err: any) {
    console.error('[GroqDirect] Stream failed:', err);
    yield `\n\nError: ${err.message}`;
  }
}
