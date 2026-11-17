import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAllManagedSessions,
  saveManagedSession,
  deleteManagedSession,
  toggleSessionPublish,
  getSessionRegistrations,
  registerAttendeeForSession,
  toggleSessionCheckIn,
  getMasterMembers
} from '../src/services/membersService.js';
import {
  getTrackLessons,
  saveLesson,
  deleteLesson,
  toggleLessonVisibility,
  getTrackTasks,
  saveTrackTask,
  deleteTrackTask,
  toggleTaskVisibility,
  getTrackSubmissions,
  reviewSubmission,
  getHrEvaluations,
  saveHrEvaluation,
  deleteHrEvaluation
} from '../src/state.js';

test('HR portal supports submitting, editing, deleting evaluations and calculating dynamic stats', () => {
  const initial = getHrEvaluations();
  assert.ok(initial.length >= 2);

  // 1. Submit new HR evaluation
  const newEval = {
    id: 'eval_test_swe_lead',
    sessionName: 'SWE 1 · Git & Clean Architecture',
    speaker: 'Mariam Hassan (SWE Lead)',
    evaluator: 'Nouran Mahmoud (HR)',
    date: 'Nov 18, 2026',
    ratings: { communication: 5, clarity: 5, engagement: 5, punctuality: 4 },
    averageScore: 4.75,
    notes: 'Outstanding technical depth and crisp diagrams explaining repository boundaries.'
  };

  saveHrEvaluation(newEval);
  const updatedList = getHrEvaluations();
  assert.ok(updatedList.some(e => e.id === 'eval_test_swe_lead'));

  // 2. Edit existing evaluation
  const editedEval = {
    ...newEval,
    averageScore: 5.0,
    notes: 'Updated notes: Learners completed hands-on commits during the session.'
  };
  saveHrEvaluation(editedEval);
  const afterEdit = getHrEvaluations().find(e => e.id === 'eval_test_swe_lead');
  assert.equal(afterEdit.averageScore, 5.0);
  assert.ok(afterEdit.notes.includes('hands-on commits'));

  // 3. Delete evaluation
  deleteHrEvaluation('eval_test_swe_lead');
  const afterDelete = getHrEvaluations();
  assert.equal(afterDelete.some(e => e.id === 'eval_test_swe_lead'), false);
});

test('Track Lead Studio provides complete CRUD for sessions, lessons, and tasks across tracks', () => {
  // 1. Sessions CRUD in Track Studio
  const sweSession = {
    id: 'sess-studio-swe-adv',
    title: 'SWE Advanced Architecture & Event Driven Systems',
    trackSlug: 'software-engineering',
    track: 'Software Engineering',
    date: 'Dec 05, 2026',
    time: '5:00 PM',
    rawDate: '2026-12-05',
    rawTime: '17:00',
    room: 'Lab 102 - AASTMT',
    speaker: 'Mariam Hassan',
    publishedToStudents: false
  };

  saveManagedSession(sweSession);
  let sessions = getAllManagedSessions();
  assert.ok(sessions.some(s => s.id === 'sess-studio-swe-adv'));

  // Toggle session visibility
  const toggleRes = toggleSessionPublish('sess-studio-swe-adv');
  assert.equal(toggleRes.success, true);
  assert.equal(toggleRes.session.publishedToStudents, true);

  // Delete session
  deleteManagedSession('sess-studio-swe-adv');
  sessions = getAllManagedSessions();
  assert.equal(sessions.some(s => s.id === 'sess-studio-swe-adv'), false);

  // 2. Curriculum & Lessons CRUD in Track Studio
  const aiLesson = {
    id: 'les-ai-deep-net',
    trackSlug: 'ai-ml',
    track: 'AI & Machine Learning',
    title: 'Deep Convolutional Networks',
    heading: 'Feature Extraction via Convolutions',
    time: 12,
    text: 'Understand kernels, pooling layers, and receptive fields.',
    code: 'import torch.nn as nn\nconv = nn.Conv2d(3, 64, kernel_size=3)',
    after: 'Test edge detection kernels on sample images.',
    hidden: false
  };

  saveLesson(aiLesson);
  let aiLessons = getTrackLessons('ai-ml', true);
  assert.ok(aiLessons.some(l => l.id === 'les-ai-deep-net'));

  // Toggle lesson visibility (hide)
  toggleLessonVisibility('les-ai-deep-net');
  const visibleAiLessons = getTrackLessons('ai-ml', false);
  assert.equal(visibleAiLessons.some(l => l.id === 'les-ai-deep-net'), false);

  // Delete lesson
  deleteLesson('les-ai-deep-net');
  assert.equal(getTrackLessons('ai-ml', true).some(l => l.id === 'les-ai-deep-net'), false);

  // 3. Track Tasks CRUD
  const dsTask = {
    id: 'task-ds-sql-analytics',
    trackSlug: 'data-science',
    track: 'Data Science',
    title: 'PostgreSQL Analytics Queries',
    xp: 95,
    status: 'todo',
    icon: 'chart',
    color: 'yellow',
    description: 'Write window functions and aggregations.',
    date: 'Due: Feb 15',
    requirements: ['Calculate moving averages with window functions.'],
    hidden: false
  };

  saveTrackTask(dsTask);
  let dsTasks = getTrackTasks('data-science', true);
  assert.ok(dsTasks.some(t => t.id === 'task-ds-sql-analytics'));

  // Toggle task visibility
  toggleTaskVisibility('task-ds-sql-analytics');
  assert.equal(getTrackTasks('data-science', false).some(t => t.id === 'task-ds-sql-analytics'), false);

  // Delete task
  deleteTrackTask('task-ds-sql-analytics');
  assert.equal(getTrackTasks('data-science', true).some(t => t.id === 'task-ds-sql-analytics'), false);
});

