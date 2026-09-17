/**
 * Analytics Service
 * Tracks user activity and usage statistics
 */

import { db, isFirebaseUnavailableError } from './firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';

export interface UserAnalytics {
  userId: string;
  email: string;
  firstLoginAt: number;
  lastLoginAt: number;
  totalSessions: number;
  totalMessages: number;
  languagesUsed: string[];
  totalTimeSpent: number; // in seconds
  createdAt: number;
  updatedAt: number;
}

export interface SessionAnalytics {
  sessionId: string;
  userId: string;
  email: string;
  languageId: string;
  languageName: string;
  messageCount: number;
  duration: number; // in seconds
  startTime: number;
  endTime: number;
  createdAt: number;
}

const ANALYTICS_COLLECTION = 'user_analytics';
const SESSION_ANALYTICS_COLLECTION = 'session_analytics';

export async function recordUsageEvent(
  userId: string | undefined,
  eventType: 'chat' | 'teaching' | 'research' | 'image' | 'audio',
  metadata: Record<string, string | number | boolean> = {},
): Promise<void> {
  if (!userId) return;
  try {
    await addDoc(collection(db, 'usage_events'), {
      userId,
      eventType,
      feature: eventType,
      success: true,
      metadata,
      timestamp: Date.now(),
    });
  } catch (error) {
    if (!isFirebaseUnavailableError(error)) {
      console.error('Error recording usage event:', error);
    }
  }
}

/**
 * Track user login
 */
