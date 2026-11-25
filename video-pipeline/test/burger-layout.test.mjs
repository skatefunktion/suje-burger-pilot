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

test('each growth close-up keeps its duration separate from the ingredient and stage labels', () => {
  const ctx = createCanvas(WIDTH, HEIGHT).getContext('2d');
  const text = [];
  const fillText = ctx.fillText.bind(ctx);
  ctx.fillText = (label, x, y, limit = Infinity) => {
    const width = Math.min(ctx.measureText(label).width, limit);
    const left = ctx.textAlign === 'center' ? x - width / 2 : ctx.textAlign === 'right' ? x - width : x;
    text.push({ label, x, y, left, right: left + width });
    fillText(label, x, y);
  };
  const scene = episode.createScenes(ctx, createCanvasKit(ctx))[2];
  for (const [progress, name, duration] of [
    [.10, '한우', '30개월'], [.30, '밀', '7개월'], [.47, '토마토', '3개월'],
    [.65, '양상추', '2개월'], [.80, '참깨', '3개월'], [.95, '치즈', '단 며칠!'],
  ]) {
    text.length = 0;
    scene.draw(progress);
    const durations = text.filter(({ label }) => /^(단 며칠!|\d+개월)$/.test(label));
    assert.deepEqual(durations.map(({ label }) => label), [duration]);
    assert.ok(text.some(({ label }) => label === name));
    for (const duration of durations) {
      assert.ok(duration.left > 48 && duration.right < 912, duration.label);
      for (const other of text) {
        if (other === duration || Math.abs(other.y - duration.y) > 20) continue;
        assert.ok(other.right <= duration.left || other.left >= duration.right,
          `${other.label} overlaps ${duration.label}`);
      }
    }
  }
});

test('harvest moves the same ripe tomatoes, wheat heads, and sesame pods into the basket', () => {
  const ctx = createCanvas(WIDTH, HEIGHT).getContext('2d');
  const scene = episode.createScenes(ctx, createCanvasKit(ctx))[2];
  const ellipse = ctx.ellipse.bind(ctx);
  const crops = [];
  let fill;
  ctx.ellipse = (x, ...args) => {
    if (ctx.fillStyle.toLowerCase() === fill) crops.push(x);
    ellipse(x, ...args);
  };
  for (const [start, stop, color, count] of [
    [.20, .39, '#f4c853', 18], [.39, .56, '#cb5944', 9], [.73, .88, '#be753b', 18],
  ]) {
    fill = color;
    let plantEdge;
    for (const p of [.66, .79, .96]) {
      crops.length = 0;
      scene.draw(start + (stop - start) * p);
      assert.equal(crops.length, count, `crop count for ${color} at ${p}`);
      if (p === .66) plantEdge = Math.max(...crops);
      else assert.ok(Math.max(...crops) > plantEdge + 15, `crop should move right at ${p}`);
    }
  }
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
