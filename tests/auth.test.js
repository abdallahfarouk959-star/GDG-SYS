import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toDigits,
  normalizeEmail,
  normalizePhone,
  normalizeNationalId,
  normalizeUniversityId,
  normalizeName,
  isNameMatch,
  matchIdentity
} from '../src/services/identityMatcher.js';
import {
  signIn,
  signInDemo,
  validateSignUpInput,
  DEMO_ACCOUNTS
} from '../src/services/authService.js';

test('toDigits translates Arabic-Indic numerals and strips non-digits', () => {
  assert.equal(toDigits('٠١٠١٢٣٤٥٦٧٨'), '01012345678');
  assert.equal(toDigits('+20 (11) 4261-1260'), '201142611260');
  assert.equal(toDigits(null), '');
  assert.equal(toDigits(undefined), '');
});

test('normalizeEmail lowercases and trims with @ validation', () => {
  assert.equal(normalizeEmail('  Ahmed@GDG.ORG  '), 'ahmed@gdg.org');
  assert.equal(normalizeEmail('not-an-email'), '');
  assert.equal(normalizeEmail(''), '');
});

test('normalizePhone standardizes Egyptian mobiles to 11 digits', () => {
  assert.equal(normalizePhone('+201142611260'), '01142611260');
  assert.equal(normalizePhone('00201142611260'), '01142611260');
  assert.equal(normalizePhone('0115 4210887'), '01154210887');
  assert.equal(normalizePhone('1142611260'), '01142611260');
  assert.equal(normalizePhone('٠١٠٠٨٠٨٥٤٠١'), '01008085401');
});

test('normalizeNationalId enforces exactly 14 digits', () => {
  assert.equal(normalizeNationalId('30806032800164'), '30806032800164');
  assert.equal(normalizeNationalId('٣٠٨٠٦٠٣٢٨٠٠١٦٤'), '30806032800164');
  assert.equal(normalizeNationalId('12345'), ''); // not 14
  assert.equal(normalizeNationalId('308060328001641'), ''); // 15
});

test('normalizeUniversityId enforces exactly 9 digits or null', () => {
  assert.equal(normalizeUniversityId('251008742'), '251008742');
  assert.equal(normalizeUniversityId('٢٥١٠٠٨٧٤٢'), '251008742');
  assert.equal(normalizeUniversityId('1234'), null);
  assert.equal(normalizeUniversityId(''), null);
  assert.equal(normalizeUniversityId(null), null);
});

test('normalizeName cleans Arabic diacritics and unifies letter variants', () => {
  assert.equal(normalizeName('  أحمد  '), 'احمد');
  assert.equal(normalizeName('فاطمة'), 'فاطمه');
  assert.equal(normalizeName('سَلْمَى'), 'سلمي');
  assert.equal(normalizeName('Rodeina Ahmed!'), 'rodeina ahmed');
});

test('isNameMatch handles token subsets and Arabic normalization', () => {
  assert.equal(isNameMatch('رودينه احمد', 'رودينه احمد غريب محمد'), true);
  assert.equal(isNameMatch('Abdelrahman Ahmed', 'Abdelrahman Ahmed Ibrahim'), true);
  assert.equal(isNameMatch('Kareem Ali', 'Kareem Ahmed'), false);
});

test('2-of-5 identity matcher recovers past attendee when at least 2 fields match', () => {
  // Test with sample historical member
  const sampleDataset = [
    {
      name: 'Abdelrahman Ahmed Ibrahim',
      uni_id: '251008742',
      national_id: '',
      email: 'abdoahmedibrahim99@gmail.com',
      phone: '01001999392',
      other_names: 'Abdelrahman Ahmed',
      sessions: {
        'Web Dev 1': true,
        'AI Session': true,
        'Python Workshop': true,
        'SWE 1': true,
        'Web Dev 2': false
      },
      attended_count: 4
    }
  ];

  // Match with Uni ID + Phone (2 matches)
  const match1 = matchIdentity({
    fullName: 'Abdo Ibrahim',
    email: 'newemail@gmail.com',
    phone: '01001999392',
    universityId: '251008742',
    nationalId: '30000000000000'
  }, sampleDataset);

  assert.equal(match1.isMatched, true);
  assert.equal(match1.score, 2);
  assert.deepEqual(match1.matchedFields.sort(), ['phone', 'university_id']);
  assert.equal(match1.restoredSessionsCount, 4);
  assert.equal(match1.restoredXp, 240); // 4 * 60

  // Only 1 match (e.g. phone only, stranger)
  const match2 = matchIdentity({
    fullName: 'Different Person',
    email: 'stranger@gmail.com',
    phone: '01001999392',
    universityId: '999999999',
    nationalId: '30000000000000'
  }, sampleDataset);

  assert.equal(match2.isMatched, false);
  assert.equal(match2.score, 1);
  assert.equal(match2.restoredXp, 0);
});

