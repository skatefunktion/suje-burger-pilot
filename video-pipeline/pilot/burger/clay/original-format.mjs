// Node-only presentation based on the owner's confirmed Kevin Ngo reference.
// The comparison page deliberately retains its separate review-card layout.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { createBurgerScenes } from '../scenes.mjs';
import { createCanvasKit } from '../../../scenes/canvas-kit.mjs';
import { frameCount } from '../../../queue/frames.mjs';
import { clayImages, clayShotAt } from './scenes.mjs';

// Values come from the Korean pilot's storyboard, not the California film.
// Unspecified preparation/delivery durations stay verbal: never invent hours.
const productionTimes = {
  farm: '한우 · 약 30개월', cow: '한우 · 약 30개월',
  wheat: '우리밀 · 약 7개월', tomato: '토마토 · 약 3개월',
  lettuce: '양상추 · 약 2개월', sesame: '참깨 · 약 3개월', cheese: '치즈 · 며칠',
};

export function referenceTimeLabel(index, current) {
  const ingredient = current.asset.replace(/^(origin|grow)-/, '');
  if (productionTimes[ingredient]) return productionTimes[ingredient];
  if (index === 0) return '농장에서 식탁까지';
  if (index === 1) return '조리하기 전 · 서울로';
  if (index === 3) return `조리할 때 · 번 ${current.label}`;
  if (index === 4) return `조리할 때 · 패티 ${current.label}`;
  if (index === 5) return `차곡차곡 쌓는 시간 · ${current.label}`;
  if (index === 6) return `완성 직전 · ${current.label}`;
  return '드디어 완성';
}

async function removeStudioBackdrop(image, asset, pose) {
  const matte = await loadImage(new URL(`./assets/mattes/${asset}-${pose}.png`, import.meta.url).pathname);
  if (matte.width !== image.width || matte.height !== image.height) {
    throw new Error(`Matte dimensions do not match ${asset}-${pose}`);
  }
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  // Exact geometry mattes, not color keying: cream food, flour jars and pale
  // oven details keep their surfaces, original lighting and meat textures.
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(matte, 0, 0);
  return canvas;
}

const cutouts = Object.fromEntries(await Promise.all(Object.entries(clayImages).map(async ([asset, poses]) =>
  [asset, await Promise.all(poses.map((image, pose) => removeStudioBackdrop(image, asset, pose)))])));

export function createOriginalFormatScenes(ctx, kit) {
  const originals = createBurgerScenes(ctx, kit);
  return originals.map((scene, index) => ({ ...scene, draw(t) {
    const current = clayShotAt(index, t, scene.dur);
    // Same held poses and shot timing as the approved clay version: do not
    // remove its stop-motion boil as part of a presentation-only correction.
    const image = cutouts[current.asset][current.pose];
    ctx.drawImage(image, 0, 130, 960, 384);

    // The reference uses a small red, underlined time marker above one line
    // of left-aligned narration. Preserve the Korean caption verbatim.
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '500 20px "Noto Sans KR", sans-serif';
    ctx.fillStyle = kit.TOMATO_D;
    const timeLabel = referenceTimeLabel(index, current);
    ctx.fillText(timeLabel, 40, 34);
    ctx.fillRect(40, 49, ctx.measureText(timeLabel).width, 1);
    ctx.font = '500 28px "Noto Sans KR", sans-serif';
    const size = Math.min(28, 28 * 880 / ctx.measureText(scene.cap).width);
    ctx.font = `500 ${size}px "Noto Sans KR", sans-serif`;
    ctx.fillStyle = kit.INK;
    ctx.fillText(scene.cap, 40, 84);
  } }));
}

// This review-only painter owns the top caption. The production queue and
// comparison player's bottom-caption contract deliberately remain untouched.
export function paintOriginalFormatFrame(canvas, index, frame) {
  const ctx = canvas.getContext('2d');
  ctx.reset();
  const kit = createCanvasKit(ctx);
  const scene = createOriginalFormatScenes(ctx, kit)[index];
  kit.bg();
  scene.draw(frame / frameCount(scene.dur));
}

export const episode = {
  id: 'burger-clay-original-format', createScenes: createOriginalFormatScenes,
  sources: Array(8).fill(new URL('./original-format.mjs', import.meta.url)),
};
