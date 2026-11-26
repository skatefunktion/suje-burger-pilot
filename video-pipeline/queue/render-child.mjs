import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { createCanvasKit } from '../scenes/canvas-kit.mjs';
import { WIDTH, HEIGHT, CAPTION_Y, frameCount, samplePositions, paintFrame,
  assertNotBlank, visualBounds, SceneError } from './frames.mjs';

const [episodeURL, indexArg, mode, path] = process.argv.slice(2);
const index = Number(indexArg);
const fallback = mode === 'fallback';
try {
  for (const variation of ['Regular', 'Bold']) {
    if (!GlobalFonts.registerFromPath(`/usr/share/fonts/opentype/noto/NotoSansCJK-${variation}.ttc`, 'Noto Sans KR')) {
      throw new Error('Install fonts-noto-cjk to render Korean text');
    }
  }
  if (!GlobalFonts.registerFromPath('/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf')) {
    throw new Error('Install fonts-noto-color-emoji to render emoji');
  }
  const { episode } = await import(episodeURL);
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const scene = episode.createScenes(ctx, createCanvasKit(ctx))[index];
  const count = frameCount(scene.dur);
  const samples = [...new Set(samplePositions.map(p => Math.round(p * (count - 1))))];
  let hasArtwork = false;
  if (!fallback) {
    for (const frame of samples) {
      paintFrame(canvas, episode, index, frame);
      await writeFile(join(path, `frame-${String(frame).padStart(4, '0')}.png`), await canvas.encode('png'));
      hasArtwork = visualBounds(episode, index, frame) || hasArtwork;
    }
    if (!hasArtwork) throw new SceneError('blank', 0, 'All visual samples have no foreground artwork');
  }
  if (mode !== 'review') {
    const sampledCanvas = createCanvas(12, 6);
    const sampled = sampledCanvas.getContext('2d');
    for (let frame = 0; frame < count; frame++) {
      paintFrame(canvas, episode, index, frame, { fallback });
      sampled.clearRect(0, 0, 12, 6);
      sampled.drawImage(canvas, 0, 0, WIDTH, CAPTION_Y, 0, 0, 12, 6);
      try {
        assertNotBlank(sampled.getImageData(0, 0, 12, 6).data, frame);
      } catch (error) {
        await writeFile(join(path, `blank-${frame}.png`), await canvas.encode('png'));
        throw error;
      }
      const { data } = ctx.getImageData(0, 0, WIDTH, HEIGHT);
      if (!process.stdout.write(data)) await once(process.stdout, 'drain');
    }
  }
  process.send({ ok: true });
} catch (error) {
  process.send({ ok: false, kind: error.kind ?? 'render', frame: error.frame ?? 0,
    message: error.message, stack: error.cause?.stack ?? error.stack });
  process.exitCode = 1;
}
