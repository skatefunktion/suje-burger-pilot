import assert from 'node:assert/strict';
import test from 'node:test';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { episode as flat } from '../pilot/burger/episode.mjs';
import { episode as clay, claySchedule, clayShotAt } from '../pilot/burger/clay/scenes.mjs';
import { episode as originalFormat } from '../pilot/burger/clay/original-format.mjs';
import { createCanvasKit } from '../scenes/canvas-kit.mjs';
import { paintFrame, visualBounds, samplePositions, frameCount } from '../queue/frames.mjs';

for (const weight of ['Regular', 'Bold']) GlobalFonts.registerFromPath(`/usr/share/fonts/opentype/noto/NotoSansCJK-${weight}.ttc`, 'Noto Sans KR');

test('original-format export preserves captions and timing and keeps all held poses within the original frame', () => {
  const canvas = createCanvas(960, 540), reference = createCanvas(960, 540);
  const ctx = canvas.getContext('2d'), kit = createCanvasKit(ctx);
  const scenes = originalFormat.createScenes(ctx, kit), originals = flat.createScenes(ctx, kit);
  assert.deepEqual(scenes.map(({ dur, cap }) => ({ dur, cap })), originals.map(({ dur, cap }) => ({ dur, cap })));
  for (const [index, scene] of scenes.entries()) {
    const visited = new Set();
    for (let frame = 0; frame < frameCount(scene.dur); frame++) {
      const { asset, pose } = clayShotAt(index, frame / frameCount(scene.dur), scene.dur);
      if (visited.has(`${asset}-${pose}`)) continue;
      visited.add(`${asset}-${pose}`);
      assert.ok(visualBounds(originalFormat, index, frame), `${asset}-${pose}: valid artwork`);
    }
    paintFrame(canvas, originalFormat, index, 30);
    paintFrame(reference, flat, index, 30);
    assert.deepEqual(ctx.getImageData(0, 480, 960, 60).data,
      reference.getContext('2d').getImageData(0, 480, 960, 60).data, 'original bottom caption band');
    assert.deepEqual(ctx.getImageData(20, 20, 1, 1).data,
      reference.getContext('2d').getImageData(20, 20, 1, 1).data, 'paper background without review-card chrome');
  }
});

test('the full clay pilot changes all eight visuals but preserves every caption and duration', () => {
  const canvas = createCanvas(960, 540), ctx = canvas.getContext('2d'), kit = createCanvasKit(ctx);
  const originals = flat.createScenes(ctx, kit), study = clay.createScenes(ctx, kit);
  assert.equal(study.length, 8);
  assert.deepEqual(study.map(({ dur, cap }) => ({ dur, cap })), originals.map(({ dur, cap }) => ({ dur, cap })));
  assert.equal(study.reduce((sum, scene) => sum + scene.dur, 0), 57);
  for (let i = 0; i < 8; i++) {
    paintFrame(canvas, flat, i, 60); const original = canvas.toBuffer('image/png');
    paintFrame(canvas, clay, i, 60); const result = canvas.toBuffer('image/png');
    assert.notDeepEqual(result, original, `scene ${i + 1} must be clay, not delegated flat artwork`);
  }
});

test('clay keyframes and process-step boundaries stay clear of captions and canvas edges', () => {
  const canvas = createCanvas(960, 540), ctx = canvas.getContext('2d');
  const originals = flat.createScenes(ctx, createCanvasKit(ctx));
  for (const index of claySchedule.keys()) {
    const dur = originals[index].dur;
    for (const position of [...samplePositions, ...claySchedule[index].stops.flatMap(stop => [Math.max(0, stop - .001), stop])]) {
      assert.ok(visualBounds(clay, index, Math.round(position * (frameCount(dur) - 1))));
    }
  }
});

test('every clay process label stays outside the miniature artwork', () => {
  const canvas = createCanvas(960, 540), ctx = canvas.getContext('2d');
  const scenes = clay.createScenes(ctx, createCanvasKit(ctx));
  const drawImage = ctx.drawImage.bind(ctx), fillText = ctx.fillText.bind(ctx);
  let artwork, labels;
  ctx.drawImage = (...args) => {
    artwork = args.length === 9 ? args.slice(5) : args.slice(1);
    return drawImage(...args);
  };
  ctx.fillText = (value, x, y, ...rest) => {
    const metrics = ctx.measureText(value);
    labels.push({ value, top: y - metrics.actualBoundingBoxAscent, bottom: y + metrics.actualBoundingBoxDescent });
    return fillText(value, x, y, ...rest);
  };
  for (const index of claySchedule.keys()) {
    const { stops } = claySchedule[index];
    for (const [i, stop] of stops.entries()) {
      const t = ((stops[i - 1] ?? 0) + stop) / 2;
      artwork = null; labels = []; scenes[index].draw(t);
      assert.ok(artwork, 'miniature must be drawn');
      assert.ok(labels.length > 0, 'process labels must be drawn');
      const [, top, , height] = artwork;
      for (const label of labels) {
        assert.ok(label.bottom < top || label.top > top + height, `${label.value} overlaps the miniature`);
      }
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
  for (const index of claySchedule.keys()) {
    paintFrame(canvas, clay, index, 90); const first = canvas.toBuffer('image/png');
    paintFrame(canvas, clay, index, 15);
    paintFrame(canvas, clay, index, 90); assert.deepEqual(canvas.toBuffer('image/png'), first);
  }
});

test('ingredient, growth, preparation and assembly shots remain separate and progress forward', () => {
  assert.deepEqual(claySchedule[1].shots.map(s => s.asset), ['origin-farm', 'origin-wheat', 'origin-tomato', 'origin-lettuce', 'delivery']);
  assert.deepEqual(claySchedule[2].shots.map(s => s.asset), ['grow-cow', 'grow-wheat', 'grow-tomato', 'grow-lettuce', 'grow-sesame', 'grow-cheese']);
  assert.deepEqual(claySchedule[4].shots.map(s => s.asset), ['patty-mince', 'patty-shape', 'patty-grill']);
  assert.deepEqual(claySchedule[5].shots.map(s => s.asset), Array.from({ length: 6 }, (_, i) => `stack-${i}`));
  const canvas = createCanvas(960, 540), ctx = canvas.getContext('2d');
  const scenes = clay.createScenes(ctx, createCanvasKit(ctx));
  for (const [index, scene] of scenes.entries()) {
    const visited = new Map(); let previousStep = 0;
    for (let frame = 0; frame < scene.dur * 30; frame++) {
      const current = clayShotAt(index, frame / (scene.dur * 30), scene.dur);
      assert.ok(current.step >= previousStep, 'shots must not rewind');
      previousStep = current.step;
      if (!visited.has(current.asset)) visited.set(current.asset, new Set());
      visited.get(current.asset).add(current.pose);
    }
    assert.deepEqual([...visited.keys()], claySchedule[index].shots.map(s => s.asset));
    for (const s of claySchedule[index].shots) assert.equal(visited.get(s.asset).size, s.poses, `${s.asset}: every pose reachable`);
    assert.equal(clayShotAt(index, 1, scene.dur).asset, claySchedule[index].shots.at(-1).asset);
  }
});
