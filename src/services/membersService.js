// src/services/membersService.js
// Master Members Registry & Session Registration Manager for GDGoC Learn
import { HISTORICAL_ATTENDEES } from './historicalData.js';
import {
  normalizeEmail,
  normalizePhone,
  normalizeNationalId,
  normalizeUniversityId
} from './identityMatcher.js';

export const MASTER_MEMBERS_KEY = 'gdgoc_master_members';
export const SESSIONS_STORAGE_KEY = 'gdgoc_all_sessions';
export const REGISTRATIONS_PREFIX = 'gdgoc_session_reg_';

const memoryStore = new Map();

function storageGet(key) {
  if (typeof localStorage !== 'undefined') {
    try { return localStorage.getItem(key); } catch {}
  }
  return memoryStore.get(key) || null;
}

function storageSet(key, value) {
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem(key, value); } catch {}
  }
  memoryStore.set(key, value);
}

/**
 * Initialize and get the master members registry.
 * Populated initially from HISTORICAL_ATTENDEES (155 members) and augmented with every new sign-up and walk-in.
 * @returns {Array<Object>}
 */
export function getMasterMembers() {
  try {
    const raw = storageGet(MASTER_MEMBERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse master members from storage:', err);
  }

  // First time initialization: seed from HISTORICAL_ATTENDEES
  const initialList = initializeSeedMembers();
  try {
    storageSet(MASTER_MEMBERS_KEY, JSON.stringify(initialList));
  } catch {}
  return initialList;
}

function initializeSeedMembers() {
  return HISTORICAL_ATTENDEES.map((att, idx) => ({
    id: 'mem_seed_' + (idx + 1),
    name: att.name,
    email: normalizeEmail(att.email) || '',
    phone: normalizePhone(att.phone) || '',
    national_id: normalizeNationalId(att.national_id) || '',
    uni_id: normalizeUniversityId(att.uni_id) || null,
    affiliation: att.uni_id ? 'AASTMT Student' : 'External Guest',
    track: 'web-development',
    sessions: att.sessions || {},
    attended_count: att.attended_count || 0,
    registeredAt: '2026-10-01T10:00:00.000Z'
  }));
}

/**
 * Upsert a member into the Master Members Registry.
 * If a member with matching email, phone, or national_id already exists, updates them; otherwise appends.
 * @param {Object} memberData
 * @returns {Object} saved member
 */
export function upsertMasterMember(memberData) {
  const members = getMasterMembers();
  const cleanEmail = normalizeEmail(memberData.email);
  const cleanPhone = normalizePhone(memberData.phone);
  const cleanNid = normalizeNationalId(memberData.national_id || memberData.nationalId);
  const cleanUni = normalizeUniversityId(memberData.uni_id || memberData.universityId);
  const fullName = (memberData.name || memberData.fullName || '').trim();

  // Find existing member
  const index = members.findIndex(m => {
    if (cleanEmail && m.email && m.email === cleanEmail) return true;
    if (cleanPhone && m.phone && m.phone === cleanPhone) return true;
    if (cleanNid && m.national_id && m.national_id === cleanNid) return true;
    if (cleanUni && m.uni_id && m.uni_id === cleanUni) return true;
    return false;
  });

  const memberRecord = {
    id: index >= 0 ? members[index].id : ('mem_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    name: fullName || (index >= 0 ? members[index].name : 'Community Member'),
    email: cleanEmail || (index >= 0 ? members[index].email : ''),
    phone: cleanPhone || (index >= 0 ? members[index].phone : ''),
    national_id: cleanNid || (index >= 0 ? members[index].national_id : ''),
    uni_id: cleanUni || (index >= 0 ? members[index].uni_id : null),
    affiliation: cleanUni ? 'AASTMT Student' : (memberData.affiliation || (index >= 0 ? members[index].affiliation : 'External Guest')),
    track: memberData.track || memberData.primaryTrack || (index >= 0 ? members[index].track : 'web-development'),
    sessions: index >= 0 ? { ...members[index].sessions, ...(memberData.sessions || {}) } : (memberData.sessions || {}),
    attended_count: index >= 0 ? (members[index].attended_count || 0) : (memberData.attended_count || 0),
    registeredAt: index >= 0 ? members[index].registeredAt : new Date().toISOString()
  };

  if (index >= 0) {
    members[index] = memberRecord;
  } else {
    members.unshift(memberRecord);
  }

  storageSet(MASTER_MEMBERS_KEY, JSON.stringify(members));

  return memberRecord;
}

/**
 * Default master sessions list with dual publishing flags (Unlimited open capacity).
 */
export const DEFAULT_MASTER_SESSIONS = [
  {
    id: 'sess-web-dev-1',
    title: 'Web Dev 1 · Introduction to the Modern Web',
    trackSlug: 'web-development',
    track: 'Web Development',
    date: 'Oct 18, 2026',
    time: '4:00 PM - 6:30 PM',
    rawDate: '2026-10-18',
    rawTime: '16:00',
    room: 'Hall A101 - AASTMT Aswan',
    speaker: 'Ahmed Ibrahim (Lead)',
    status: 'completed',
    publishedToStudents: true,
    historicalName: 'Web Dev 1'
  },
  {
    id: 'sess-ai-1',
    title: 'AI Session · Foundations of Machine Learning',
    trackSlug: 'ai-ml',
    track: 'AI & Machine Learning',
    date: 'Oct 25, 2026',
    time: '4:00 PM - 6:30 PM',
    rawDate: '2026-10-25',
    rawTime: '16:00',
    room: 'Hall A204 - AASTMT Aswan',
    speaker: 'Dr. Kareem Tarek',
    status: 'completed',
    publishedToStudents: true,
    historicalName: 'AI Session'
  },
  {
    id: 'sess-py-1',
    title: 'Python Workshop · Practical Scripting',
    trackSlug: 'data-science',
    track: 'Data Science',
    date: 'Nov 01, 2026',
    time: '3:00 PM - 5:30 PM',
    rawDate: '2026-11-01',
    rawTime: '15:00',
    room: 'Lab 101 - AASTMT Aswan',
    speaker: 'Sara Mostafa',
    status: 'completed',
    publishedToStudents: true,
    historicalName: 'Python Workshop'
  },
  {
    id: 'sess-swe-1',
    title: 'SWE 1 · Git & Clean Architecture',
    trackSlug: 'software-engineering',
    track: 'Software Engineering',
    date: 'Nov 08, 2026',
    time: '5:00 PM - 7:30 PM',
    rawDate: '2026-11-08',
    rawTime: '17:00',
    room: 'Hall A101 - AASTMT Aswan',
    speaker: 'Mariam Hassan',
    status: 'completed',
    publishedToStudents: true,
    historicalName: 'SWE 1'
  },
  {
    id: 'sess-web-dev-2',
    title: 'Web Dev 2 · HTML & CSS Deep Dive',
    trackSlug: 'web-development',
    track: 'Web Development',
    date: 'Nov 15, 2026',
    time: '4:00 PM - 6:30 PM',
    rawDate: '2026-11-15',
    rawTime: '16:00',
    room: 'Lab 203 - AASTMT Aswan',
    speaker: 'Youssef Ali',
    status: 'completed',
    publishedToStudents: true,
    historicalName: 'Web Dev 2'
  },
  {
    id: 'sess-web-dev-3',
    title: 'Web Dev 3 · Responsive Layouts & Modern Components',
    trackSlug: 'web-development',
    track: 'Web Development',
    date: 'Saturday, Nov 22, 2026',
    time: '4:00 PM - 6:30 PM',
    rawDate: '2026-11-22',
    rawTime: '16:00',
    room: 'Hall A204 - AASTMT Aswan',
    speaker: 'Youssef Ali',
    status: 'upcoming',
    publishedToStudents: true,
    historicalName: 'Web Dev 3'
  },
  {
    id: 'sess-swe-2',
    title: 'SWE 2 · Design Patterns & Unit Testing',
    trackSlug: 'software-engineering',
    track: 'Software Engineering',
    date: 'Monday, Nov 24, 2026',
    time: '5:00 PM - 7:00 PM',
    rawDate: '2026-11-24',
    rawTime: '17:00',
    room: 'Lab 102 - AASTMT Aswan',
    speaker: 'Mariam Hassan',
    status: 'upcoming',
    publishedToStudents: false, // Draft mode initially
    historicalName: 'SWE 2'
  }
];

/**
 * Get all managed sessions from storage or fallback.
 * @returns {Array<Object>}
 */
export function getAllManagedSessions() {
  try {
    const raw = storageGet(SESSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  try {
    storageSet(SESSIONS_STORAGE_KEY, JSON.stringify(DEFAULT_MASTER_SESSIONS));
  } catch {}
  return DEFAULT_MASTER_SESSIONS;
}

/**
 * Save or update a session in the managed sessions database.
 * @param {Object} session
 * @returns {Array<Object>} updated sessions
 */
export function saveManagedSession(session) {
  const sessions = getAllManagedSessions();
  const index = sessions.findIndex(s => s.id === session.id);
  if (index >= 0) {
    sessions[index] = { ...sessions[index], ...session };
  } else {
    sessions.push(session);
  }
  storageSet(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  return sessions;
}

/**
 * Delete a session from managed sessions.
 * @param {string} sessionId
 * @returns {Array<Object>} remaining sessions
 */
export function deleteManagedSession(sessionId) {
  const sessions = getAllManagedSessions().filter(s => s.id !== sessionId);
  storageSet(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  return sessions;
}

/**
 * Toggle published state of a session.
 * @param {string} sessionId
 * @returns {Object} { success: boolean, session?: Object, error?: string }
 */
export function toggleSessionPublish(sessionId) {
  const sessions = getAllManagedSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (session) {
    session.publishedToStudents = !session.publishedToStudents;
    storageSet(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    return { success: true, session };
  }
  return { success: false, error: 'Session not found.' };
}

/**
 * Get all registrations for a specific session.
 * @param {string} sessionId
 * @returns {Array<Object>}
 */
export function getSessionRegistrations(sessionId) {
  try {
    const raw = storageGet(REGISTRATIONS_PREFIX + sessionId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Register an attendee for a session (either student portal or external public link).
 * Open registration with unlimited capacity.
 * Also automatically upserts the member into the Master Members Registry.
 * @param {string} sessionId
 * @param {Object} attendeeData
 * @returns {Object} { success: boolean, registration: Object, member: Object, error?: string }
 */
export function registerAttendeeForSession(sessionId, attendeeData) {
  const cleanEmail = normalizeEmail(attendeeData.email);
  const cleanPhone = normalizePhone(attendeeData.phone);
  const cleanNid = normalizeNationalId(attendeeData.national_id || attendeeData.nationalId);
  const cleanUni = normalizeUniversityId(attendeeData.uni_id || attendeeData.universityId);
  const fullName = (attendeeData.name || attendeeData.fullName || '').trim();

  if (!fullName || fullName.length < 3) {
    return { success: false, error: 'Full name must be at least 3 characters.' };
  }
  if (!cleanEmail) {
    return { success: false, error: 'A valid email address is required.' };
  }
  if (!cleanPhone || cleanPhone.length !== 11) {
    return { success: false, error: 'An 11-digit Egyptian mobile number is required.' };
  }
  if (!cleanNid || cleanNid.length !== 14) {
    return { success: false, error: 'A valid 14-digit National ID is required.' };
  }

  // Check if session exists
  const sessions = getAllManagedSessions();
  const session = sessions.find(s => s.id === sessionId);
  const currentRegistrations = getSessionRegistrations(sessionId);

  // Check duplicate registration for this session
  const alreadyReg = currentRegistrations.some(r =>
    (cleanEmail && r.email === cleanEmail) ||
    (cleanPhone && r.phone === cleanPhone) ||
    (cleanNid && r.national_id === cleanNid)
  );

  if (alreadyReg) {
    return {
      success: false,
      error: 'You are already registered for this session.'
    };
  }

  // 1. Upsert into Master Members Registry
  const member = upsertMasterMember({
    name: fullName,
    email: cleanEmail,
    phone: cleanPhone,
    national_id: cleanNid,
    uni_id: cleanUni,
    affiliation: cleanUni ? 'AASTMT Student' : 'External Guest',
    track: session ? session.trackSlug : 'web-development'
  });

  // 2. Add to session registrations list
  const registration = {
    id: 'reg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    sessionId,
    memberId: member.id,
    name: fullName,
    email: cleanEmail,
    phone: cleanPhone,
    national_id: cleanNid,
    uni_id: cleanUni,
    affiliation: member.affiliation,
    passCode: 'PASS-GDG-' + Math.floor(1000 + Math.random() * 9000),
    checkedIn: false,
    checkedInAt: null,
    registeredAt: new Date().toISOString(),
    source: attendeeData.source || 'portal' // 'portal' | 'public_link' | 'walkin'
  };

  currentRegistrations.push(registration);
  storageSet(REGISTRATIONS_PREFIX + sessionId, JSON.stringify(currentRegistrations));

  return {
    success: true,
    registration,
    member
  };
}

/**
 * Toggle check-in status for an attendee in a specific session.
 * Credits +60 XP if the user has a registered account.
 * @param {string} sessionId
 * @param {string} regIdOrPhone
 * @returns {Object}
 */
export function toggleSessionCheckIn(sessionId, regIdOrPhone) {
  const registrations = getSessionRegistrations(sessionId);
  const index = registrations.findIndex(r => r.id === regIdOrPhone || r.phone === regIdOrPhone || r.name === regIdOrPhone);

  if (index >= 0) {
    const isChecked = !registrations[index].checkedIn;
    registrations[index].checkedIn = isChecked;
    registrations[index].checkedInAt = isChecked ? new Date().toISOString() : null;

    storageSet(REGISTRATIONS_PREFIX + sessionId, JSON.stringify(registrations));

    return {
      success: true,
      checkedIn: isChecked,
      registration: registrations[index]
    };
  }

  return { success: false, error: 'Registration record not found.' };
}
