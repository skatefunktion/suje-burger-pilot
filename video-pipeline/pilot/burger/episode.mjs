import { createBurgerScenes } from './scenes.mjs';

export const episode = {
  id: 'burger',
  createScenes: createBurgerScenes,
  sources: Array(8).fill(new URL('./scenes.mjs', import.meta.url)),
};
