import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chapterAt,
  nextCopy,
  CHAPTERS,
  COPY_PLACES,
  ROLES,
  STORY_DURATIONS,
  illustratedTime,
} from '../../frontend/src/features/journey/story.js';

test('the ending follows the selected boundary duration and never runs negative', () => {
  assert.deepEqual(
    STORY_DURATIONS.map((duration) => illustratedTime(duration, 0)),
    ['05:00', '15:00', '60:00'],
  );
  assert.equal(illustratedTime(5, 50), '02:30');
  assert.equal(illustratedTime(60, 100), '00:00');
  assert.equal(illustratedTime(15, 500), '00:00');
  assert.equal(illustratedTime(5, -1), '05:00');
});

test('scroll position cannot produce an invalid chapter', () => {
  assert.equal(chapterAt(-1000, 800), 0);
  assert.equal(chapterAt(0, 800), 0);
  assert.equal(chapterAt(800, 800), 1);
  assert.equal(chapterAt(4000, 800), CHAPTERS.length - 1);
  assert.equal(chapterAt(Infinity, 800), 0);
  assert.equal(chapterAt(10, 0), 0);
});

test('repeat interaction remains bounded instead of allocating endless 3D objects', () => {
  let copies = 1;
  for (let n = 0; n < 10000; n++) copies = nextCopy(copies);
  assert.equal(copies, COPY_PLACES.length);
});

test('the story retains all three intended customers without adding sector forks', () => {
  assert.deepEqual(Object.keys(ROLES), ['owner', 'reviewer', 'security']);
  assert.ok(ROLES.owner.detail.includes('intended customer'));
});
