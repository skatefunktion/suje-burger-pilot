import { createBurgerScenes } from '../scenes.mjs';

// Opt-in art study: the canonical flat scenes and their metadata stay untouched.
export function createClayBurgerScenes(ctx, kit) {
  const scenes = createBurgerScenes(ctx, kit);
  const { seg, easeO, lerp, rnd, rr } = kit;
  const P = {
    paper: '#FFFDF7', cream: '#F4EADD', line: '#E5D8C7', ink: '#2E2921', muted: '#685C4E',
    green: '#315947', mint: '#D7EFCC', sky: '#D0EBF6', rose: '#FFE0EA', wheat: '#FFF0B7',
    dough: ['#FFE788', '#F9D344', '#DEAC2F'],
    bread: ['#FFD951', '#FFB523', '#DD861C'],
    teal: ['#48D2D2', '#1CB7C1', '#0A8D9E'],
    red: ['#FF92B7', '#F56A98', '#D84E83'],
    meat: ['#CB8D60', '#AE6E42', '#8C512E'],
    oven: ['#B6A0F4', '#9878E0', '#7757B8'],
    dark: ['#8CCBA1', '#5BB580', '#369565'],
    board: ['#FFC972', '#F3AC4F', '#DA8B35'],
    white: ['#FFFDF1', '#F4EEDF', '#E0D6BF'],
  };

  function oval(x, y, rx, ry, fill, angle = 0) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
  }
  function box(x, y, w, h, r, fill) {
    rr(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  }
  function text(value, x, y, size, fill = P.ink, align = 'center', weight = 700) {
    ctx.font = `${weight} ${size}px "Noto Sans KR","Apple SD Gothic Neo",sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = fill;
    ctx.fillText(value, x, y);
  }
  function line(points, color, width) {
    ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = ctx.lineJoin = 'round'; ctx.stroke();
  }
  function shadow(x, y, rx, ry, opacity = .22) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, `rgba(72,49,28,${opacity})`); g.addColorStop(1, 'rgba(72,49,28,0)');
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
    oval(0, 0, rx, rx, g); ctx.restore();
  }
  function gradient(x, y, w, h, colors) {
    const g = ctx.createLinearGradient(x, y, x + w * .65, y + h);
    colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
    return g;
  }
  // Fixed, smoothly joined control points: hand-molded edges without frame-to-frame noise.
  function blobPath(x, y, rx, ry, seed, amount = .035) {
    const points = Array.from({ length: 14 }, (_, i) => {
      const a = i * Math.PI * 2 / 14;
      const r = 1 + (rnd(seed + i * 7) - .5) * amount * 2;
      return [x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r];
    });
    ctx.beginPath();
    const last = points.at(-1), first = points[0];
    ctx.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
    points.forEach((p, i) => {
      const next = points[(i + 1) % points.length];
      ctx.quadraticCurveTo(...p, (p[0] + next[0]) / 2, (p[1] + next[1]) / 2);
    });
    ctx.closePath();
  }
  function texture(x, y, rx, ry, seed, count = 130) {
    // Paired light/dark pores, softly pressed into the matte surface.
    for (let i = 0; i < count; i++) {
      const px = x + (rnd(seed + i * 13) * 2 - 1) * rx;
      const py = y + (rnd(seed + 800 + i * 17) * 2 - 1) * ry;
      const r = .35 + rnd(seed + i * 19) * .85;
      oval(px, py, r, r * .65, 'rgba(69,41,23,.075)');
      oval(px, py + .8, r * .85, r * .45, 'rgba(255,255,239,.14)');
    }
  }
  function clayBlob(x, y, rx, ry, colors, seed = 2, amount = .035) {
    ctx.save();
    blobPath(x, y + 5, rx, ry, seed, amount);
    ctx.fillStyle = colors[2]; ctx.fill();
    blobPath(x, y, rx, ry, seed, amount);
    ctx.fillStyle = gradient(x - rx, y - ry, rx * 2, ry * 2, colors); ctx.fill();
    ctx.clip();
    texture(x, y, rx, ry, seed, Math.min(130, Math.round(rx * ry / 12)));
    ctx.strokeStyle = 'rgba(255,251,225,.23)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x - 2, y + 2, Math.max(.5, rx - 6), Math.max(.5, ry - 5), 0, Math.PI * 1.12, Math.PI * 1.78); ctx.stroke();
    ctx.restore();
  }
  function clayBox(x, y, w, h, r, colors) {
    box(x, y + 5, w, h, r, colors[2]);
    box(x, y, w, h, r, gradient(x, y, w, h, colors));
    ctx.save(); rr(x + 2, y + 2, w - 4, h - 4, Math.max(1, r - 1)); ctx.clip();
    texture(x + w / 2, y + h / 2, w / 2, h / 2, w + x, 100);
    ctx.restore();
  }
  function dent(x, y, rx, ry, angle = 0) {
    oval(x, y, rx, ry, 'rgba(104,64,37,.16)', angle);
    oval(x, y + 1.5, rx * .86, ry * .64, 'rgba(255,240,202,.27)', angle);
  }
  function fingerprints(x, y, rx, ry, angle = -.3) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    for (let j = 0; j < 5; j++) {
      ctx.beginPath(); ctx.ellipse(0, 0, rx + j * 3, ry + j * 2, 0, 3.6, 5.5);
      ctx.strokeStyle = 'rgba(109,68,35,.19)'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 1, rx + j * 3, ry + j * 2, 0, 3.6, 5.5);
      ctx.strokeStyle = 'rgba(255,249,205,.34)'; ctx.stroke();
    }
    ctx.restore();
  }
  function seed(x, y, angle) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    clayBlob(0, 0, 7, 3.6, P.white, 12, .10); ctx.restore();
  }
  function rope(points, width, colors) {
    // Extruded toy-dough coils: big rounded ends and visible joins, never meat fibers.
    const trace = (offset) => {
      ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1] + offset);
      points.slice(1).forEach((point, i) => {
        const next = points[i + 2] ?? point;
        ctx.quadraticCurveTo(point[0], point[1] + offset, (point[0] + next[0]) / 2, (point[1] + next[1]) / 2 + offset);
      });
    };
    ctx.lineCap = ctx.lineJoin = 'round';
    trace(3); ctx.lineWidth = width + 1; ctx.strokeStyle = colors[2]; ctx.stroke();
    trace(0); ctx.lineWidth = width; ctx.strokeStyle = gradient(points[0][0], points[0][1] - width / 2, 0, width, colors); ctx.stroke();
  }
  function bun(x, y, rx, ry, colors = P.bread, topped = true) {
    shadow(x, y + ry + 7, rx * 1.2, 15);
    clayBlob(x, y, rx, ry, colors, 93, .085);
    fingerprints(x - rx * .28, y + ry * .06, rx * .22, ry * .26);
    for (const [dx, dy] of [[-.35, -.17], [.25, .22], [.55, -.1]]) dent(x + dx * rx, y + dy * ry, 4.5, 2.8);
    if (topped) for (const [dx, dy, a] of [[-.50, -.3, -.4], [-.1, -.54, .6], [.33, -.35, -.7], [.55, .01, .6], [-.06, -.05, -.35]]) {
      seed(x + dx * rx, y + dy * ry, a);
    }
  }
  function patty(x, y, rx, ry, cooked = false) {
    clayBlob(x, y + 8, rx, ry, cooked ? P.meat : P.red, 28, .12);
    clayBlob(x, y, rx, ry, cooked ? P.meat : P.red, 28, .12);
    ctx.save(); blobPath(x, y, rx - 2, ry - 1, 28, .075); ctx.clip();
    if (cooked) {
      for (let j = -1; j <= 1; j++) {
        const dx = j * rx * .48;
        line([[x + dx - 8, y - ry + 7], [x + dx + 12, y + ry - 6]], '#8C512E', 9);
        line([[x + dx - 7, y - ry + 9], [x + dx + 13, y + ry - 4]], '#E0A775', 2.5);
      }
    } else {
      for (let j = 0; j < 6; j++) {
        const px = x + (rnd(j + 41) * 2 - 1) * rx * .88;
        const py = y + (rnd(j + 211) * 2 - 1) * ry * .80;
        dent(px, py, 5, 2.5, .5);
      }
      fingerprints(x - 12, y - 2, 16, 9);
    }
    ctx.restore();
  }
  function steam(x, y, p) {
    for (let i = -1; i <= 1; i++) {
      const lift = Math.sin(p * Math.PI * 2 + i) * 4;
      ctx.beginPath(); ctx.moveTo(x + i * 27, y + lift);
      ctx.bezierCurveTo(x + i * 27 - 12, y - 12 + lift, x + i * 27 + 13, y - 19 + lift, x + i * 27 + 3, y - 33 + lift);
      ctx.strokeStyle = '#78B5E0'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke();
    }
  }
  const bunStages = [['반죽', '우리밀에 물을 더해 반죽', P.sky], ['발효', '반죽이 부풀어 오르는 시간', P.wheat], ['굽기', '오븐에서 노릇하게', P.rose]];
  const pattyStages = [['다지기', '고기를 고르게 다져요', P.rose], ['빚기', '둥글고 납작하게 모양 잡기', P.wheat], ['굽기', '뜨거운 철판에 올려요', P.mint]];
  function process(t, number, title, detail, stages, draw) {
    box(18, 18, 924, 444, 26, P.paper);
    box(48, 42, 48, 30, 15, P.mint); text(number, 72, 57, 15, P.green);
    text(title, 112, 57, 32, P.ink, 'left'); text(detail, 906, 60, 15, P.muted, 'right', 500);
    line([[48, 88], [912, 88]], P.line, 2);
    stages.forEach(([name, description, color], i) => {
      const x = 48 + i * 301, cx = x + 131, p = seg(t, i / 3, (i + 1) / 3);
      box(x, 113, 262, 298, 17, P.cream);
      box(x + 12, 125, 238, 191, 13, color);
      // A little tabletop, contact shadows, rounded tools: miniature clay dioramas.
      shadow(cx, 289, 102, 19, .12);
      ctx.save(); ctx.translate(cx, 239); ctx.scale(1.06, 1.06);
      draw(i, 0, 0, p); ctx.restore();
      box(x + 24, 137, 38, 30, 15, p > 0 ? P.green : P.paper);
      text('0' + (i + 1), x + 43, 152, 15, p > 0 ? P.paper : P.ink);
      text(name, cx, 347, 24); text(description, cx, 380, 16, P.muted, 'center', 500);
      box(x + 17, 423, 228, 4, 2, P.line);
      if (p > 0) box(x + 17, 423, 228 * p, 4, 2, P.green);
      if (i < 2) {
        line([[x + 271, 254], [x + 291, 254]], P.muted, 2);
        line([[x + 285, 249], [x + 291, 254], [x + 285, 259]], P.muted, 2);
      }
    });
  }
  function scBun(t) {
    process(t, '03', '번을 만들어요', '우리밀 100%', bunStages, (i, x, y, p) => {
      if (i === 0) {
        shadow(x, y + 44, 91, 20);
        clayBlob(x, y + 17, 78, 42, P.teal, 42, .025);
        clayBlob(x, y - 5, 80, 25, P.teal, 42, .025);
        oval(x, y - 7, 65, 17, '#078E9E');
        clayBlob(x, y - 7, 61, 14, P.dough, 18, .07);
        // A chunky wooden mixing spoon, not a thin illustrative line.
        ctx.save(); ctx.translate(x + 13, y - 24); ctx.rotate(.34 + Math.sin(p * Math.PI * 2) * .3);
        clayBox(-5, -55, 11, 61, 5, P.board); clayBlob(0, 3, 13, 17, P.board, 4); ctx.restore();
        clayBlob(x - 22, y - 6, 23, 10, P.dough, 73, .09);
        fingerprints(x - 28, y + 11, 12, 5);
        for (const [dx, dy] of [[-70, 49], [-49, 52], [67, 46]]) clayBlob(x + dx, y + dy, 4, 2, P.dough, 7);
      } else if (i === 1) {
        clayBlob(x, y + 37, 85, 17, P.board, 13, .025);
        clayBlob(x, y + 32, 77, 13, P.white, 13, .025);
        const rise = easeO(p);
        bun(x, y + 7 - rise * 9, 65 + rise * 9, 30 + rise * 19, P.dough, false);
        // Raised, softly kneaded folds and thumbprints, not a glossy baked surface.
        const coil = Array.from({ length: 39 }, (_, j) => {
          const a = j / 38 * Math.PI * 3.8, r = j / 38;
          return [x + Math.cos(a) * r * 53, y - 10 - rise * 6 + Math.sin(a) * r * 26];
        });
        rope(coil, 12, P.dough);
        fingerprints(x - 22, y + 20, 14, 8, -.2);
        for (const dx of [-31, -9, 14]) dent(x + dx, y + 29, 6, 3.5, -.4);
      } else {
        shadow(x, y + 56, 97, 19);
        clayBox(x - 81, y - 62, 162, 118, 22, P.oven);
        clayBox(x - 66, y - 31, 132, 73, 15, P.meat);
        box(x - 58, y - 25, 116, 59, 10, '#69479D');
        clayBox(x - 48, y + 28, 96, 5, 2, P.board);
        bun(x, y + 9, 46, 26, p > .4 ? P.bread : P.dough);
        clayBox(x - 53, y - 48, 84, 7, 3, P.white);
        clayBlob(x + 53, y - 45, 8, 8, P.dough, 2);
        dent(x + 53, y - 45, 2, 3);
      }
    });
  }
  function scPatty(t) {
    process(t, '04', '패티를 만들어요', '한우', pattyStages, (i, x, y, p) => {
      if (i === 0) {
        shadow(x, y + 45, 99, 19);
        clayBox(x - 84, y - 15, 168, 65, 16, P.board);
        clayBox(x - 77, y - 19, 154, 60, 12, P.dough);
        dent(x - 63, y + 22, 5, 5);
        // Large pink play-dough sausages, intentionally nothing like realistic mince.
        for (let j = 0; j < 5; j++) {
          const yy = y - 8 + j * 9;
          rope([[x - 40 + j * 2, yy], [x - 19, yy - 4], [x + 10, yy + 3], [x + 36 - j * 3, yy]], 11, P.red);
        }
        for (const [dx, dy, a] of [[-49, 8, .4], [41, 17, -.8], [5, 30, .2]]) {
          ctx.save(); ctx.translate(x + dx, y + dy); ctx.rotate(a);
          clayBlob(0, 0, 10, 5.5, P.red, 15, .1); ctx.restore();
        }
        const chop = Math.sin(p * Math.PI * 4) * 7;
        ctx.save(); ctx.translate(x + 8, y - 27 + chop); ctx.rotate(-.25);
        clayBox(-53, -8, 79, 24, 6, P.white);
        clayBox(20, -11, 47, 16, 7, P.teal);
        dent(46, -4, 3, 2); ctx.restore();
      } else if (i === 1) {
        shadow(x, y + 42, 97, 21);
        clayBlob(x, y + 29, 90, 29, P.teal, 14, .025);
        clayBlob(x, y + 24, 81, 23, P.white, 14, .025);
        const press = easeO(p);
        patty(x, y + 4 + press * 7, 56 + press * 16, 31 - press * 6);
        // These shallow prints are deliberately visible at thumbnail scale.
        for (const dx of [-24, -3, 18]) dent(x + dx, y - 1, 7, 4, -.2);
      } else {
        shadow(x, y + 49, 103, 20);
        clayBox(x - 89, y + 8, 178, 43, 16, P.dark);
        clayBox(x - 81, y, 162, 36, 12, P.dark);
        for (let j = -3; j <= 3; j++) line([[x + 21 * j, y + 5], [x + 21 * j, y + 26]], '#B2E3B4', 5);
        const flip = seg(p, .49, .74), lift = Math.sin(flip * Math.PI);
        patty(x, y + 1 - lift * 32, 65, 6 + 19 * Math.abs(Math.cos(flip * Math.PI)), true);
        steam(x, y - 39 - lift * 10, p);
        clayBlob(x - 61, y + 39, 4.5, 4.5, P.oven, 14);
      }
    });
  }
  return scenes.map((scene, i) => i === 3 ? { ...scene, draw: scBun } : i === 4 ? { ...scene, draw: scPatty } : scene);
}

export const episode = {
  id: 'burger-clay-study',
  createScenes: createClayBurgerScenes,
  sources: Array(8).fill(new URL('./scenes.mjs', import.meta.url)),
};
