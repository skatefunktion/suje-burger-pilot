// Node-only presentation for the owner's original full-canvas pilot format.
// The comparison page deliberately retains its separate review-card layout.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { createBurgerScenes } from '../scenes.mjs';
import { clayImages, claySchedule, clayShotAt } from './scenes.mjs';

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
    if (index === 5 || index === 6) ctx.drawImage(image, 0, 86, 960, 384);
    else if (index === 0 || index === 7) ctx.drawImage(image, 30, 116, 900, 360);
    else ctx.drawImage(image, 60, 140, 840, 336);
    const title = (value, x, y, size = 34, color = kit.INK) => {
      ctx.font = `800 ${size}px "Noto Sans KR", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = color; ctx.fillText(value, x, y);
    };
    if (index === 0 || index === 7) {
      title(index === 7 ? scene.cap : claySchedule[index].title, 480, 88, index === 0 ? 44 : 40);
    } else if (index === 3 || index === 4) {
      title(index === 3 ? '번' : '패티', 210, 70);
      kit.pill(index === 3 ? '우리밀 100%' : '한우 100%', 760, 70, kit.BUN, kit.INK, 22);
      title(current.label, 480, 120, 24, '#8a7a63');
    } else if (index !== 5 && index !== 6) {
      title(claySchedule[index].title, 480, 54, 34);
      title(current.label, 480, 106, 24, '#8a7a63');
    }
  } }));
}

export const episode = {
  id: 'burger-clay-original-format', createScenes: createOriginalFormatScenes,
  sources: Array(8).fill(new URL('./original-format.mjs', import.meta.url)),
};
