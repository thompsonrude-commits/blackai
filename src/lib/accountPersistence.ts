import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db, isFirebaseUnavailableError } from './firebase';
import {
  ChatSession,
  getUserSessions,
  saveChatSession,
} from './sessionManager';
import {
  loadTeachingSession,
  saveTeachingSession,
} from '../../core/teaching';
import type { TeachingSession } from '../../core/teaching';

const CHAT_COLLECTION = 'chat_sessions';
const TEACHING_COLLECTION = 'teaching_sessions';

function reportPersistenceError(operation: string, error: unknown): void {
  if (!isFirebaseUnavailableError(error)) {
    console.error(`Account persistence failed while ${operation}:`, error);
  }
}

export async function saveAccountProfile(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerIds?: string[];
  createdAt?: number;
}): Promise<void> {
  try {
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      providerIds: user.providerIds || [],
      createdAt: user.createdAt || Date.now(),
      lastActiveAt: Date.now(),
    }, { merge: true });
  } catch (error) {
    reportPersistenceError('saving the profile', error);
  }
}

export async function saveAccountChatSession(userId: string, session: ChatSession): Promise<void> {
  try {
    await setDoc(doc(db, CHAT_COLLECTION, session.id), {
      ...session,
      userId,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (error) {
    reportPersistenceError('saving chat history', error);
  }
}

export async function loadAccountChatSessions(userId: string): Promise<ChatSession[]> {
  try {
    const snapshot = await getDocs(query(
      collection(db, CHAT_COLLECTION),
      where('userId', '==', userId),
    ));
    const sessions = snapshot.docs
      .map((item) => item.data() as ChatSession)
      .sort((left, right) => right.updatedAt - left.updatedAt);
    sessions.forEach((session) => saveChatSession(userId, session));
    return sessions;
  } catch (error) {
    reportPersistenceError('loading chat history', error);
    return [];
  }
}

export async function saveAccountTeachingSession(userId: string, session: TeachingSession): Promise<void> {
  try {
    await setDoc(doc(db, TEACHING_COLLECTION, session.sessionId), {
      ...session,
      userId,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (error) {
    reportPersistenceError('saving teaching progress', error);
  }
}

export async function loadAccountTeachingSession(userId: string): Promise<TeachingSession | null> {
  try {
    const snapshot = await getDocs(query(
      collection(db, TEACHING_COLLECTION),
      where('userId', '==', userId),
    ));
    const sessions = snapshot.docs
      .map((item) => item.data() as TeachingSession)
      .sort((left, right) => right.createdAt - left.createdAt);
    return sessions[0] ?? null;
  } catch (error) {
    reportPersistenceError('loading teaching progress', error);
    return null;
  }
}

/**
 * Migrate anonymous local data once after sign-in. The stable document IDs make
 * retries idempotent and the local cache remains available offline.
 */
export async function migrateAnonymousAccountData(userId: string): Promise<void> {
  const localSessions = getUserSessions('anonymous');
  const remoteSessions = await loadAccountChatSessions(userId);
  const remoteById = new Map(remoteSessions.map((session) => [session.id, session]));
  for (const session of localSessions) {
    const remote = remoteById.get(session.id);
    if (remote && remote.updatedAt >= session.updatedAt) continue;
    saveChatSession(userId, session);
    await saveAccountChatSession(userId, session);
  }

  const localTeaching = loadTeachingSession('anonymous');
  if (localTeaching) {
    const remoteTeaching = await loadAccountTeachingSession(userId);
    if (remoteTeaching && remoteTeaching.createdAt >= localTeaching.createdAt) return;
    const migrated = {
      ...localTeaching,
      learnerState: { ...localTeaching.learnerState, learnerId: userId },
    };
    saveTeachingSession(migrated);
    await saveAccountTeachingSession(userId, migrated);
  }
}