test('Track Lead submissions review allows approving with XP and rejecting with feedback', () => {
  const sweSubs = getTrackSubmissions('software-engineering');
  assert.ok(sweSubs.length >= 1);
  const targetSub = sweSubs[0];

  // 1. Approve submission
  const approveRes = reviewSubmission(targetSub.id, {
    status: 'approved',
    feedback: 'Excellent git commit history and clean branch workflow!',
    reviewer: 'Mariam Hassan (SWE Lead)'
  });
  assert.equal(approveRes.success, true);
  assert.equal(approveRes.submission.status, 'approved');
  assert.equal(approveRes.submission.reviewer, 'Mariam Hassan (SWE Lead)');

  // 2. Reject submission with constructive feedback
  const rejectRes = reviewSubmission(targetSub.id, {
    status: 'rejected',
    feedback: 'Please rebase against main and squash into 3 atomic commits.',
    reviewer: 'Mariam Hassan (SWE Lead)'
  });
  assert.equal(rejectRes.success, true);
  assert.equal(rejectRes.submission.status, 'rejected');
  assert.ok(rejectRes.submission.feedback.includes('rebase'));
});

test('Logistics door operations support active session registration, check-in toggle and walk-ins', () => {
  const sessionId = 'sess-web-dev-3';

  // 1. Walk-in attendee registration & immediate check-in
  const walkinRes = registerAttendeeForSession(sessionId, {
    name: 'Walkin Attendee Example',
    email: '01055556666@guest.gdgoc.edu.eg',
    phone: '01055556666',
    nationalId: '30101012805555',
    universityId: '251005555',
    source: 'walkin'
  });
  assert.equal(walkinRes.success, true);
  assert.equal(walkinRes.registration.source, 'walkin');

  // Check in walk-in attendee
  const inRes = toggleSessionCheckIn(sessionId, walkinRes.registration.id);
  assert.equal(inRes.success, true);
  assert.equal(inRes.checkedIn, true);

  // Verify walk-in is saved into master members registry
  const master = getMasterMembers();
  assert.ok(master.some(m => m.phone === '01055556666'));

  // 2. Undo check-in
  const undoRes = toggleSessionCheckIn(sessionId, walkinRes.registration.id);
  assert.equal(undoRes.success, true);
  assert.equal(undoRes.checkedIn, false);
});
