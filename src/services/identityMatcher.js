// src/services/identityMatcher.js
// Identity normalization and 2-of-5 matching engine for GDGoC Learn
// Conforms to data/scripts/merge_attendance.py specifications

import { HISTORICAL_ATTENDEES } from './historicalData.js';

const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹';
const ASCII_DIGITS = '01234567890123456789';

/**
 * Convert any string containing digits (including Arabic-Indic numerals) into ASCII digits only.
 */
export function toDigits(value) {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/[٠-٩۰-۹]/g, c => ASCII_DIGITS[ARABIC_INDIC_DIGITS.indexOf(c)]);
  return str.replace(/\D/g, '');
}

/**
 * Standardize email: lowercase, trimmed. Returns empty string if invalid/no @.
 */
export function normalizeEmail(value) {
  if (!value) return '';
  const s = String(value).trim().toLowerCase();
  return s.includes('@') ? s : '';
}

/**
 * Standardize Egyptian mobile numbers to 01XXXXXXXXX (11 digits).
 * Strips international prefixes (+20, 0020), internal spaces, dashes, parentheses.
 */
export function normalizePhone(value) {
  if (!value) return '';
  let d = toDigits(value);
  if (!d) return '';

  if (d.startsWith('0020')) {
    d = d.slice(4);
  } else if (d.startsWith('20') && d.length === 12) {
    d = d.slice(2);
  }

  // Handle lost leading zero for 10-digit numbers starting with 1
  if (d.length === 10 && d.startsWith('1')) {
    d = '0' + d;
  }

  return d.length >= 9 ? d : '';
}

/**
 * Normalize National ID: exact 14 digits string.
 */
export function normalizeNationalId(value) {
  const d = toDigits(value);
  return d.length === 14 ? d : '';
}

/**
 * Normalize AASTMT University ID: exact 9 digits string, or null if empty/not student.
 */
export function normalizeUniversityId(value) {
  if (!value) return null;
  const d = toDigits(value);
  return d.length === 9 ? d : null;
}

/**
 * Arabic character mapping for robust phonetic/spelling comparison.
 */
const ARABIC_NORMALIZATION_MAP = {
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا',
  'ة': 'ه',
  'ى': 'ي',
  'ؤ': 'و',
  'ئ': 'ي'
};

/**
 * Normalize name for comparison: lowercase, remove diacritics/tashkeel, normalize Arabic letters.
 */
export function normalizeName(value) {
  if (!value) return '';
  let s = String(value).trim().toLowerCase();
  s = s.replace(/[أإآةىؤئ]/g, c => ARABIC_NORMALIZATION_MAP[c] || c);
  // Remove Arabic diacritics (harakat/tatweel)
  s = s.replace(/[\u064B-\u065F\u0640]/g, '');
  // Replace non-alphanumeric punctuation with spaces
  s = s.replace(/[^\w\s\u0600-\u06FF]/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Tokenize a normalized name into distinct non-empty words.
 */
function getTokens(normNameStr) {
  return normNameStr.split(' ').filter(Boolean);
}

/**
 * Check if two names match either identically, via token subset (>= 2 tokens), or high token overlap.
 */
export function isNameMatch(nameA, nameB) {
  const a = normalizeName(nameA);
  const b = normalizeName(nameB);
  if (!a || !b) return false;
  if (a === b) return true;

  const tokensA = getTokens(a);
  const tokensB = getTokens(b);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  // Multi-token subset check (e.g., "Ahmed Mahmoud" matches "Ahmed Mahmoud Ali")
  if (tokensA.length >= 2 && tokensA.every(tok => tokensB.includes(tok))) return true;
  if (tokensB.length >= 2 && tokensB.every(tok => tokensA.includes(tok))) return true;

  // Mutual intersection ratio
  const setB = new Set(tokensB);
  const common = tokensA.filter(tok => setB.has(tok));
  if (common.length >= 2) return true;

  return false;
}

/**
 * 2-of-5 Identity Matching Algorithm:
 * Compares 5 normalized candidate fields (email, phone, national_id, university_id, full_name)
 * against historical records.
 *
 * @param {Object} candidate - { email, phone, nationalId, universityId, fullName }
 * @param {Array} dataset - optional custom attendees array (defaults to window.GDG_DASHBOARD_DATA or HISTORICAL_ATTENDEES)
 * @returns {Object} { isMatched: boolean, score: number, matchedFields: string[], matchedRecord: Object|null, restoredSessions: string[], restoredXp: number }
 */
export function matchIdentity(candidate, dataset = null) {
  const records = dataset || (typeof window !== 'undefined' && window.GDG_DASHBOARD_DATA?.attendees) || HISTORICAL_ATTENDEES;

  const uEmail = normalizeEmail(candidate.email);
  const uPhone = normalizePhone(candidate.phone);
  const uNid = normalizeNationalId(candidate.nationalId);
  const uUni = normalizeUniversityId(candidate.universityId);
  const uName = normalizeName(candidate.fullName);

  let bestRecord = null;
  let bestScore = 0;
  let bestFields = [];

  for (const record of records) {
    const fields = [];

    // 1. Email check
    if (uEmail && record.email) {
      const recEmails = record.email.split('|').map(normalizeEmail).filter(Boolean);
      if (recEmails.includes(uEmail)) {
        fields.push('email');
      }
    }

    // 2. Phone check
    if (uPhone && record.phone) {
      const recPhones = record.phone.split('|').map(normalizePhone).filter(Boolean);
      if (recPhones.includes(uPhone)) {
        fields.push('phone');
      }
    }

    // 3. National ID check
    if (uNid && record.national_id) {
      const recNids = record.national_id.split('|').map(normalizeNationalId).filter(Boolean);
      if (recNids.includes(uNid)) {
        fields.push('national_id');
      }
    }

    // 4. University ID check
    if (uUni && record.uni_id) {
      const recUnis = record.uni_id.split('|').map(normalizeUniversityId).filter(Boolean);
      if (recUnis.includes(uUni)) {
        fields.push('university_id');
      }
    }

    // 5. Full Name check (searches primary name + all historical name variants)
    if (uName) {
      const candidateNames = [record.name, ...(record.other_names ? record.other_names.split('|') : [])];
      const hasMatchedName = candidateNames.some(cand => isNameMatch(uName, cand));
      if (hasMatchedName) {
        fields.push('full_name');
      }
    }

    if (fields.length > bestScore) {
      bestScore = fields.length;
      bestRecord = record;
      bestFields = fields;
    }
  }

  const isMatched = bestScore >= 2;
  const restoredSessions = [];

  if (isMatched && bestRecord && bestRecord.sessions) {
    for (const [sessionName, attended] of Object.entries(bestRecord.sessions)) {
      if (attended === true) {
        restoredSessions.push(sessionName);
      }
    }
  }

  const restoredXp = restoredSessions.length * 60; // 60 XP per attended community workshop

  return {
    isMatched,
    score: bestScore,
    matchedFields: bestFields,
    matchedRecord: isMatched ? bestRecord : null,
    restoredSessions,
    restoredSessionsCount: restoredSessions.length,
    restoredXp
  };
}
