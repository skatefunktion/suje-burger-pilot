export function draw(t, ctx, kit) {
  const { W, INK, PAPER, BUN, BUN_D, CHEESE, LETTUCE, STROKE, TYPE,
    rr, label, jline, pill, softShadow, seg, easeIO, easeO, lerp } = kit;

  const card = (x, y, w, h, fill) => {
    ctx.fillStyle = fill;
    ctx.strokeStyle = INK;
    ctx.lineWidth = STROKE.ink;
    rr(x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();
  };

  label('프롬프트 구조', W / 2, 65, TYPE.title);
  softShadow(W / 2, 210, 744);
  card(108, 108, 744, 96, PAPER);
  card(116, 116, 392, 80, LETTUCE);
  card(516, 116, 328, 80, CHEESE);
  label('고정: 앞부분', 312, 140);
  label('문서와 지시', 312, 175, TYPE.caption);
  label('가변: 뒷부분', 680, 140);

  const change = easeIO(seg(t, .35, .47));
  ctx.save();
  ctx.globalAlpha = 1 - change;
  label('요약해 줘', 680, 175 - 8 * change, TYPE.caption);
  ctx.globalAlpha = change;
  label('번역해 줘', 680, 175 + 8 * (1 - change), TYPE.caption);
  ctx.restore();

  ctx.strokeStyle = INK;
  ctx.lineWidth = STROKE.ink;
  jline(312, 265, 312, 220, 51, 1);
  jline(312, 220, 304, 229, 52, 0);
  jline(312, 220, 320, 229, 53, 0);
  jline(468, 324, 680, 324, 54, 1);

  softShadow(312, 412, 312);
  card(156, 274, 312, 130, BUN_D);
  card(166, 285, 292, 108, BUN);
  label('앞부분 계산 결과', 312, 322, TYPE.caption);
  card(278, 348, 68, 20, PAPER);

  ctx.save();
  const reuse = easeO(seg(t, .49, .69));
  ctx.globalAlpha = easeO(seg(t, .49, .54)) * (1 - seg(t, .64, .72));
  pill('재사용', 312, lerp(268, 220, reuse), LETTUCE, INK, TYPE.note);
  ctx.restore();

  pill('12시간 보관 옵션', 680, 324, PAPER, INK, TYPE.caption);
}
