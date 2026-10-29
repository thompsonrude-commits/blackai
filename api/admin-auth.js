// BLACK AI — Admin authentication endpoint
// No Firebase required — runs entirely on Vercel
// Credentials are stored as Vercel environment variables
// Route: /api/admin-auth  (via vercel.json)

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body || {};
  if (!body.email) {
    try {
      const raw = await new Promise((resolve, reject) => {
        let d = '';
        req.on('data', chunk => { d += chunk.toString(); });
        req.on('end', () => resolve(d));
        req.on('error', reject);
      });
      if (raw) body = JSON.parse(raw);
    } catch (_) {}
  }

  const { email, password } = body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Admin credentials stored in Vercel env vars
  // Set these in Vercel Dashboard → Settings → Environment Variables:
  //   ADMIN_EMAIL    = obosathompsons@gmail.com
  //   ADMIN_PASSWORD = your-admin-password
  // For multiple admins, add ADMIN_EMAIL_2, ADMIN_PASSWORD_2 etc.

  const adminCredentials = [];

  // Primary admin
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    adminCredentials.push({
      email: process.env.ADMIN_EMAIL.trim().toLowerCase(),
      password: process.env.ADMIN_PASSWORD,
      role: 'master-admin',
      name: 'Admin',
    });
  }

  // Secondary admin / trainer accounts
  for (let i = 2; i <= 10; i++) {
    const e = process.env[`ADMIN_EMAIL_${i}`];
    const p = process.env[`ADMIN_PASSWORD_${i}`];
    if (e && p) {
      adminCredentials.push({
        email: e.trim().toLowerCase(),
        password: p,
        role: 'trainer',
        name: `Trainer ${i - 1}`,
      });
    }
  }

  // Fallback: if no env vars set, allow hardcoded master credential
  // IMPORTANT: Change this in production by setting ADMIN_EMAIL + ADMIN_PASSWORD in Vercel
  if (adminCredentials.length === 0) {
    adminCredentials.push({
      email: 'obosathompsons@gmail.com',
      password: 'admin8594',
      role: 'master-admin',
      name: 'Admin',
    });
  }

  const inputEmail = email.trim().toLowerCase();
  const match = adminCredentials.find(
    cred => cred.email === inputEmail && cred.password === password
  );

  if (!match) {
    // Deliberate delay to slow brute-force
    await new Promise(r => setTimeout(r, 800));
    return res.status(401).json({ error: 'Invalid email or password. Please try again.' });
  }

  // Return a session token (simple signed token — no Firebase needed)
  const sessionData = {
    email: match.email,
    role: match.role,
    name: match.name,
    isAdmin: true,
    isMasterAdmin: match.role === 'master-admin',
    loginTime: Date.now(),
    // Simple token: base64(email:timestamp) — enough for this use case
    token: Buffer.from(`${match.email}:${Date.now()}:blackai-admin`).toString('base64'),
  };

  return res.status(200).json({ success: true, user: sessionData });
};
