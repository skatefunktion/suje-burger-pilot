const pages = ['첫 장', '다음 장', '마지막 장'];

function document(ctx, kit, progress) {
  const { INK, PAPER, BUN, BUN_D, CHEESE, TOMATO_D, STROKE, TYPE,
    rr, jline, label, softShadow, lerp } = kit;
  const x = 170, y = 126, w = 214, h = 216;
  const position = progress * pages.length;
  const page = Math.min(Math.floor(position), pages.length - 1);
  const scanY = lerp(y + 68, y + h - 16, position - page);

  softShadow(x + w / 2 + 15, y + h + 17, w + 35);
  ctx.strokeStyle = INK;
  ctx.lineWidth = STROKE.ink;
  for (let i = 3; i > 0; i--) {
    ctx.fillStyle = i % 2 ? BUN : PAPER;
    rr(x + i * 10, y + i * 4, w, h, 12);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = PAPER;
  rr(x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();
  label(pages[page], x + w / 2, y + 38, TYPE.caption);

  ctx.fillStyle = CHEESE;
  rr(x + 19, scanY - 8, w - 38, 16, 8);
  ctx.fill();
  ctx.strokeStyle = BUN_D;
  ctx.lineWidth = STROKE.fine;
  for (let i = 0; i < 6; i++) {
    const rowY = y + 82 + i * 20;
    jline(x + 27, rowY, x + w - 27 - ((i + page) % 3) * 17, rowY, 17 + i, 1);
  }
  ctx.strokeStyle = TOMATO_D;
  jline(x + 20, scanY, x + w - 20, scanY, 38, 1);
}

function clock(ctx, kit, t) {
  const { INK, PAPER, BUN, TOMATO_D, STROKE, jellipse, jline, softShadow } = kit;
  const x = 664, y = 236;
  const turn = 2 * Math.PI;
  softShadow(x, y + 114, 195);
  ctx.strokeStyle = INK;
  ctx.lineWidth = STROKE.ink;
  ctx.fillStyle = BUN;
  jellipse(x, y, 103, 103);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PAPER;
  jellipse(x, y, 87, 87);
  ctx.fill();
  ctx.stroke();

  ctx.lineWidth = STROKE.fine;
  for (let i = 0; i < 12; i++) {
    const angle = i * turn / 12;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const inner = i % 3 === 0 ? 65 : 72;
    jline(x + dx * inner, y + dy * inner, x + dx * 77, y + dy * 77, i, .5);
  }
  const longHand = turn * (2.5 * t - .25);
  const shortHand = turn * (.4 * t - .08);
  ctx.lineWidth = STROKE.emphasis;
  jline(x, y, x + 43 * Math.cos(shortHand), y + 43 * Math.sin(shortHand), 22, .7);
  ctx.strokeStyle = TOMATO_D;
  jline(x, y, x + 62 * Math.cos(longHand), y + 62 * Math.sin(longHand), 23, .7);
  ctx.fillStyle = INK;
  jellipse(x, y, 6, 6);
  ctx.fill();
}

function progressBar(ctx, kit, progress) {
  const { INK, PAPER, LETTUCE, STROKE, TYPE, rr, label } = kit;
  const x = 211, y = 415, w = 538, h = 24;
  rr(x, y, w, h, h / 2);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = STROKE.ink;
  ctx.stroke();

  const fill = (w - 8) * progress;
  if (fill > 0) {
    rr(x + 4, y + 4, fill, h - 8, Math.min(fill / 2, (h - 8) / 2));
    ctx.fillStyle = LETTUCE;
    ctx.fill();
  }
  label(progress === 0 ? '0%' : '계산 중', 480, 460, TYPE.note);
}

export function draw(t, ctx, kit) {
  const { INK, BUN, CHEESE, TOMATO_L, TYPE, seg, label, pill } = kit;
  const repeated = t >= .5;
  const pass = repeated ? 2 * t - 1 : 2 * t;
  const progress = seg(pass, .12, .94);

  document(ctx, kit, progress);
  clock(ctx, kit, t);
  progressBar(ctx, kit, progress);
  pill(repeated ? '첫 장부터 다시' : '긴 문서', 292, 80, repeated ? TOMATO_L : BUN, INK);
  pill(repeated ? '다시 질문' : '질문', 664, 80, CHEESE, INK);
  label('응답 대기 중', 664, 377, TYPE.caption);
}
