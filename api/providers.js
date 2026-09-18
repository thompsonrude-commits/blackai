// Provider status endpoint
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_KEY;
  
  const providers = [
    {
      providerId: 'groq',
      displayName: 'Groq',
      status: GROQ_KEY ? 'healthy' : 'missing-secret',
      ready: !!GROQ_KEY,
      secretConfigured: !!GROQ_KEY,
      capability: 'CHAT'
    },
  ];
  
  return res.status(200).json({
    status: 'success',
    data: providers
  });
};
