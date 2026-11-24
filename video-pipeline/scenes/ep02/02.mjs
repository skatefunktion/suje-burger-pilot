const chars = [...'봄날에꽃이핀다'];
const scanBeats = [[.022, .122], [.126, .213], [.216, .372]];
const readBeats = [.686, .786, .886];
const prefixLength = scanBeats.length + 1;
const tileX = i => 101 + i * 61 + (i >= 3 ? 9 : 0) + (i >= 5 ? 9 : 0);
const tileY = 224;
const blockY = i => 343 - i * 24;

export function draw(t, ctx, kit) {
  const {
    INK, PAPER, BUN, BUN_D, PATTY, CHEESE, LETTUCE, LETTUCE_D,
    STROKE, TYPE, seg, lerp, easeIO, easeO, rr, jline, label, pill, softShadow,
  } = kit;
  const shelfIn = easeIO(seg(t, .386, .458));
  const usingCache = t >= .68;
  const panelShift = 161 * (1 - shelfIn);
  const scan = scanBeats.findIndex(([start, end]) => t >= start && t < end);
  const read = readBeats.findIndex(start => t >= start && t < start + .092);
  const scanProgress = scan < 0 ? 0 : seg(t, ...scanBeats[scan]);
  const readProgress = read < 0 ? 0 : seg(t, readBeats[read], readBeats[read] + .092);
  const heading = usingCache ? '새 글자만 계산' : shelfIn > 0 ? '앞부분의 중간 결과 저장' : '앞부분 다시 계산';
  const computeStart = i => readBeats[i - prefixLength] + .057;
  const cacheStart = i => i < prefixLength ? .447 + i * .051 : computeStart(i) + .006;
  const transferDuration = i => i < prefixLength ? .075 : .033;

  function plate(x, y, w, h, radius, fill, stroke = INK, width = STROKE.ink) {
    rr(x, y, w, h, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function resultBlock(char, x, y) {
    plate(x - 52, y, 104, 22, 5, LETTUCE);
    label(char, x - 25, y + 11, TYPE.note);
    ctx.strokeStyle = INK;
    ctx.lineWidth = STROKE.fine;
    jline(x - 6, y + 8, x + 32, y + 8, 17, .6);
    jline(x - 6, y + 15, x + 23, y + 15, 19, .6);
  }

  label(heading, 480, 80, TYPE.title);

  ctx.save();
  ctx.translate(panelShift, 0);
  softShadow(316, 412, 483);
  plate(65, 140, 502, 258, 24, BUN);
  plate(82, 157, 468, 224, 16, PAPER);
  label('만드는 문장', 316, 186, TYPE.caption);

  const scanHead = scan - Math.min(scan, Math.floor(scanProgress * (scan + 1) / .62));
  chars.forEach((char, i) => {
    const generated = i === 0 || (i < prefixLength
      ? t >= lerp(...scanBeats[i - 1], .86)
      : t >= computeStart(i));
    const scanning = scan >= 0 && i === scan + 1;
    const reading = read >= 0 && i === read + prefixLength;
    const computing = reading && readProgress >= .38;
    const cached = usingCache && t >= cacheStart(i) + transferDuration(i);
    const reviewed = scan >= 0 && i >= scanHead && i <= scan && scanProgress < .76;
    const fill = reviewed ? (i === scanHead ? CHEESE : BUN) : computing || (scanning && scanProgress >= .76)
      ? CHEESE : cached ? LETTUCE : generated ? PAPER : BUN;
    const active = reviewed || scanning || reading;
    plate(tileX(i), tileY, 54, 56, 9, fill, active || generated ? INK : PATTY,
      active ? STROKE.emphasis : STROKE.fine);
    if (generated) {
      label(char, tileX(i) + 27, tileY + 28, TYPE.label);
    } else {
      ctx.strokeStyle = PATTY;
      ctx.lineWidth = STROKE.fine;
      jline(tileX(i) + 20, tileY + 34, tileX(i) + 34, tileY + 34, i + 7, .5);
    }
  });

  if (usingCache) {
    const status = read >= 0 && readProgress >= .38 && readProgress < .9 ? '새 글자 계산' : '저장한 결과 재사용';
    pill(status, 316, 343, LETTUCE, INK);
  } else {
    const status = shelfIn > 0 ? '중간 결과 모으기' : scanProgress >= .76 ? '새 글자 계산' : '앞 글자 훑기';
    pill(status, 316, 343, CHEESE, INK);
  }
  ctx.restore();

  if (shelfIn > 0) {
    const shelfShift = 24 * (1 - shelfIn);
    ctx.save();
    ctx.globalAlpha = shelfIn;
    ctx.translate(shelfShift, 0);
    softShadow(781, 412, 215);
    plate(670, 140, 222, 258, 24, BUN);
    plate(686, 193, 190, 188, 12, PAPER);
    plate(684, 365, 194, 17, 6, BUN_D);
    label('KV 캐시', 781, 168, TYPE.label);
    ctx.restore();

    chars.forEach((char, i) => {
      const start = cacheStart(i);
      if (t < start) return;
      const p = easeIO(seg(t, start, start + transferDuration(i)));
      const y = lerp(tileY + 62, blockY(i), p) + Math.sin(Math.PI * p) * 33;
      resultBlock(char, lerp(tileX(i) + 27 + panelShift, 781 + shelfShift, p), y);
    });
  }

  if (usingCache) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = STROKE.ink;
    jline(659, 343, 581, 343, 36, 1);
    jline(581, 343, 593, 334, 27, .5);
    jline(581, 343, 593, 352, 39, .5);
    if (read >= 0) {
      const x = lerp(659, 581, easeO(seg(readProgress, 0, .52)));
      ctx.beginPath();
      ctx.arc(x, 343, 6, 0, Math.PI * 2);
      ctx.fillStyle = LETTUCE_D;
      ctx.fill();
      ctx.stroke();
    }
  }
}
