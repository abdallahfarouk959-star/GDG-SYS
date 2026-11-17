// src/services/authService.js
// Client-side authentication service and session manager for GDGoC Learn
// Bridges local 2-of-5 identity reconciliation with FastAPI readiness

import {
  normalizeEmail,
  normalizePhone,
  normalizeNationalId,
  normalizeUniversityId,
  matchIdentity
} from './identityMatcher.js';
import { upsertMasterMember } from './membersService.js';

export const AUTH_SESSION_KEY = 'gdgoc_auth_session';
export const REGISTERED_USERS_KEY = 'gdgoc_registered_users';

/**
 * Pre-seeded demo accounts with password 'Password123!'
 */
export const DEMO_ACCOUNTS = [
  {
    id: 'usr_demo_student',
    email: 'student@gdgoc.edu.eg',
    password: 'Password123!',
    role: 'learner',
    fullName: 'Abdelrahman Ahmed Ibrahim',
    firstName: 'Abdelrahman',
    phone: '01001999392',
    nationalId: '30101012800111',
    isAastmtStudent: true,
    universityId: '251008742',
    primaryTrack: 'web-development',
    recovery: {
      isMatched: true,
      matchedFields: ['phone', 'university_id'],
      matchedName: 'عبدالرحمن احمد ابراهيم',
      restoredSessions: ['Web Dev 1', 'AI Session', 'Python Workshop', 'SWE 1'],
      restoredSessionsCount: 4,
      historicalXp: 240,
      celebrationDismissed: false
    }
  },
  {
    id: 'usr_demo_admin',
    email: 'admin@gdgoc.edu.eg',
    password: 'Password123!',
    role: 'super_admin',
    fullName: 'Platform Super Admin',
    firstName: 'Admin',
    phone: '01012345678',
    nationalId: '29801012800001',
    isAastmtStudent: false,
    universityId: null,
    primaryTrack: 'web-development',
    recovery: { isMatched: false, matchedFields: [], matchedName: null, restoredSessions: [], restoredSessionsCount: 0, historicalXp: 0, celebrationDismissed: true }
  },
  {
    id: 'usr_demo_web_lead',
    email: 'web.lead@gdgoc.edu.eg',
    password: 'Password123!',
    role: 'track_lead',
    assignedTrack: 'web-development',
    fullName: 'Youssef Ali',
    firstName: 'Youssef',
    phone: '01123456789',
    nationalId: '30001012800002',
    isAastmtStudent: true,
    universityId: '251001111',
    primaryTrack: 'web-development',
    recovery: { isMatched: false, matchedFields: [], matchedName: null, restoredSessions: [], restoredSessionsCount: 0, historicalXp: 0, celebrationDismissed: true }
  },
  {
    id: 'usr_demo_swe_lead',
    email: 'swe.lead@gdgoc.edu.eg',
    password: 'Password123!',
    role: 'track_lead',
    assignedTrack: 'software-engineering',
    fullName: 'Mariam Hassan',
    firstName: 'Mariam',
    phone: '01223456789',
    nationalId: '30101012800003',
    isAastmtStudent: true,
    universityId: '251002222',
    primaryTrack: 'software-engineering',
    recovery: { isMatched: false, matchedFields: [], matchedName: null, restoredSessions: [], restoredSessionsCount: 0, historicalXp: 0, celebrationDismissed: true }
  },
  {
    id: 'usr_demo_ai_lead',
    email: 'ai.lead@gdgoc.edu.eg',
    password: 'Password123!',
    role: 'track_lead',
    assignedTrack: 'ai-ml',
    fullName: 'Dr. Kareem Tarek',
    firstName: 'Kareem',
    phone: '01523456789',
    nationalId: '30201012800004',
    isAastmtStudent: false,
    universityId: null,
    primaryTrack: 'ai-ml',
    recovery: { isMatched: false, matchedFields: [], matchedName: null, restoredSessions: [], restoredSessionsCount: 0, historicalXp: 0, celebrationDismissed: true }
  },
  {
    id: 'usr_demo_ds_lead',
    email: 'ds.lead@gdgoc.edu.eg',
    password: 'Password123!',
    role: 'track_lead',
    assignedTrack: 'data-science',
    fullName: 'Sara Mostafa',
    firstName: 'Sara',
    phone: '01098765432',
    nationalId: '30301012800005',
    isAastmtStudent: true,
    universityId: '251004444',
    primaryTrack: 'data-science',
    recovery: { isMatched: false, matchedFields: [], matchedName: null, restoredSessions: [], restoredSessionsCount: 0, historicalXp: 0, celebrationDismissed: true }
  },
  {
    id: 'usr_demo_hr',
    email: 'hr@gdgoc.edu.eg',
    password: 'Password123!',
    role: 'hr',
    fullName: 'Nouran Mahmoud',
    firstName: 'Nouran',
    phone: '01198765432',
    nationalId: '30105052800006',
    isAastmtStudent: true,
    universityId: '251005555',
    primaryTrack: 'web-development',
    recovery: { isMatched: false, matchedFields: [], matchedName: null, restoredSessions: [], restoredSessionsCount: 0, historicalXp: 0, celebrationDismissed: true }
  },
  {
    id: 'usr_demo_logistics',
    email: 'logistics@gdgoc.edu.eg',
    password: 'Password123!',
    role: 'logistics',
    fullName: 'Omar Khaled',
    firstName: 'Omar',
    phone: '01298765432',
    nationalId: '30208082800007',
    isAastmtStudent: true,
    universityId: '251006666',
    primaryTrack: 'web-development',
    recovery: { isMatched: false, matchedFields: [], matchedName: null, restoredSessions: [], restoredSessionsCount: 0, historicalXp: 0, celebrationDismissed: true }
  }
];

