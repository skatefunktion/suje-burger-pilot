import { createCanvas } from '@napi-rs/canvas';
import { createCanvasKit } from '../scenes/canvas-kit.mjs';

export const WIDTH = 960, HEIGHT = 540, FPS = 30, CAPTION_Y = 480;
export const samplePositions = [0, .1, .25, .5, .75, .9, 1];

export class SceneError extends Error {
  constructor(kind, frame, message, cause) {
    super(message, { cause });
    this.kind = kind;
    this.frame = frame;
  }
}

export function frameCount(dur) {
  const count = dur * FPS;
  if (!Number.isSafeInteger(count) || count <= 0) {
    throw new Error(`Duration ${dur} is not a positive multiple of 1/${FPS}s`);
  }
  return count;
}

export function paintFrame(canvas, episode, index, frame, { guard = 0, fallback = false } = {}) {
  const ctx = canvas.getContext('2d');
  ctx.reset();
  ctx.translate(guard, guard);
  const kit = createCanvasKit(ctx);
  const scene = episode.createScenes(ctx, kit)[index];
  const count = frameCount(scene.dur);
  if (!guard) kit.bg();

  if (!fallback) {
    if (episode.viewport) {
      const { x, y, scale } = episode.viewport;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
    }
    try {
      scene.draw(frame / count);
    } catch (cause) {
      throw new SceneError('draw', frame, cause.message ?? String(cause), cause);
    }
  }

  if (guard) return;
  ctx.resetTransform();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (fallback) {
    kit.label('장면 렌더링 실패', WIDTH / 2, 200, 42);
    kit.label('대체 화면 · 검수 필요', WIDTH / 2, 268, 30);
  }
  ctx.fillStyle = kit.INK;
  ctx.fillRect(0, CAPTION_Y, WIDTH, HEIGHT - CAPTION_Y);
  ctx.font = `700 ${kit.TYPE.caption}px "Noto Sans KR", sans-serif`;
  if (ctx.measureText(scene.cap).width > WIDTH - 48) {
    throw new SceneError('visual', frame, 'Caption is too wide for the safe area');
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = kit.PAPER;
  ctx.fillText(scene.cap, WIDTH / 2, (HEIGHT + CAPTION_Y) / 2);
}

export function visualBounds(episode, index, frame) {
  const guard = 64, width = WIDTH + guard * 2;
  const canvas = createCanvas(width, HEIGHT + guard * 2);
  paintFrame(canvas, episode, index, frame, { guard });
  const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  let visible = false;
  for (let offset = 3; offset < data.length; offset += 4) {
    if (data[offset] < 8) continue;
    const pixel = (offset - 3) / 4;
    const x = pixel % width - guard, y = Math.floor(pixel / width) - guard;
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
      throw new SceneError('visual', frame, `Artwork extends outside the canvas at (${x}, ${y})`);
    }
    if (y >= CAPTION_Y) {
      throw new SceneError('visual', frame, `Artwork enters the caption band at (${x}, ${y})`);
    }
    visible = true;
  }
  return visible;
}

export function assertNotBlank(data, frame) {
  for (let i = 4; i < data.length; i += 4) {
    if (data[i] !== data[0] || data[i + 1] !== data[1] || data[i + 2] !== data[2] ||
        data[i + 3] !== data[3]) return;
  }
  throw new SceneError('blank', frame, 'Sampled pixels are all one color');
}
