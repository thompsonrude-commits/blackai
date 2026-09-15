const crypto = require('node:crypto');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const SESSION_COOKIE = 'blackai_admin_session';

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
  return initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
}

function signSession(email) {
  const secret = process.env.BLACKAI_ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('BLACKAI_ADMIN_SESSION_SECRET is not configured');
  const payload = Buffer.from(JSON.stringify({ email, expiresAt: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function isValidSession(req) {
  const secret = process.env.BLACKAI_ADMIN_SESSION_SECRET;
  const cookieHeader = req.headers.cookie || '';
  const token = cookieHeader.split(';').map(value => value.trim()).find(value => value.startsWith(`${SESSION_COOKIE}=`))?.split('=')[1];
  if (!secret || !token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return session.expiresAt > Date.now();
  } catch {
    return false;
  }
};

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`);
}

module.exports = async (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigin = origin && (origin.includes('blackai.vercel.app') || origin.includes('localhost'))
    ? origin
    : 'https://blackai.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    if (body.operation === 'login') {
      if (body.email !== process.env.BLACKAI_ADMIN_EMAIL || body.password !== process.env.BLACKAI_ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }
      setSessionCookie(res, signSession(body.email));
      return res.status(200).json({ ok: true });
    }

    if (!isValidSession(req)) return res.status(401).json({ error: 'Admin session expired. Sign in again.' });

    const firestore = getFirestore(getAdminApp());
    const entryRef = firestore.collection('coreVocabAudio').doc(String(body.id || body.edoWord || '').trim());
    if (!entryRef.id) return res.status(400).json({ error: 'Lexicon entry id is required' });

    if (body.operation === 'delete') {
      await entryRef.set({ deleted: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    } else if (body.operation === 'save') {
      const data = { ...body.data, deleted: false, updatedAt: FieldValue.serverTimestamp() };
      delete data.id;
      delete data.operation;
      await entryRef.set(data, { merge: true });
    } else {
      return res.status(400).json({ error: 'Unsupported admin operation' });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[Admin API] Lexicon operation failed:', error);
    return res.status(500).json({ error: error.message || 'Admin operation failed' });
  }
};
