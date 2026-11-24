export function draw(t, ctx, kit) {
  const { INK, PAPER, BUN, BUN_D, PATTY, CHEESE, LETTUCE, GREEN, GRAY,
    STROKE, TYPE, rr, label, pill, softShadow, sheen, jline, seg, lerp, easeIO } = kit;
  const tween = (start, end) => easeIO(seg(t, start, end));
  const opening = tween(.08, .16) - tween(.24, .34) + tween(.48, .56) - tween(.72, .81);
  const storing = tween(.15, .24);
  const retrieving = tween(.55, .69);
  const computing = tween(.71, .82);
  const matched = t >= .39;
  const reused = retrieving === 1;
  const cachedRate = .1;
  const discount = tween(.77, .89);
  const rate = lerp(1, cachedRate, discount);

  function box(x, y, w, h, r, fill, width = STROKE.ink) {
    rr(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  label('프롬프트 캐싱', 480, 55, TYPE.title);
  label('앞부분이 같으면 계산 결과를 꺼내 써요', 480, 101, TYPE.caption);

  softShadow(245, 339, 350);
  box(65, 131, 360, 200, 20, PAPER);
  label(matched ? '다음 요청' : '처음 요청', 245, 153, TYPE.caption);
  box(85, 174, 180, 44, 12, LETTUCE);
  label(matched ? '같은 앞부분' : '앞부분', 175, 196, TYPE.caption);
  box(275, 174, 130, 44, 12, PAPER);
  if (computing > 0) {
    ctx.save();
    rr(277, 176, 126, 40, 10);
    ctx.clip();
    ctx.fillStyle = CHEESE;
    ctx.fillRect(277, 176, 126 * computing, 40);
    ctx.restore();
  }
  label(matched ? '새 질문' : '질문', 340, 196, TYPE.caption);

  softShadow(739, 339 + 7 * opening, 274);
  box(600, 131, 278, 190, 20, BUN);
  sheen(628, 152, 14, 5);
  label('캐시 서랍', 739, 172, TYPE.label);
  box(618, 218, 242, 67, 12, PATTY);
  if (opening > 0) {
    box(618, 219 + 17 * opening, 15, 62 + 40 * opening, 7, BUN_D, STROKE.fine);
    box(845, 219 + 17 * opening, 15, 62 + 40 * opening, 7, BUN_D, STROKE.fine);
  }

  if ((t >= .08 && t < .27) || (t >= .48 && t < .69)) {
    const from = matched ? 571 : 454;
    const to = matched ? 454 : 571;
    const head = matched ? 11 : -11;
    ctx.strokeStyle = INK;
    ctx.lineWidth = STROKE.ink;
    jline(from, 253, to, 253, 24, 1);
    ctx.beginPath();
    ctx.moveTo(to + head, 244);
    ctx.lineTo(to, 253);
    ctx.lineTo(to + head, 262);
    ctx.stroke();
  }

  const cardX = lerp(87, 641, storing - retrieving);
  box(cardX, 232, 196, 42, 12, LETTUCE);
  label('앞부분 계산 결과', cardX + 98, 253, TYPE.note);
  const drawerY = 218 + 59 * opening;
  box(618, drawerY, 242, 67, 12, BUN_D);
  box(715, drawerY + 23, 48, 13, 6, PAPER, STROKE.fine);

  if (reused) {
    pill('저장본 재사용', 185, 303, LETTUCE, INK, TYPE.note);
    if (computing > 0) pill('새 질문만 계산', 340, 303, CHEESE, INK, TYPE.note);
  } else if (matched) {
    label('서랍에서 일치하는 결과 찾기', 245, 303, TYPE.note);
  } else {
    label('앞부분 계산 결과 보관', 245, 303, TYPE.note);
  }

  box(65, 364, 813, 90, 20, PAPER);
  label('입력 읽기 요금', 179, 400, TYPE.caption);
  label(matched ? '캐시에 맞은 앞부분만' : '일반 입력 기준', 179, 428, TYPE.note);
  const meterWidth = 410;
  box(300, 396, meterWidth, 28, 14, PAPER);
  box(300, 396, meterWidth * rate, 28, 14, discount > 0 ? GREEN : BUN, STROKE.fine);
  ctx.strokeStyle = GRAY;
  ctx.lineWidth = STROKE.fine;
  jline(710, 387, 710, 433, 27, .5);
  label(discount === 1 ? '0.1배' : discount > 0 ? '요금 감소' : '일반 요금',
    792, 410, discount === 1 ? TYPE.label : TYPE.caption);
}