/**
 * Get the currently active authenticated session from browser storage.
 * @returns {Object|null}
 */
export function getCurrentSession() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session && session.user && session.user.id) {
      return session;
    }
  } catch (err) {
    console.warn('Failed to parse auth session from localStorage:', err);
  }
  return null;
}

/**
 * Get all registered users from local storage.
 * @returns {Array}
 */
export function getRegisteredUsers() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Validate sign-up form fields and return clean error messages in English.
 */
export function validateSignUpInput(data) {
  const errors = {};

  // 1. Full Name
  const fullName = (data.fullName || '').trim();
  if (!fullName) {
    errors.fullName = 'Full Name is required.';
  } else if (fullName.length < 3) {
    errors.fullName = 'Full Name must be at least 3 characters.';
  }

  // 2. Email Address
  const email = (data.email || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    errors.email = 'Email Address is required.';
  } else if (!emailRegex.test(email)) {
    errors.email = 'Enter a valid email address (e.g., student@example.com).';
  }

  // 3. Phone Number (Egyptian Mobile: 11 digits starting with 01)
  const normPhone = normalizePhone(data.phone);
  if (!data.phone) {
    errors.phone = 'Phone number is required.';
  } else if (!normPhone || normPhone.length !== 11 || !normPhone.startsWith('01')) {
    errors.phone = 'Enter a valid 11-digit Egyptian mobile number (e.g., 01012345678).';
  }

  // 4. National ID (14 digits)
  const normNid = normalizeNationalId(data.nationalId);
  if (!data.nationalId) {
    errors.nationalId = 'National ID is required for identity verification.';
  } else if (!normNid || normNid.length !== 14) {
    errors.nationalId = 'National ID must be exactly 14 digits.';
  }

  // 5. Affiliation / University ID
  if (data.isAastmtStudent) {
    const normUni = normalizeUniversityId(data.universityId);
    if (!data.universityId) {
      errors.universityId = 'AASTMT University ID is required for enrolled students.';
    } else if (!normUni || normUni.length !== 9) {
      errors.universityId = 'AASTMT University ID must be exactly 9 digits (e.g., 251009966).';
    }
  }

  // 6. Primary Track (strictly 4 technical tracks)
  const allowedTracks = ['web-development', 'software-engineering', 'ai-ml', 'data-science'];
  if (!data.primaryTrack || !allowedTracks.includes(data.primaryTrack)) {
    errors.primaryTrack = 'Please select one of the 4 official learning tracks.';
  }

  // 7. Password
  const password = data.password || '';
  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Register a new user, reconcile identity with past session dataset, and persist session.
 * @param {Object} formData
 * @returns {Object} { success: boolean, session?: Object, error?: string, errors?: Object }
 */
export function signUp(formData) {
  const validation = validateSignUpInput(formData);
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
  }

  const cleanEmail = normalizeEmail(formData.email);
  const registered = getRegisteredUsers();

  // Check uniqueness of email (against registered users and demo accounts)
  if (registered.some(u => u.email === cleanEmail) || DEMO_ACCOUNTS.some(d => d.email === cleanEmail)) {
    return {
      success: false,
      error: 'An account with this email address already exists. Please sign in instead.'
    };
  }

  const cleanPhone = normalizePhone(formData.phone);
  const cleanNid = normalizeNationalId(formData.nationalId);
  const cleanUni = formData.isAastmtStudent ? normalizeUniversityId(formData.universityId) : null;
  const fullName = formData.fullName.trim();
  const firstName = fullName.split(' ')[0] || fullName;

  // Run 2-of-5 identity reconciliation against the historical dataset
  const matchResult = matchIdentity({
    email: cleanEmail,
    phone: cleanPhone,
    nationalId: cleanNid,
    universityId: cleanUni,
    fullName
  });

  const user = {
    id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    fullName,
    firstName,
    email: cleanEmail,
    phone: cleanPhone,
    nationalId: cleanNid,
    isAastmtStudent: Boolean(formData.isAastmtStudent),
    universityId: cleanUni,
    primaryTrack: formData.primaryTrack || 'web-development',
    role: 'learner',
    createdAt: new Date().toISOString()
  };

  const recovery = {
    isMatched: matchResult.isMatched,
    matchedFields: matchResult.matchedFields,
    matchedName: matchResult.matchedRecord ? matchResult.matchedRecord.name : null,
    restoredSessions: matchResult.restoredSessions,
    restoredSessionsCount: matchResult.restoredSessionsCount,
    historicalXp: matchResult.restoredXp,
    celebrationDismissed: false
  };

  const session = {
    user,
    recovery,
    token: 'jwt_local_' + Date.now().toString(36)
  };

  // Persist user record in local accounts list
  registered.push({
    ...user,
    password: formData.password,
    recovery
  });

  // Automatically upsert every verified Sign-Up into Master Members Registry
  upsertMasterMember({
    id: user.id,
    name: fullName,
    email: cleanEmail,
    phone: cleanPhone,
    national_id: cleanNid,
    uni_id: cleanUni,
    affiliation: user.isAastmtStudent ? 'AASTMT Student' : 'External Guest',
    track: user.primaryTrack,
    attended_count: matchResult.restoredSessionsCount || 0,
    sessions: matchResult.restoredSessions ? Object.fromEntries(matchResult.restoredSessions.map(s => [s, true])) : {}
  });

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registered));
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Storage write error:', e);
    }
  }

  return {
    success: true,
    session,
    isMatched: matchResult.isMatched,
    restoredSessionsCount: matchResult.restoredSessionsCount,
    restoredXp: matchResult.restoredXp
  };
}

