import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, initialState, loadState, getProgress, getTasks, toggleLesson } from '../src/state.js';

test('starting progress matches the supplied design', () => {
  assert.deepEqual(getProgress(initialState()), { attendance: 240, activity: 160, tasks: 220, xp: 620, percent: 62, lessons: 3 });
});

test('completing a lesson earns XP once and uncompleting reverses it', () => {
  const completed = toggleLesson(initialState(), 3, true);
  assert.equal(getProgress(completed).xp, 640);
  assert.equal(getProgress(toggleLesson(completed, 3, true)).xp, 640);
  assert.equal(getProgress(toggleLesson(completed, 3, false)).xp, 620);
  assert.deepEqual(toggleLesson(completed, 9, true), completed);
});

test('task filters combine status and track; submitting does not award approval XP', () => {
  const state = initialState();
  assert.equal(getTasks(state, 'todo', 'Web Development').length, 1);
  assert.equal(getTasks(state, 'submitted', 'Web Development').length, 0);
  state.submissions.portfolio = { url: 'https://example.com/portfolio', date: 'Nov 11' };
  assert.equal(getTasks(state, 'todo').length, 0);
  assert.equal(getTasks(state, 'submitted').length, 2);
  assert.equal(getProgress(state).xp, 620);
});

test('saved progress survives a reload', () => {
  const saved = toggleLesson(initialState(), 4, true);
  saved.selectedLesson = 4;
  saved.submissions.portfolio = { url: 'https://example.com/project', date: 'Nov 11' };
  saved.joinedTracks.push('data-science');
  const storage = { getItem(key) { assert.equal(key, STORAGE_KEY); return JSON.stringify(saved); } };
  assert.deepEqual(loadState(storage), saved);
});

test('untrusted or unavailable storage cannot introduce invalid lessons or unsafe links', () => {
  const storage = { getItem: () => JSON.stringify({ completedLessons: [0, 0, -1, 6, '2', 3], selectedLesson: -1, joinedTracks: ['invented'], submissions: { portfolio: { url: 'javascript:alert(1)', date: 'now' } } }) };
  const loaded = loadState(storage);
  assert.deepEqual(loaded.completedLessons, [0, 3]);
  assert.equal(loaded.selectedLesson, 2);
  assert.deepEqual(loaded.submissions, {});
  assert.deepEqual(loaded.joinedTracks, ['web-development', 'software-engineering']);
  assert.deepEqual(loadState({ getItem: () => '{bad json' }), initialState());
  assert.deepEqual(loadState({ getItem: () => { throw new Error('Unavailable'); } }), initialState());
});
