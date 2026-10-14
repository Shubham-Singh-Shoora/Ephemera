import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chapterAt,
  clampProgress,
  defaultScenario,
  SCENARIOS,
  advanceTraining,
  trainingStatus,
  validateBrief,
} from '../../frontend/src/features/journey/story.js';

test('scroll boundaries and invalid values cannot produce a missing chapter', () => {
  assert.equal(chapterAt(-1), 0);
  assert.equal(chapterAt(1), 5);
  assert.equal(chapterAt(100), 5);
  assert.equal(chapterAt(NaN), 0);
  assert.equal(clampProgress(Infinity), 0);
  for (let chapter = 0; chapter < 6; chapter++) assert.equal(chapterAt(chapter / 5), chapter);
});
test('the two participants lead to the three actual training arrangements', () => {
  assert.equal(defaultScenario('provider'), 'own-model');
  assert.equal(defaultScenario('trainer'), 'request-data');
  assert.equal(SCENARIOS['find-partner'].role, 'provider');
  assert.match(SCENARIOS['own-model'].via, /your model/);
});
test('training animation remains bounded and cannot jump ahead after a suspended frame', () => {
  assert.ok(advanceTraining(20, 120) < 21);
  assert.equal(advanceTraining(100, 0.1), 100);
  assert.equal(advanceTraining(0, -10), 0);
  assert.equal(trainingStatus(100), 'Preview complete');
  assert.equal(trainingStatus(89), 'Checking the model output');
  assert.equal(trainingStatus(90), 'Releasing the trained model');
  let progress = 0;
  for (let frame = 0; frame < 1081; frame++) progress = advanceTraining(progress, 1 / 60);
  assert.equal(progress, 100);
});
test('local planning accepts supported values and rejects prototype names and arbitrary limits', () => {
  const valid = { scenario: 'own-model', dataKind: 'Images', hours: 3 } as const;
  assert.equal(validateBrief(valid), true);
  assert.equal(validateBrief({ ...valid, scenario: '__proto__' as never }), false);
  assert.equal(validateBrief({ ...valid, hours: 0 as never }), false);
  assert.equal(validateBrief({ ...valid, hours: Infinity as never }), false);
  assert.equal(validateBrief({ ...valid, dataKind: 'secret executable' as never }), false);
});
