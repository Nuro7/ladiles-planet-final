const { test } = require('node:test');
const assert = require('node:assert/strict');
const { transitionTiming, refreshCreationTiming } = require('../utils/studioTiming');
const start = '2026-10-11T10:00:00.123Z';
const end = '2026-10-11T10:02:22.365Z';

test('Timers start once, include processing, freeze at success or failure', () => {
  for (const status of ['ready', 'error']) {
    let part = transitionTiming({ status: 'queued' }, { status: 'generating' }, start);
    part = transitionTiming(part, { status: 'generating', progress: 40 }, end);
    assert.equal(part.startedAt, start);
    assert.equal(part.finishedAt, undefined);
    part = transitionTiming(part, { status }, end);
    assert.equal(part.finishedAt, end);
    assert.equal(part.elapsedMs, 142242);
    part = transitionTiming(part, { message: 'Updated message' }, '2026-10-11T11:00:00.000Z');
    assert.equal(part.elapsedMs, 142242);
  }
});
test('Retry records the prior attempt and resets only the new attempt', () => {
  const previous = { status: 'error', startedAt: start, finishedAt: end, elapsedMs: 142242 };
  const retry = transitionTiming(previous, { status: 'generating' }, end);
  assert.equal(retry.startedAt, end);
  assert.equal(retry.finishedAt, undefined);
  assert.equal(retry.elapsedMs, undefined);
  assert.equal(retry.attempts[0].elapsedMs, 142242);
  assert.equal(previous.finishedAt, end);
});
test('Standard total includes approval wait; skipped work needs no timer', () => {
  const job = { startedAt: start, image: { status: 'ready' }, video: { status: 'awaiting_approval' } };
  refreshCreationTiming(job, end);
  assert.equal(job.finishedAt, undefined);
  job.video.status = 'ready';
  refreshCreationTiming(job, end);
  assert.equal(job.elapsedMs, 142242);
  job.video.status = 'generating';
  refreshCreationTiming(job, end);
  assert.equal(job.finishedAt, undefined);
  job.video.status = 'skipped';
  refreshCreationTiming(job, end);
  assert.equal(job.finishedAt, end);
  const legacy = { image: { status: 'ready' }, video: { status: 'skipped' } };
  refreshCreationTiming(legacy, end);
  assert.equal(legacy.elapsedMs, undefined, 'Do not invent timing for legacy jobs.');
});
