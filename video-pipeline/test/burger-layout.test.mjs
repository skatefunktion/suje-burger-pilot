import assert from 'node:assert/strict';
import test from 'node:test';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { episode } from '../pilot/burger/episode.mjs';
import { createCanvasKit } from '../scenes/canvas-kit.mjs';
import { HEIGHT, WIDTH, frameCount, samplePositions, visualBounds } from '../queue/frames.mjs';

GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'Noto Sans KR');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 'Noto Sans KR');

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

test('growth vignettes keep all six durations separate from the ingredient and stage labels', () => {
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
  for (const progress of [0, .5, 1]) {
    text.length = 0;
    scene.draw(progress);
    const durations = text.filter(({ label }) => /^(단 며칠!|\d+개월)$/.test(label));
    assert.deepEqual(durations.map(({ label }) => label), ['30개월', '7개월', '3개월', '2개월', '3개월', '단 며칠!']);
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
