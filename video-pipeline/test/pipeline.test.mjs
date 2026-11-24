import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createCanvas } from '@napi-rs/canvas';
import { episode as ep02 } from '../episodes/ep02/episode.mjs';
import { episode as burger } from '../pilot/burger/episode.mjs';
import { createCanvasKit } from '../scenes/canvas-kit.mjs';
import { CAPTION_Y, WIDTH, HEIGHT, frameCount, paintFrame, assertNotBlank, visualBounds } from '../queue/frames.mjs';
import { run } from '../queue/process.mjs';
import { renderScene, renderWithRetry } from '../queue/render.mjs';
import { assertReviewed } from '../queue/review.mjs';
import { assertDuration, assertPublishable, inspectAudio } from '../stitch/qc.mjs';

const ctx = createCanvas(1, 1).getContext('2d');

test('keeps original 57-second burger and the exact five episode 2 slots', () => {
  const pilot = burger.createScenes(ctx, createCanvasKit(ctx));
  const scenes = ep02.createScenes(ctx, createCanvasKit(ctx));
  assert.equal(pilot.length, 8);
  assert.equal(pilot.reduce((sum, scene) => sum + frameCount(scene.dur), 0), 1710);
  assert.deepEqual(scenes.map(scene => scene.dur), [8, 13, 12, 15, 9]);
  assert.equal(scenes.reduce((sum, scene) => sum + frameCount(scene.dur), 0), 1710);
  assert.ok(scenes.every(scene => /[가-힣]/.test(scene.cap)));
  assert.ok(ep02.narration.every(line => /[가-힣]/.test(line)));
  assert.throws(() => frameCount(0.01), /multiple of/);
});

test('uses exact 1/30-second steps normalized to duration', () => {
  const times = [];
  const episode = { createScenes: () => [{ dur: 2, cap: '', draw: t => times.push(t) }] };
  const canvas = createCanvas(WIDTH, HEIGHT);
  for (const frame of [0, 1, 59, 1]) paintFrame(canvas, episode, 0, frame);
  assert.deepEqual(times, [0, 1 / 60, 59 / 60, 1 / 60]);
});

test('rejects blank samples, caption overlap and artwork outside the canvas', () => {
  const episode = (x, y) => ({
    createScenes: ctx => [{ dur: 1, cap: '', draw: () => ctx.fillRect(x, y, 10, 10) }],
  });
  assert.throws(() => assertNotBlank(new Uint8Array(16), 3), { kind: 'blank', frame: 3 });
  assert.throws(() => visualBounds(episode(300, CAPTION_Y - 5), 0, 7), { kind: 'visual', frame: 7 });
  assert.throws(() => visualBounds(episode(-5, 100), 0, 0), /outside the canvas/);
  assert.equal(visualBounds(episode(300, 100), 0, 0), true);
});

test('scene processes isolate draw faults and real timeouts', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'video-render-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const fixture = new URL('./fixtures/scenes.mjs', import.meta.url);
  const results = await Promise.all([0, 1, 2, 3].map(index =>
    renderScene(fixture, index, join(dir, String(index)), {
      mode: 'review', timeout: index === 3 ? 1500 : 15_000,
    })));
  assert.equal(results[0].kind, 'draw');
  assert.match(results[0].stack, /broken scene/);
  assert.deepEqual(results[1], { ok: true });
  assert.equal(results[2].kind, 'blank');
  assert.equal(results[3].kind, 'timeout');
});

test('tries twice after failure then marks a fallback degraded', async () => {
  const modes = [], pauses = [];
  const result = await renderWithRetry(async (mode, attempt) => {
    modes.push([mode, attempt]);
    return mode === 'fallback' ? { ok: true } : { ok: false, kind: attempt === 1 ? 'timeout' : 'draw' };
  }, { pause: attempt => pauses.push(attempt) });
  assert.deepEqual(modes, [['render', 1], ['render', 2], ['render', 3], ['fallback', 4]]);
  assert.deepEqual(pauses, [1]);
  assert.equal(result.retries, 2);
  assert.equal(result.status, 'degraded');
  assert.equal(result.fallback, 'caption-card');
  assert.equal((await renderWithRetry(async (_mode, i) => ({ ok: i === 2 }))).retries, 1);
  assert.equal((await renderWithRetry(async () => ({ ok: false }))).status, 'failed');
});

test('QC rejects stale review, unapproved / degraded scenes, missing narration and bad duration', () => {
  const checks = Object.fromEntries([
    'insideCanvas', 'captionClear', 'proportions', 'readable', 'contrast', 'layerOrder', 'pilotStyle',
  ].map(check => [check, true]));
  const review = { reviewer: 'Reviewer', fingerprint: 'abc', checks };
  assert.doesNotThrow(() => assertReviewed(review, 'abc'));
  assert.throws(() => assertReviewed(review, 'def'), /stale/);
  assert.throws(() => assertReviewed({ ...review, checks: { ...checks, proportions: false } }, 'abc'), /approval/);
  const baseline = { ...review, baselineException: 'Overlapping pilot labels', checks: { ...checks, readable: false } };
  assert.throws(() => assertReviewed(baseline, 'abc'), /approval/);
  assert.equal(assertReviewed(baseline, 'abc', { pilotSmoke: true }), 'Overlapping pilot labels');
  assert.throws(() => assertReviewed({ ...baseline, checks: { ...checks, insideCanvas: false } },
    'abc', { pilotSmoke: true }), /approval/);
  assert.throws(() => assertPublishable([{ status: 'degraded', audio: { status: 'passed' } }]), /QC blocked/);
  assert.throws(() => assertPublishable([{ status: 'passed', audio: { status: 'failed' } }]), /QC blocked/);
  assert.doesNotThrow(() => assertPublishable([{ status: 'passed', audio: { status: 'passed' } }]));
  for (const duration of [44.99, 60.01, NaN]) assert.throws(() => assertDuration(duration), /45–60s/);
  for (const duration of [45, 57, 60]) assert.doesNotThrow(() => assertDuration(duration));
});

test('QC rejects an audio track of silence', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'video-audio-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'silent.wav');
  await run('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'anullsrc', '-t', '1', path]);
  await assert.rejects(inspectAudio(path), /silent/);
});
