import { createBurgerScenes } from '../scenes.mjs';

// Ingredient cuts follow PR 14; captions and durations stay canonical.
const shot = (asset, label, detail, poses = 2, progressive = false) => ({ asset, label, detail, poses, progressive });
export const claySchedule = [
  { title: '수제버거가 만들어지는 과정', stops: [1], shots: [shot('title', '수제버거', '농장에서 식탁까지, 클레이로 만나요')] },
  { title: '재료는 어디서 왔을까?', stops: [.18, .36, .53, .70, 1], shots: [
    shot('origin-farm', '한우 농장', '먹이를 먹으며 자라는 한우'),
    shot('origin-wheat', '우리밀 밭', '들판에서 자라는 우리밀'),
    shot('origin-tomato', '토마토 농장', '빨갛게 익어가는 토마토'),
    shot('origin-lettuce', '양상추 농장', '한 겹 한 겹 자라는 잎'),
    shot('delivery', '서울 버거집', '식재료를 싣고 서울 버거집으로', 4, true),
  ] },
  { title: '자라는 데 걸리는 시간', stops: [.20, .39, .56, .73, .88, 1], shots: [
    shot('grow-cow', '한우 · 30개월', '송아지가 자라 한우가 돼요', 4, true),
    shot('grow-wheat', '밀 · 7개월', '새싹에서 이삭, 그리고 수확', 4, true),
    shot('grow-tomato', '토마토 · 3개월', '모종에서 열매, 그리고 수확', 4, true),
    shot('grow-lettuce', '양상추 · 2개월', '잎이 자라면 수확해요', 4, true),
    shot('grow-sesame', '참깨 · 3개월', '꼬투리 속 참깨를 수확해요', 4, true),
    shot('grow-cheese', '치즈 · 단 며칠!', '우유가 응고되어 치즈가 돼요', 4, true),
  ] },
  { title: '번을 만들어요', stops: [1 / 3, 2 / 3, 1], shots: [
    shot('bun-mix', '반죽', '우리밀에 물을 더해 반죽', 4),
    shot('bun-proof', '발효', '반죽이 부풀어 오르는 시간', 4, true),
    shot('bun-bake', '굽기', '오븐에서 노릇하게', 4),
  ] },
  { title: '패티를 만들어요', stops: [1 / 3, 2 / 3, 1], shots: [
    shot('patty-mince', '다지기', '고기를 고르게 다져요', 4),
    shot('patty-shape', '빚기', '고기 결을 살려 둥글게 빚어요', 4),
    shot('patty-grill', '굽기', '뜨거운 철판에 노릇하게 구워요', 4),
  ] },
  { title: '차곡차곡 쌓아요', stops: [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1], shots: [
    shot('stack-0', '아래 번', '번 사이에 재료를 순서대로'),
    shot('stack-1', '양상추', '아삭한 양상추를 올려요'),
    shot('stack-2', '토마토', '도톰한 토마토를 올려요'),
    shot('stack-3', '치즈', '노란 치즈를 얹어요'),
    shot('stack-4', '패티', '고기 결이 살아있는 구운 패티'),
    shot('stack-5', '위 번', '노릇한 번으로 덮어요'),
  ] },
  { title: '한국식 한 끗', stops: [.54, 1], shots: [
    shot('sauce-pour', '특제 불고기 소스', '진한 소스를 패티에 뿌려요', 4, true),
    shot('sesame-sprinkle', '깨 솔솔', '고소한 깨로 마무리해요', 4, true),
  ] },
  { title: '완성! 맛있게 드세요', stops: [1], shots: [shot('finished', '수제버거 완성', '한 겹 한 겹, 정성이 모였어요')] },
];

const assets = [...new Map(claySchedule.flatMap(scene => scene.shots).map(s => [s.asset, s])).values()];
const load = typeof document === 'undefined'
  ? async url => (await import('@napi-rs/canvas')).loadImage(decodeURIComponent(url.pathname))
  : async url => { const image = new Image(); image.src = url.href; await image.decode(); return image; };
const images = Object.fromEntries(await Promise.all(assets.map(async ({ asset, poses }) => [asset,
  await Promise.all(Array.from({ length: poses }, (_, pose) => load(new URL(`./assets/${asset}-${pose}.png`, import.meta.url)))),
])));

export function clayShotAt(index, t, dur) {
  const config = claySchedule[index];
  const exposure = Math.max(0, Math.min(Math.ceil(dur * 12) - 1, Math.floor(Math.max(0, Math.min(1, t)) * dur * 12 + 1e-8)));
  const held = exposure / (dur * 12);
  const found = config.stops.findIndex(stop => held < stop);
  const step = found < 0 ? config.stops.length - 1 : found;
  const start = config.stops[step - 1] ?? 0, end = config.stops[step];
  const s = config.shots[step], local = Math.max(0, Math.min(.999999, (held - start) / (end - start)));
  const pose = s.progressive ? Math.min(s.poses - 1, Math.floor(local * s.poses))
    : s.poses === 4 ? [0, 1, 2, 3, 2, 1][exposure % 6] : exposure % s.poses;
  return { ...s, step, pose, exposure };
}

export function createClayBurgerScenes(ctx, kit) {
  const originals = createBurgerScenes(ctx, kit);
  function text(value, x, y, size, color = '#2E2921', align = 'left', weight = 700) {
    ctx.font = `${weight} ${size}px "Noto Sans KR","Apple SD Gothic Neo",sans-serif`;
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(value, x, y);
  }
  return originals.map((scene, index) => ({ ...scene, draw(t) {
    const config = claySchedule[index], current = clayShotAt(index, t, scene.dur);
    ctx.save();
    ctx.fillStyle = '#F4F2EB'; kit.rr(18, 18, 924, 444, 26); ctx.fill();
    ctx.fillStyle = '#315947'; kit.rr(42, 38, 49, 31, 15); ctx.fill();
    text(String(index + 1).padStart(2, '0'), 66, 54, 15, '#FFFDF7', 'center');
    text(config.title, 108, 54, index === 0 ? 27 : 30);
    text(`${index + 1} / 8`, 915, 54, 16, '#685C4E', 'right', 500);
    const image = images[current.asset][current.pose];
    // Preserve the whole miniature, including barn roofs and falling sesame.
    // Both source sizes and this destination have the same 2.5:1 aspect ratio.
    ctx.drawImage(image, 0, 0, image.width, image.height, 95, 80, 770, 308);
    ctx.fillStyle = '#FFFDF7'; kit.rr(38, 394, 884, 62, 18); ctx.fill();
    text(current.label, 58, 414, 22);
    text(current.detail, 58, 442, 18, '#685C4E', 'left', 500);
    const count = config.shots.length, width = Math.min(170, 250 / count), gap = 7;
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = i <= current.step ? '#E7A136' : '#E8E0D4';
      kit.rr(902 - count * (width + gap) + i * (width + gap), 413, width, 6, 3); ctx.fill();
    }
    ctx.restore();
  } }));
}

export const episode = {
  id: 'burger-clay', createScenes: createClayBurgerScenes,
  sources: Array(8).fill(new URL('./scenes.mjs', import.meta.url)),
};
