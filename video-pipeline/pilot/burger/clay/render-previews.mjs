import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { paintFrame, frameCount } from '../../../queue/frames.mjs';
import { episode as flat } from '../episode.mjs';
import { episode as clay, claySchedule } from './scenes.mjs';
import { createCanvasKit } from '../../../scenes/canvas-kit.mjs';

for (const weight of ['Regular', 'Bold']) {
  if (!GlobalFonts.registerFromPath(`/usr/share/fonts/opentype/noto/NotoSansCJK-${weight}.ttc`, 'Noto Sans KR')) {
    throw new Error('Install fonts-noto-cjk before rendering the comparison');
  }
}
const output = resolve(process.argv[2] ?? new URL('../../../out/clay-study/', import.meta.url).pathname);
await mkdir(output, { recursive: true });
const canvas = createCanvas(960, 540);
const scenes = clay.createScenes(canvas.getContext('2d'), createCanvasKit(canvas.getContext('2d')));
const sheet = createCanvas(1968, 1232), ctx = sheet.getContext('2d');
ctx.fillStyle = '#EDE7DD'; ctx.fillRect(0, 0, sheet.width, sheet.height);
ctx.font = '700 26px "Noto Sans KR", sans-serif'; ctx.fillStyle = '#2E2921';
ctx.fillText('기존 · 플랫', 16, 42); ctx.fillText('시안 · 플레이도우 클레이메이션', 992, 42);
const manifest = [];
const processSheet = createCanvas(1968, 832), processCtx = processSheet.getContext('2d');
processCtx.fillStyle = '#EDE7DD'; processCtx.fillRect(0, 0, 1968, 832);
processCtx.font = '700 26px "Noto Sans KR", sans-serif'; processCtx.fillStyle = '#2E2921';
processCtx.fillText('플레이도우 클레이메이션 시안 · 번 / 패티', 16, 38);
for (const [row, [index, name]] of [[3, 'bun'], [4, 'patty']].entries()) {
  for (const position of [0, .18, .5, .65, .86, 1]) {
    // paintFrame uses fixed 30fps scene-local stepping; t=1 is the final real frame.
    const frame = Math.round(position * (frameCount(scenes[index].dur) - 1));
    for (const [column, [style, episode]] of [['flat', flat], ['clay', clay]].entries()) {
      paintFrame(canvas, episode, index, frame);
      const filename = `${style}-${name}-${String(frame).padStart(3, '0')}.png`;
      await writeFile(join(output, filename), await canvas.encode('png'));
      manifest.push({ scene: index + 1, style, frame, file: filename });
      if (style === 'clay' && [.18, .5, .86].includes(position)) {
        const step = [.18, .5, .86].indexOf(position);
        processCtx.drawImage(canvas, 16 + step * 650, 56 + row * 380, 640, 360);
      }
      if (position === .86) {
        ctx.drawImage(canvas, 16 + column * 976, 64 + row * 584);
        if (style === 'clay') await writeFile(join(output, `clay-${name}.png`), await canvas.encode('png'));
      }
    }
  }
}
ctx.font = '500 20px "Noto Sans KR", sans-serif'; ctx.fillStyle = '#685C4E';
ctx.fillText('960 × 540 · 전체 8장면 클레이 · 57초 타이밍 / 자막 / 내레이션 원고 유지 · 미병합 시안', 16, 1212);
await writeFile(join(output, 'flat-vs-clay.png'), await sheet.encode('png'));
await writeFile(join(output, 'claymation-process.png'), await processSheet.encode('png'));
const overview = createCanvas(1312, 1584), overviewCtx = overview.getContext('2d');
overviewCtx.fillStyle = '#EDE7DD'; overviewCtx.fillRect(0, 0, overview.width, overview.height);
overviewCtx.font = '700 27px "Noto Sans KR", sans-serif'; overviewCtx.fillStyle = '#2E2921';
overviewCtx.fillText('수제버거 · 전체 8장면 클레이 · 지문 없는 무광 찰흙', 16, 38);
for (let index = 0; index < 8; index++) {
  const frame = Math.round((frameCount(scenes[index].dur) - 1) * (index === 5 ? .95 : .83));
  paintFrame(canvas, clay, index, frame);
  await writeFile(join(output, `clay-scene-${index + 1}.png`), await canvas.encode('png'));
  overviewCtx.drawImage(canvas, 16 + index % 2 * 648, 56 + Math.floor(index / 2) * 380, 640, 360);
}
await writeFile(join(output, 'clay-all-eight.png'), await overview.encode('png'));
for (const [name, indexes] of [['ingredients', [1, 2]], ['assembly', [5, 6]]]) {
  const shots = indexes.flatMap(index => claySchedule[index].stops.map((stop, step, stops) => ({
    index, position: (stops[step - 1] ?? 0) + (stop - (stops[step - 1] ?? 0)) * .83,
  })));
  const contact = createCanvas(1968, 56 + Math.ceil(shots.length / 3) * 380), contactCtx = contact.getContext('2d');
  contactCtx.fillStyle = '#EDE7DD'; contactCtx.fillRect(0, 0, contact.width, contact.height);
  contactCtx.font = '700 26px "Noto Sans KR", sans-serif'; contactCtx.fillStyle = '#2E2921';
  contactCtx.fillText(name === 'ingredients' ? '재료별 농장 · 배송 · 성장과 수확' : '재료 쌓기 · 불고기 소스 · 깨', 16, 38);
  for (const [i, { index, position }] of shots.entries()) {
    paintFrame(canvas, clay, index, Math.round(position * (frameCount(scenes[index].dur) - 1)));
    contactCtx.drawImage(canvas, 16 + i % 3 * 650, 56 + Math.floor(i / 3) * 380, 640, 360);
  }
  await writeFile(join(output, `clay-${name}.png`), await contact.encode('png'));
}
await writeFile(join(output, 'frames.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(output);
