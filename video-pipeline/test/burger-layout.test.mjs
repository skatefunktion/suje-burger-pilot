import assert from 'node:assert/strict';
import test from 'node:test';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { episode } from '../pilot/burger/episode.mjs';
import { createCanvasKit } from '../scenes/canvas-kit.mjs';
import { HEIGHT, WIDTH, frameCount, visualBounds } from '../queue/frames.mjs';

GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'Noto Sans KR');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 'Noto Sans KR');

test('ingredient cards stay inside the standalone canvas throughout their bounce', () => {
  const ctx = createCanvas(1, 1).getContext('2d');
  const count = frameCount(episode.createScenes(ctx, createCanvasKit(ctx))[1].dur);
  const standalone = { ...episode, viewport: undefined };
  for (let frame = 0; frame < count; frame++) visualBounds(standalone, 1, frame, { captionY: HEIGHT });
});

test('timeline stages end before the zero-axis line and durations fit inside the canvas', () => {
  const ctx = createCanvas(WIDTH, HEIGHT).getContext('2d');
  const text = [];
  const fillText = ctx.fillText.bind(ctx);
  ctx.fillText = (label, x, y, limit = Infinity) => {
    text.push({ label, x, width: Math.min(ctx.measureText(label).width, limit) });
    fillText(label, x, y);
  };
  episode.createScenes(ctx, createCanvasKit(ctx))[2].draw(1);
  const stages = text.filter(({ label }) => label.includes('→'));
  const axis = text.find(({ label }) => label === '지금');
  assert.equal(stages.length, 6);
  for (const { label, x, width } of stages) assert.ok(x + width <= axis.x - 12, label);
  const durations = text.filter(({ label }) => /^(단 며칠!|\d+개월)$/.test(label) && label !== '10개월' && label !== '20개월');
  for (const { label, x, width } of durations) assert.ok(x + width < WIDTH, label);
});

test('visible stacking badges remain separate at every animation frame', () => {
  const ctx = createCanvas(WIDTH, HEIGHT).getContext('2d');
  const kit = createCanvasKit(ctx);
  const badges = [];
  kit.numBadge = (step, x, y) => badges.push({ step, x, y });
  const scene = episode.createScenes(ctx, kit)[5];
  const count = frameCount(scene.dur);
  for (let frame = 0; frame < count; frame++) {
    badges.length = 0;
    scene.draw(frame / count);
    for (const [i, badge] of badges.entries()) {
      for (const other of badges.slice(i + 1)) {
        assert.ok(Math.hypot(badge.x - other.x, badge.y - other.y) >= 34,
          `badges ${badge.step} and ${other.step} overlap at frame ${frame}`);
      }
    }
  }
  assert.equal(badges.length, 6);
});
