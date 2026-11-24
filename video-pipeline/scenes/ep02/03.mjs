export function draw(t, ctx, kit) {
  const {
    INK, PAPER, BUN, BUN_D, CHEESE, GREEN, LETTUCE, PATTY, TOMATO, TOMATO_L,
    STROKE, TYPE, easeIO, easeO, jline, label, lerp, pill, rr, seg, sheen, softShadow,
  } = kit;
  const shelfX = 185;
  const documentX = 480;
  const meterX = 775;
  const rescan = seg(t, .52, .94);
  const cost = .16 + .75 * easeO(seg(t, .57, .82));

  function box(x, y, w, h, radius, fill) {
    rr(x, y, w, h, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = STROKE.ink;
    ctx.stroke();
  }

  function resultCard(x, y, angle, fill) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    box(-22, -29, 44, 58, 8, fill);
    ctx.strokeStyle = INK;
    ctx.lineWidth = STROKE.fine;
    jline(-11, -7, 11, -7, 1, .6);
    jline(-11, 5, 6, 5, 2, .6);
    ctx.restore();
  }

  pill(t < .38 ? '이전 대화 종료' : '같은 문서, 새 질문', documentX, 64, BUN, INK);
  label('저장 선반', shelfX, 130);
  label('같은 문서', documentX, 130);
  label('비용 미터', meterX, 130);

  box(shelfX - 92, 167, 184, 93, 15, BUN_D);
  box(shelfX - 82, 176, 164, 72, 9, PAPER);
  if (t >= .38) label('비어 있음', shelfX, 213, TYPE.note);
  box(shelfX - 100, 242, 200, 18, 8, BUN);

  softShadow(shelfX, 417, 116);
  box(shelfX - 48, 312, 96, 34, 10, PATTY);
  const colors = [LETTUCE, CHEESE, TOMATO_L];
  for (let i = 0; i < colors.length; i++) {
    const slide = easeIO(seg(t, .11 + i * .05, .22 + i * .05));
    const drop = seg(t, .17 + i * .05, .27 + i * .05);
    if (drop < 1) {
      const x = lerp(shelfX - 51 + i * 51, shelfX + (i - 1) * 10, slide);
      const y = 211 + 143 * drop ** 2;
      resultCard(x, y, (i - 1) * .36 * slide, colors[i]);
    }
  }
  box(shelfX - 55, 334, 110, 72, 13, TOMATO_L);
  box(shelfX - 62, 327, 124, 17, 8, TOMATO);
  label('폐기함', shelfX, 373, TYPE.caption);

  pill(t < .42 ? '핵심은 뭐야?' : '어떤 예시가 있어?', documentX, 177, LETTUCE, INK, TYPE.note);
  softShadow(documentX, 336, 160);
  box(documentX - 72, 215, 158, 106, 11, BUN);
  box(documentX - 79, 209, 158, 106, 11, CHEESE);
  box(documentX - 86, 203, 158, 106, 11, PAPER);
  for (let i = 0; i < 4; i++) {
    const y = 221 + i * 18;
    ctx.strokeStyle = rescan >= (i + 1) / 4 ? GREEN : INK;
    ctx.lineWidth = STROKE.fine;
    jline(documentX - 66, y, documentX + (i === 3 ? 17 : 51), y, i + 1, .9);
  }
  if (t >= .52 && rescan < 1) {
    box(documentX - 77, lerp(213, 281, rescan), 140, 9, 4, LETTUCE);
  }
  label(t < .42 ? '계산 완료' : '첫 장부터 다시 계산', documentX, 369, TYPE.caption);
  box(documentX - 107, 388, 214, 18, 9, PAPER);
  const progress = t < .42 ? 1 : rescan;
  if (progress > 0) {
    const filled = 202 * progress;
    rr(documentX - 101, 393, filled, 8, Math.min(4, filled / 2));
    ctx.fillStyle = GREEN;
    ctx.fill();
  }

  const gaugeY = 314;
  const radius = 101;
  const minAngle = Math.PI * 1.08;
  const maxAngle = Math.PI * 1.92;
  function gaugeArc(start, end, color) {
    ctx.beginPath();
    ctx.arc(meterX, gaugeY, radius, start, end);
    ctx.strokeStyle = color;
    ctx.lineWidth = STROKE.emphasis * 3;
    ctx.stroke();
  }
  softShadow(meterX, 417, 228);
  box(meterX - 125, 192, 250, 214, 25, BUN);
  box(meterX - 114, 203, 228, 150, 17, PAPER);
  gaugeArc(minAngle, maxAngle, BUN);
  gaugeArc(minAngle, lerp(minAngle, maxAngle, cost), cost < .55 ? GREEN : TOMATO);
  const angle = lerp(minAngle, maxAngle, cost);
  ctx.strokeStyle = INK;
  ctx.lineWidth = STROKE.emphasis;
  jline(meterX, gaugeY, meterX + 83 * Math.cos(angle), gaugeY + 83 * Math.sin(angle), 8, .5);
  box(meterX - 8, gaugeY - 8, 16, 16, 8, INK);
  sheen(meterX - 1, gaugeY - 2, 4, 2);
  label(t < .57 ? '기존 비용' : '재계산으로 비용 증가', meterX, 378, TYPE.caption);
}
