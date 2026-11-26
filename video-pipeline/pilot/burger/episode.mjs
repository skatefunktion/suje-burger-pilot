import { createBurgerScenes } from './scenes.mjs';

export const episode = {
  id: 'burger',
  createScenes: createBurgerScenes,
  sources: Array(8).fill(new URL('./scenes.mjs', import.meta.url)),
  // The original HTML puts captions outside the canvas. In the stitched
  // render, fit the pilot artwork above the on-canvas caption band instead.
  viewport: { x: 86.4, y: 4, scale: 0.82 },
};
