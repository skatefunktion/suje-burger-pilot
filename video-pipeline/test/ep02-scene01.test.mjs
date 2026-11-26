import assert from 'node:assert/strict';
import test from 'node:test';
import { createCanvas } from '@napi-rs/canvas';
import { episode } from '../episodes/ep02/episode.mjs';
import { WIDTH, HEIGHT, FPS, paintFrame } from '../queue/frames.mjs';

test('the next question restarts the document and its progress without resetting the clock', () => {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const sample = seconds => {
    paintFrame(canvas, episode, 0, seconds * FPS);
    return {
      page: ctx.getImageData(170, 126, 214, 216).data,
      clock: ctx.getImageData(596, 168, 136, 136).data,
      progress: ctx.getImageData(215, 427, 530, 1).data,
    };
  };

  const start = sample(0);
  const scanned = sample(4 - 1 / FPS);
  const restart = sample(4);
  const rescanned = sample(8 - 1 / FPS);
  assert.notDeepEqual(scanned.page, start.page);
  assert.notDeepEqual(scanned.progress, start.progress);
  assert.deepEqual(restart.page, start.page);
  assert.deepEqual(restart.progress, start.progress);
  assert.notDeepEqual(restart.clock, start.clock);
  assert.deepEqual(rescanned.page, scanned.page);
  assert.deepEqual(rescanned.progress, scanned.progress);
  assert.deepEqual(sample(4), restart);
});
