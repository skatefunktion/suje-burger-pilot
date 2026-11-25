import assert from 'node:assert/strict';
import test from 'node:test';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { episode as flat } from '../pilot/burger/episode.mjs';
import { episode as clay } from '../pilot/burger/clay/scenes.mjs';
import { createCanvasKit } from '../scenes/canvas-kit.mjs';
import { paintFrame, visualBounds, samplePositions, frameCount } from '../queue/frames.mjs';

for (const weight of ['Regular', 'Bold']) GlobalFonts.registerFromPath(`/usr/share/fonts/opentype/noto/NotoSansCJK-${weight}.ttc`, 'Noto Sans KR');

test('the opt-in clay study preserves every scene caption, duration and untouched frame', () => {
  const canvas = createCanvas(960, 540), ctx = canvas.getContext('2d'), kit = createCanvasKit(ctx);
  const originals = flat.createScenes(ctx, kit), study = clay.createScenes(ctx, kit);
  assert.equal(study.length, 8);
  assert.deepEqual(study.map(({ dur, cap }) => ({ dur, cap })), originals.map(({ dur, cap }) => ({ dur, cap })));
  assert.equal(study.reduce((sum, scene) => sum + scene.dur, 0), 57);
  for (let i = 0; i < 8; i++) {
    paintFrame(canvas, flat, i, 60); const original = canvas.toBuffer('image/png');
    paintFrame(canvas, clay, i, 60); const result = canvas.toBuffer('image/png');
    if ([3, 4].includes(i)) assert.notDeepEqual(result, original);
    else assert.deepEqual(result, original, `flat scene ${i + 1} changed`);
  }
});

test('clay keyframes and process-step boundaries stay clear of captions and canvas edges', () => {
  for (const index of [3, 4]) {
    for (const position of [...samplePositions, .18, .65, .86, 1 / 3 - .001, 1 / 3, 2 / 3 - .001, 2 / 3]) {
      assert.ok(visualBounds(clay, index, Math.round(position * (frameCount(7) - 1))));
    }
  }
});

test('claymation holds poses on a fixed 12-exposure clock and changes between process steps', () => {
  const canvas = createCanvas(960, 540);
  for (const index of [3, 4]) {
    paintFrame(canvas, clay, index, 0); const start = canvas.toBuffer('image/png');
    paintFrame(canvas, clay, index, 1); assert.deepEqual(canvas.toBuffer('image/png'), start);
    paintFrame(canvas, clay, index, 3); assert.notDeepEqual(canvas.toBuffer('image/png'), start);
    paintFrame(canvas, clay, index, 71); const middle = canvas.toBuffer('image/png');
    assert.notDeepEqual(middle, start);
    paintFrame(canvas, clay, index, 141); assert.notDeepEqual(canvas.toBuffer('image/png'), middle);
  }
});

test('clay rendering is deterministic when frames are visited out of order', () => {
  const canvas = createCanvas(960, 540);
  for (const index of [3, 4]) {
    paintFrame(canvas, clay, index, 180); const first = canvas.toBuffer('image/png');
    paintFrame(canvas, clay, index, 15);
    paintFrame(canvas, clay, index, 180); assert.deepEqual(canvas.toBuffer('image/png'), first);
  }
});
