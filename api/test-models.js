// Temporary test endpoint - list available Groq models
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_KEY || process.env.VITE_GROQ_KEY;
  
  if (!GROQ_KEY) {
    return res.status(500).json({ error: 'No GROQ key found' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${GROQ_KEY}` }
    });
    const data = await response.json();
    
    if (data.data) {
      const models = data.data.map(m => m.id).sort();
      return res.status(200).json({ models, count: models.length });
    }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
