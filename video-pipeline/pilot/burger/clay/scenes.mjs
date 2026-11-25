import { createBurgerScenes } from '../scenes.mjs';

// Original, code-sculpted miniature sets, not photographs or generated AI images.
// Load once at the module boundary; every draw(t) remains synchronous/deterministic.
const sets = ['bun-mix', 'bun-proof', 'bun-bake', 'patty-mince', 'patty-shape', 'patty-grill'];
const load = typeof document === 'undefined'
  ? async url => (await import('@napi-rs/canvas')).loadImage(decodeURIComponent(url.pathname))
  : async url => { const image = new Image(); image.src = url.href; await image.decode(); return image; };
const images = Object.fromEntries(await Promise.all(sets.map(async name => [name,
  await Promise.all(Array.from({ length: 4 }, (_, pose) => load(new URL(`./assets/${name}-${pose}.png`, import.meta.url)))),
])));

export function createClayBurgerScenes(ctx, kit) {
  const originals = createBurgerScenes(ctx, kit);
  const stages = {
    bun: [['반죽', '우리밀에 물을 더해 반죽'], ['발효', '반죽이 부풀어 오르는 시간'], ['굽기', '오븐에서 노릇하게']],
    patty: [['다지기', '고기를 고르게 다져요'], ['빚기', '둥글고 납작하게 모양 잡기'], ['굽기', '뜨거운 철판에 올려요']],
  };
  function text(value, x, y, size, color = '#2E2921', align = 'left', weight = 700) {
    ctx.font = `${weight} ${size}px "Noto Sans KR","Apple SD Gothic Neo",sans-serif`;
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(value, x, y);
  }
  function draw(kind, t) {
    ctx.save();
    const names = kind === 'bun' ? sets.slice(0, 3) : sets.slice(3);
    // Twelve held exposures per second, no wall clock or per-frame random texture.
    const exposure = Math.max(0, Math.min(83, Math.floor(t * 7 * 12)));
    const step = Math.min(2, Math.floor(exposure / 28));
    const local = exposure % 28;
    const pose = kind === 'bun' && step === 1 ? Math.min(3, Math.floor(local / 7)) : [0, 1, 2, 3, 2, 1][local % 6];
    ctx.fillStyle = '#F4F2EB'; kit.rr(18, 18, 924, 444, 26); ctx.fill();
    ctx.fillStyle = '#315947'; kit.rr(42, 38, 49, 31, 15); ctx.fill();
    text(kind === 'bun' ? '03' : '04', 66, 54, 15, '#FFFDF7', 'center');
    text(kind === 'bun' ? '번을 만들어요' : '패티를 만들어요', 108, 54, 30);
    text(kind === 'bun' ? '우리밀 100%' : '한우', 915, 54, 16, '#685C4E', 'right', 500);
    // One full-width miniature workbench, not three illustrated UI cards.
    ctx.drawImage(images[names[step]][pose], 28, 84, 904, 362);
    // Process labels live outside the miniature, above the original caption band.
    ctx.fillStyle = '#FFFDF7'; kit.rr(38, 394, 884, 55, 18); ctx.fill();
    for (const [i, [name]] of stages[kind].entries()) {
      const x = 73 + i * 292, active = i === step;
      ctx.beginPath(); ctx.arc(x, 421, 15, 0, Math.PI * 2);
      ctx.fillStyle = active ? '#E7A136' : '#E8E0D4'; ctx.fill();
      text(String(i + 1), x, 421, 16, active ? '#FFFDF7' : '#685C4E', 'center');
      text(name, x + 26, 421, 21, active ? '#2E2921' : '#81796E');
      if (active) text(stages[kind][i][1], 891, 370, 17, '#685C4E', 'right', 500);
    }
    ctx.restore();
  }
  return originals.map((scene, index) => index === 3 ? { ...scene, draw: t => draw('bun', t) }
    : index === 4 ? { ...scene, draw: t => draw('patty', t) } : scene);
}

export const episode = {
  id: 'burger-clay-study', createScenes: createClayBurgerScenes,
  sources: Array(8).fill(new URL('./scenes.mjs', import.meta.url)),
};
