// Vercel chat endpoint with direct Groq integration
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id, X-User-Id');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, temperature = 0.7, maxTokens = 2048 } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    // Direct Groq API call
    const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_KEY || process.env.VITE_GROQ_KEY;
    
    console.log('Environment check:', {
      hasGROQ_API_KEY: !!process.env.GROQ_API_KEY,
      hasGROQ_KEY: !!process.env.GROQ_KEY,
      hasVITE_GROQ_KEY: !!process.env.VITE_GROQ_KEY,
      finalKey: !!GROQ_KEY
    });
    
    if (!GROQ_KEY) {
      console.error('GROQ API key not found in environment variables');
      console.error('Checked: GROQ_API_KEY, GROQ_KEY, VITE_GROQ_KEY');
      return res.status(500).json({ 
        error: 'API key not configured',
        text: 'Backend configuration error. Please contact administrator.',
        provider: 'none',
        model: 'error'
      });
    }

    console.log('Making Groq API request:', {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama3-70b-8192',
      messageCount: messages.length,
      hasApiKey: !!GROQ_KEY
    });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192', // Working Groq model
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('=== GROQ API ERROR ===');
      console.error('Status:', response.status);
      console.error('Status Text:', response.statusText);
      console.error('Headers:', JSON.stringify([...response.headers.entries()]));
      console.error('Response Body:', errorText);
      console.error('======================');
      
      // Try to parse error details
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = JSON.stringify(errorJson, null, 2);
      } catch (e) {
        // Keep as text
      }
      
      return res.status(500).json({
        error: 'AI provider error',
        text: 'Local fallback mode is active. Please try again.',
        provider: 'groq',
        model: 'error',
        details: errorDetails.substring(0, 200),
        httpStatus: response.status,
        statusText: response.statusText
      });
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content;
    
    // Handle empty or missing response
    if (!text || text.trim() === '') {
      console.warn('[Chat] Empty response from AI, using fallback');
      text = "I apologize, I couldn't process that request. Could you please rephrase or try asking something else?";
    }
    
    // Auto-detect list/table requests for Excel format suggestion  
    try {
      const userMessage = messages[messages.length - 1]?.content || '';
      const isListRequest = /\b(list|table|compare|governors|states|countries|comparison|items|all|give me)\b/i.test(userMessage);
      const hasMultipleItems = (text.match(/\n[-•*\d]|\d\./g) || []).length >= 3;
      
      if (isListRequest && hasMultipleItems) {
        text += '\n\n📊 This response contains structured data that can be exported to Excel format for better viewing.';
      }
    } catch (e) {
      // Ignore Excel detection errors
    }
    
    return res.status(200).json({
      text: text,
      content: text,
      choices: [{
        message: {
          content: text
        }
      }],
      provider: 'groq',
      model: 'llama3-70b-8192',
      latencyMs: 0,
      cached: false,
      tokensUsed: data.usage?.total_tokens
    });

  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      error: 'Internal error',
      text: 'Local fallback mode is active. Please try again.',
      provider: 'none',
      model: 'error',
      details: error.message
    });
  }
};
