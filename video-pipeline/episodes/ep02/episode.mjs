import { script, title } from './script.mjs';
import { draw as draw1 } from '../../scenes/ep02/01.mjs';
import { draw as draw2 } from '../../scenes/ep02/02.mjs';
import { draw as draw3 } from '../../scenes/ep02/03.mjs';
import { draw as draw4 } from '../../scenes/ep02/04.mjs';
import { draw as draw5 } from '../../scenes/ep02/05.mjs';

export function createScenes(ctx, kit) {
  const draws = [draw1, draw2, draw3, draw4, draw5];
  const SCENES = script.map(({ dur, cap }, index) => ({
    dur, cap, draw: t => draws[index](t, ctx, kit),
  }));
  return SCENES;
}

export const episode = {
  id: 'ep02', title, createScenes,
  narration: script.map(scene => scene.narration),
  reviewSources: [new URL(import.meta.url), new URL('./script.mjs', import.meta.url)],
  sources: ['01', '02', '03', '04', '05'].map(id =>
    new URL(`../../scenes/ep02/${id}.mjs`, import.meta.url)),
};