test('2-of-5 identity matcher correctly matches actual historical dataset', () => {
  // Rodeina Ahmed in our real dataset
  const result = matchIdentity({
    fullName: 'رودينه احمد غريب',
    email: 'rodeahmed362008@gmail.com',
    phone: '01142611260',
    nationalId: '30806032800164',
    universityId: null
  });

  assert.equal(result.isMatched, true);
  assert.equal(result.score >= 3, true);
  assert.equal(result.restoredSessionsCount, 5);
  assert.equal(result.restoredXp, 300);
});

test('pre-seeded demo accounts sign in with correct roles and credentials', () => {
  assert.equal(DEMO_ACCOUNTS.length, 8);

  // 1. Student demo
  const student = signIn('student@gdgoc.edu.eg', 'Password123!');
  assert.equal(student.success, true);
  assert.equal(student.session.user.role, 'learner');
  assert.equal(student.session.recovery.isMatched, true);
  assert.equal(student.session.recovery.restoredSessionsCount, 4);
  assert.equal(student.session.recovery.historicalXp, 240);

  // 2. Super Admin demo
  const admin = signIn('admin@gdgoc.edu.eg', 'Password123!');
  assert.equal(admin.success, true);
  assert.equal(admin.session.user.role, 'super_admin');

  // 3. Web Track Lead demo
  const webLead = signIn('web.lead@gdgoc.edu.eg', 'Password123!');
  assert.equal(webLead.success, true);
  assert.equal(webLead.session.user.role, 'track_lead');
  assert.equal(webLead.session.user.assignedTrack, 'web-development');

  // 4. SWE Track Lead demo
  const sweLead = signIn('swe.lead@gdgoc.edu.eg', 'Password123!');
  assert.equal(sweLead.success, true);
  assert.equal(sweLead.session.user.role, 'track_lead');
  assert.equal(sweLead.session.user.assignedTrack, 'software-engineering');

  // 5. AI Track Lead demo
  const aiLead = signIn('ai.lead@gdgoc.edu.eg', 'Password123!');
  assert.equal(aiLead.success, true);
  assert.equal(aiLead.session.user.role, 'track_lead');
  assert.equal(aiLead.session.user.assignedTrack, 'ai-ml');

  // 6. Data Science Lead demo
  const dsLead = signIn('ds.lead@gdgoc.edu.eg', 'Password123!');
  assert.equal(dsLead.success, true);
  assert.equal(dsLead.session.user.role, 'track_lead');
  assert.equal(dsLead.session.user.assignedTrack, 'data-science');

  // 7. HR Team demo
  const hr = signIn('hr@gdgoc.edu.eg', 'Password123!');
  assert.equal(hr.success, true);
  assert.equal(hr.session.user.role, 'hr');

  // 8. Logistics Team demo
  const logistics = signIn('logistics@gdgoc.edu.eg', 'Password123!');
  assert.equal(logistics.success, true);
  assert.equal(logistics.session.user.role, 'logistics');

  // One-click demo login helper
  const quick = signInDemo('admin@gdgoc.edu.eg');
  assert.equal(quick.success, true);
  assert.equal(quick.session.user.role, 'super_admin');
});

test('invalid password for demo account fails with clear message', () => {
  const result = signIn('admin@gdgoc.edu.eg', 'WrongPassword!');
  assert.equal(result.success, false);
  assert.ok(result.error.includes('Invalid password'));
});

test('sign-up enforces strictly the 4 official tracks and rejects mobile', () => {
  const baseValid = {
    fullName: 'Test User',
    email: 'newuser@gdgoc.edu.eg',
    phone: '01012345678',
    nationalId: '30101012800000',
    isAastmtStudent: false,
    password: 'Password123!'
  };

  // Mobile must be rejected
  const mobileRes = validateSignUpInput({ ...baseValid, primaryTrack: 'mobile-development' });
  assert.equal(mobileRes.isValid, false);
  assert.ok(mobileRes.errors.primaryTrack.includes('4 official learning tracks'));

  // Official 4 tracks must be accepted
  for (const track of ['web-development', 'software-engineering', 'ai-ml', 'data-science']) {
    const res = validateSignUpInput({ ...baseValid, primaryTrack: track });
    assert.equal(res.isValid, true);
  }
});
