import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMasterMembers,
  upsertMasterMember,
  getAllManagedSessions,
  saveManagedSession,
  getSessionRegistrations,
  registerAttendeeForSession,
  toggleSessionCheckIn
} from '../src/services/membersService.js';

test('master members registry initializes with historical members and supports upsert', () => {
  const initial = getMasterMembers();
  assert.ok(Array.isArray(initial));
  assert.equal(initial.length, 155);

  // Upsert brand new member
  const newMember = upsertMasterMember({
    name: 'New Registered Student',
    email: 'newstudent@gdgoc.edu.eg',
    phone: '01099887766',
    nationalId: '30201012809999',
    universityId: '251009999',
    affiliation: 'AASTMT Student',
    track: 'web-development'
  });

  assert.equal(newMember.name, 'New Registered Student');
  assert.equal(newMember.phone, '01099887766');

  // Verify member exists in master list
  const updated = getMasterMembers();
  const found = updated.find(m => m.phone === '01099887766');
  assert.ok(found);
  assert.equal(found.email, 'newstudent@gdgoc.edu.eg');
});

test('managed sessions support lifecycle, deletion, and student publishing toggle', () => {
  const sessions = getAllManagedSessions();
  assert.ok(sessions.length >= 7);

  // Schedule a new draft session
  const created = saveManagedSession({
    id: 'test-sess-swe-3',
    title: 'SWE 3 · Microservices & Docker',
    trackSlug: 'software-engineering',
    track: 'Software Engineering',
    date: 'Dec 12, 2026',
    time: '4:00 PM',
    rawDate: '2026-12-12',
    rawTime: '16:00',
    room: 'Hall A101',
    speaker: 'Mariam Hassan',
    publishedToStudents: false
  });

  const all = getAllManagedSessions();
  const testSession = all.find(s => s.id === 'test-sess-swe-3');
  assert.ok(testSession);
  assert.equal(testSession.publishedToStudents, false);

  // Toggle publish
  testSession.publishedToStudents = true;
  saveManagedSession(testSession);
  const updated = getAllManagedSessions().find(s => s.id === 'test-sess-swe-3');
  assert.equal(updated.publishedToStudents, true);
});

test('registerAttendeeForSession enforces validation, duplicate prevention, and unlimited open registration', () => {
  const sessionId = 'test-sess-swe-3';

  // 1. Valid registration
  const reg1 = registerAttendeeForSession(sessionId, {
    name: 'Khaled Omar',
    email: 'khaled@example.com',
    phone: '01011112222',
    nationalId: '30101012801111',
    universityId: '251001111',
    source: 'public_link'
  });

  assert.equal(reg1.success, true);
  assert.ok(reg1.registration.passCode.startsWith('PASS-GDG-'));

  // 2. Duplicate registration rejected
  const regDup = registerAttendeeForSession(sessionId, {
    name: 'Khaled Omar',
    email: 'khaled@example.com',
    phone: '01011112222',
    nationalId: '30101012801111'
  });
  assert.equal(regDup.success, false);
  assert.ok(regDup.error.includes('already registered'));

  // 3. Register second attendee
  const reg2 = registerAttendeeForSession(sessionId, {
    name: 'Sara Tarek',
    email: 'sara@example.com',
    phone: '01122223333',
    nationalId: '30201012802222',
    source: 'portal'
  });
  assert.equal(reg2.success, true);

  // 4. Unlimited registration: multiple additional attendees succeed without capacity limits
  const reg3 = registerAttendeeForSession(sessionId, {
    name: 'Third Person',
    email: 'third@example.com',
    phone: '01233334444',
    nationalId: '30301012803333'
  });
  assert.equal(reg3.success, true);
  assert.ok(reg3.registration.passCode);

  const reg4 = registerAttendeeForSession(sessionId, {
    name: 'Fourth Person',
    email: 'fourth@example.com',
    phone: '01555556666',
    nationalId: '30401012804444'
  });
  assert.equal(reg4.success, true);

  // 5. Door check-in toggle
  const checkinRes = toggleSessionCheckIn(sessionId, reg1.registration.id);
  assert.equal(checkinRes.success, true);
  assert.equal(checkinRes.checkedIn, true);

  // Reverse check-in
  const undoRes = toggleSessionCheckIn(sessionId, reg1.registration.id);
  assert.equal(undoRes.success, true);
  assert.equal(undoRes.checkedIn, false);
});
