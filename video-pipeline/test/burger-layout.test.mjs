import assert from 'node:assert/strict';
import test from 'node:test';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { episode } from '../pilot/burger/episode.mjs';
import { createCanvasKit } from '../scenes/canvas-kit.mjs';
import { HEIGHT, WIDTH, frameCount, samplePositions, visualBounds } from '../queue/frames.mjs';

GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'Noto Sans KR');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 'Noto Sans KR');

test('the finishing shot keeps the bulgogi glaze on the patty and sesame on the bun', () => {
  const ctx = createCanvas(WIDTH, HEIGHT).getContext('2d');
  episode.createScenes(ctx, createCanvasKit(ctx))[7].draw(1);
  const { data } = ctx.getImageData(535, 175, 320, 120);
  let glaze = 0, sesame = 0;
  for (let i = 0; i < data.length; i += 4) {
    const y = 175 + Math.floor(i / (320 * 4));
    const rgb = data.slice(i, i + 3).join(',');
    if (rgb === '169,78,42') {
      assert.ok(y >= 265 && y <= 290, `glaze outside patty at y=${y}`);
      glaze++;
    }
    if (y < 250 && rgb === '255,253,247') sesame++;
    assert.ok(y >= 265 || rgb !== '135,70,47', `sauce above patty at y=${y}`);
  }
  assert.ok(glaze > 200 && sesame > 20);
});

test('the polished illustrations use the same caption-safe geometry in both renders', () => {
  const ctx = createCanvas(1, 1).getContext('2d');
  const scenes = episode.createScenes(ctx, createCanvasKit(ctx));
  assert.equal(episode.viewport, undefined);
  assert.deepEqual(scenes.map(scene => scene.dur), [4, 8, 10, 7, 7, 9, 7, 5]);
  for (const [i, scene] of scenes.entries()) {
    for (const position of samplePositions) {
      const frame = Math.round(position * (frameCount(scene.dur) - 1));
      assert.ok(visualBounds(episode, i, frame), `scene ${i + 1}, frame ${frame}`);
    }
  }
});

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