/**
 * Sign in an existing user with email and password, checking both registered users and demo accounts.
 * @param {string} email
 * @param {string} password
 * @returns {Object} { success: boolean, session?: Object, error?: string }
 */
export function signIn(email, password) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !password) {
    return {
      success: false,
      error: 'Please enter both your email address and password.'
    };
  }

  // 1. Check pre-seeded demo accounts first
  const demoUser = DEMO_ACCOUNTS.find(d => d.email === cleanEmail);
  if (demoUser) {
    if (demoUser.password !== password) {
      return {
        success: false,
        error: 'Invalid password. (Hint: Demo password is Password123!)'
      };
    }
    const session = {
      user: {
        id: demoUser.id,
        fullName: demoUser.fullName,
        firstName: demoUser.firstName,
        email: demoUser.email,
        phone: demoUser.phone,
        nationalId: demoUser.nationalId,
        isAastmtStudent: demoUser.isAastmtStudent,
        universityId: demoUser.universityId,
        primaryTrack: demoUser.primaryTrack,
        role: demoUser.role || 'learner',
        assignedTrack: demoUser.assignedTrack || null,
        createdAt: new Date().toISOString()
      },
      recovery: demoUser.recovery || {
        isMatched: false,
        matchedFields: [],
        matchedName: null,
        restoredSessions: [],
        restoredSessionsCount: 0,
        historicalXp: 0,
        celebrationDismissed: true
      },
      token: 'jwt_demo_' + Date.now().toString(36)
    };

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      } catch (e) {
        console.error('Storage write error:', e);
      }
    }

    return {
      success: true,
      session
    };
  }

  // 2. Check registered users list
  const registered = getRegisteredUsers();
  const existingUser = registered.find(u => u.email === cleanEmail && u.password === password);

  if (!existingUser) {
    return {
      success: false,
      error: 'Invalid email or password. If you have not created an account yet, please sign up.'
    };
  }

  const session = {
    user: {
      id: existingUser.id,
      fullName: existingUser.fullName,
      firstName: existingUser.firstName,
      email: existingUser.email,
      phone: existingUser.phone,
      nationalId: existingUser.nationalId,
      isAastmtStudent: existingUser.isAastmtStudent,
      universityId: existingUser.universityId,
      primaryTrack: existingUser.primaryTrack,
      role: existingUser.role || 'learner',
      assignedTrack: existingUser.assignedTrack || null,
      createdAt: existingUser.createdAt
    },
    recovery: existingUser.recovery || {
      isMatched: false,
      matchedFields: [],
      matchedName: null,
      restoredSessions: [],
      restoredSessionsCount: 0,
      historicalXp: 0,
      celebrationDismissed: true
    },
    token: 'jwt_local_' + Date.now().toString(36)
  };

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Storage write error:', e);
    }
  }

  return {
    success: true,
    session
  };
}

/**
 * Direct one-click login for demo accounts.
 * @param {string} email
 * @returns {Object}
 */
export function signInDemo(email) {
  const demo = DEMO_ACCOUNTS.find(d => d.email === email);
  if (!demo) {
    return { success: false, error: 'Demo account not found.' };
  }
  return signIn(demo.email, demo.password);
}

/**
 * Sign out the current user and clear local session state.
 */
export function signOut() {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
    } catch (e) {
      console.error('Failed to clear session:', e);
    }
  }
  return { success: true };
}

/**
 * Mark the celebratory match banner/dialog as dismissed for this session.
 */
export function dismissCelebration() {
  const session = getCurrentSession();
  if (session && session.recovery) {
    session.recovery.celebrationDismissed = true;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      } catch {}
    }
  }
}