export async function trackUserLogin(userId: string | undefined, email: string | null | undefined): Promise<void> {
  if (!userId || !email) return;

  try {
    const analyticsDoc = doc(db, ANALYTICS_COLLECTION, userId);
    const snapshot = await getDoc(analyticsDoc);

    const now = Date.now();

    if (!snapshot.exists()) {
      // New user - create analytics record
      await setDoc(analyticsDoc, {
        userId,
        email,
        firstLoginAt: now,
        lastLoginAt: now,
        totalSessions: 1,
        totalMessages: 0,
        languagesUsed: [],
        totalTimeSpent: 0,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // Existing user - update last login
      await updateDoc(analyticsDoc, {
        lastLoginAt: now,
        totalSessions: (snapshot.data().totalSessions || 0) + 1,
        updatedAt: now,
      });
    }
  } catch (error) {
    if (!isFirebaseUnavailableError(error)) {
      console.error('Error tracking user login:', error);
    }
  }
}

/**
 * Track session start
 */
export async function trackSessionStart(
  userId: string | undefined,
  email: string | null | undefined,
  languageId: string,
  languageName: string
): Promise<string> {
  if (!userId || !email) return '';

  try {
    const sessionRef = collection(db, SESSION_ANALYTICS_COLLECTION);
    const now = Date.now();

    const docRef = await addDoc(sessionRef, {
      userId,
      email,
      languageId,
      languageName,
      messageCount: 0,
      duration: 0,
      startTime: now,
      endTime: null,
      createdAt: now,
    });

    return docRef.id;
  } catch (error) {
    if (!isFirebaseUnavailableError(error)) {
      console.error('Error tracking session start:', error);
    }
    return '';
  }
}

/**
 * Track message sent
 */
export async function trackMessage(
  userId: string | undefined,
  sessionId: string,
  languageId: string
): Promise<void> {
  if (!userId) return;

  try {
    // Update session analytics
    if (sessionId) {
      const sessionDoc = doc(db, SESSION_ANALYTICS_COLLECTION, sessionId);
      const snapshot = await getDoc(sessionDoc);
      if (snapshot.exists()) {
        await updateDoc(sessionDoc, {
          messageCount: (snapshot.data().messageCount || 0) + 1,
          duration: Date.now() - snapshot.data().startTime,
        });
      }
    }

    // Update user analytics
    const analyticsDoc = doc(db, ANALYTICS_COLLECTION, userId);
    const snapshot = await getDoc(analyticsDoc);

    if (snapshot.exists()) {
      const userData = snapshot.data();
      const languagesUsed = userData.languagesUsed || [];

      if (!languagesUsed.includes(languageId)) {
        languagesUsed.push(languageId);
      }

      await updateDoc(analyticsDoc, {
        totalMessages: (userData.totalMessages || 0) + 1,
        languagesUsed,
        updatedAt: Date.now(),
      });
    }
  } catch (error) {
    if (!isFirebaseUnavailableError(error)) {
      console.error('Error tracking message:', error);
    }
  }
}

/**
 * Track session end
 */
export async function trackSessionEnd(sessionId: string): Promise<void> {
  try {
    if (!sessionId) return;

    const sessionDoc = doc(db, SESSION_ANALYTICS_COLLECTION, sessionId);
    const snapshot = await getDoc(sessionDoc);

    if (snapshot.exists()) {
      const now = Date.now();
      const startTime = snapshot.data().startTime;
      const duration = Math.round((now - startTime) / 1000); // Convert to seconds

      await updateDoc(sessionDoc, {
        endTime: now,
        duration,
      });
    }
  } catch (error) {
    if (!isFirebaseUnavailableError(error)) {
      console.error('Error tracking session end:', error);
    }
  }
}

/**
 * Get user analytics
 */
export async function getUserAnalytics(userId: string): Promise<UserAnalytics | null> {
  try {
    const snapshot = await getDoc(doc(db, ANALYTICS_COLLECTION, userId));
    if (!snapshot.exists()) return null;
    return snapshot.data() as UserAnalytics;
  } catch (error) {
    if (!isFirebaseUnavailableError(error)) {
      console.error('Error getting user analytics:', error);
    }
    return null;
  }
}

/**
 * Get all users analytics (admin only)
 */
export async function getAllUsersAnalytics(): Promise<UserAnalytics[]> {
  try {
    const analyticsRef = collection(db, ANALYTICS_COLLECTION);
    const snapshot = await getDocs(analyticsRef);
    return snapshot.docs.map(doc => doc.data() as UserAnalytics);
  } catch (error) {
    if (!isFirebaseUnavailableError(error)) {
      console.error('Error getting all users analytics:', error);
    }
    return [];
  }
}

/**
 * Get user sessions analytics
 */
export async function getUserSessionsAnalytics(userId: string): Promise<SessionAnalytics[]> {
  try {
    const sessionRef = collection(db, SESSION_ANALYTICS_COLLECTION);
    const q = query(sessionRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as SessionAnalytics);
  } catch (error) {
    if (!isFirebaseUnavailableError(error)) {
      console.error('Error getting user sessions analytics:', error);
    }
    return [];
  }
}

/**
 * Get all sessions analytics (admin only)
 */
export async function getAllSessionsAnalytics(): Promise<SessionAnalytics[]> {
  try {
    const sessionRef = collection(db, SESSION_ANALYTICS_COLLECTION);
    const snapshot = await getDocs(sessionRef);
    return snapshot.docs.map(doc => doc.data() as SessionAnalytics);
  } catch (error) {
    if (!isFirebaseUnavailableError(error)) {
      console.error('Error getting all sessions analytics:', error);
    }
    return [];
  }
}

/**
 * Get analytics summary (admin only)
 */
export async function getAnalyticsSummary(): Promise<{
  totalUsers: number;
  totalSessions: number;
  totalMessages: number;
  averageSessionDuration: number;
  topLanguages: { language: string; count: number }[];
  activeUsers: number;
}> {
  try {
    const users = await getAllUsersAnalytics();
    const sessions = await getAllSessionsAnalytics();

    // Calculate top languages
    const languageCounts: Record<string, number> = {};
    users.forEach(user => {
      user.languagesUsed?.forEach(lang => {
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      });
    });

    const topLanguages = Object.entries(languageCounts)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate average session duration
    const totalDuration = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const averageSessionDuration = sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0;

    // Count active users (logged in last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const activeUsers = users.filter(user => user.lastLoginAt > sevenDaysAgo).length;

    return {
      totalUsers: users.length,
      totalSessions: sessions.length,
      totalMessages: users.reduce((sum, user) => sum + (user.totalMessages || 0), 0),
      averageSessionDuration,
      topLanguages,
      activeUsers,
    };
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    return {
      totalUsers: 0,
      totalSessions: 0,
      totalMessages: 0,
      averageSessionDuration: 0,
      topLanguages: [],
      activeUsers: 0,
    };
  }
}

/**
 * Get user statistics
 */
export async function getUserStatistics(userId: string): Promise<{
  totalSessions: number;
  totalMessages: number;
  languagesUsed: string[];
  totalTimeSpent: number;
  averageSessionDuration: number;
  mostUsedLanguage: string | null;
}> {
  try {
    const userAnalytics = await getUserAnalytics(userId);
    const sessions = await getUserSessionsAnalytics(userId);

    if (!userAnalytics) {
      return {
        totalSessions: 0,
        totalMessages: 0,
        languagesUsed: [],
        totalTimeSpent: 0,
        averageSessionDuration: 0,
        mostUsedLanguage: null,
      };
    }

    const totalTimeSpent = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const averageSessionDuration = sessions.length > 0 ? Math.round(totalTimeSpent / sessions.length) : 0;

    // Find most used language
    const languageCounts: Record<string, number> = {};
    sessions.forEach(session => {
      languageCounts[session.languageName] = (languageCounts[session.languageName] || 0) + 1;
    });

    const mostUsedLanguage = Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    return {
      totalSessions: userAnalytics.totalSessions || 0,
      totalMessages: userAnalytics.totalMessages || 0,
      languagesUsed: userAnalytics.languagesUsed || [],
      totalTimeSpent,
      averageSessionDuration,
      mostUsedLanguage,
    };
  } catch (error) {
    console.error('Error getting user statistics:', error);
    return {
      totalSessions: 0,
      totalMessages: 0,
      languagesUsed: [],
      totalTimeSpent: 0,
      averageSessionDuration: 0,
      mostUsedLanguage: null,
    };
  }
}
