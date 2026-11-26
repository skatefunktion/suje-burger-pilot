function createBurgerScenes(ctx, kit) {
  const { seg, lerp, easeIO, easeO, rr, numBadge } = kit;
  const C = {
    panel: '#FFFDF7', cream: '#F4EADD', line: '#E5D8C7', ink: '#2E2921', muted: '#685C4E',
    green: '#315947', leaf: '#74A766', mint: '#DEEBDD', dark: '#254638',
    bun: '#E4A457', toast: '#BE753B', butter: '#F4C853', wheat: '#F6E7C6',
    tomato: '#CB5944', rose: '#F4DCD2', meat: '#754433', sauce: '#87462F', glaze: '#A94E2A',
    sky: '#DDEAE9', blue: '#53797C', white: '#FFFFFF',
  };

  function box(x, y, w, h, r, color) {
    ctx.fillStyle = color;
    rr(x, y, w, h, r);
    ctx.fill();
  }

  function oval(x, y, rx, ry, color, angle = 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
    ctx.fill();
  }

  function polygon(points, color) {
    ctx.beginPath();
    for (const [i, [x, y]] of points.entries()) i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function line(points, color = C.line, width = 2) {
    ctx.beginPath();
    for (const [i, [x, y]] of points.entries()) i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function text(value, x, y, size, color = C.ink, weight = 700, align = 'left', limit) {
    ctx.font = weight + ' ' + size + 'px "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (limit === undefined) ctx.fillText(value, x, y);
    else ctx.fillText(value, x, y, limit);
  }

  function center(value, x, y, size, color = C.ink, weight = 700) {
    text(value, x, y, size, color, weight, 'center');
  }

  function arrow(x, y, width, color = C.green) {
    line([[x, y], [x + width, y]], color);
    line([[x + width - 6, y - 5], [x + width, y], [x + width - 6, y + 5]], color);
  }

  function tag(value, x, y, width, fill = C.mint, color = C.dark) {
    box(x, y, width, 30, 15, fill);
    center(value, x + width / 2, y + 15, 15, color);
  }

  function stage() {
    box(18, 18, 924, 444, 26, C.panel);
  }

  function heading(step, title, detail) {
    stage();
    tag(step, 48, 42, 48);
    text(title, 112, 57, 32);
    if (detail) text(detail, 906, 60, 15, C.muted, 500, 'right');
    line([[48, 88], [912, 88]]);
  }

  function accent(x, y, color) {
    line([[x - 8, y], [x + 8, y]], color, 2.5);
    line([[x, y - 8], [x, y + 8]], color, 2.5);
  }

  function seeds(x, y, scale, color = C.panel) {
    for (const [dx, dy, angle] of [[-25, 0, -.4], [-10, -7, .5], [4, 3, -.7], [15, -6, .2], [28, 1, .55]]) {
      oval(x + dx * scale, y + dy * scale, 3.9 * scale, 1.65 * scale, color, angle);
    }
  }

  function dome(x, y, width, height, color) {
    ctx.beginPath();
    ctx.moveTo(x - width / 2, y);
    ctx.bezierCurveTo(x - width * .46, y - height * 1.28, x + width * .46, y - height * 1.28, x + width / 2, y);
    ctx.quadraticCurveTo(x + width * .49, y + 8, x + width * .41, y + 8);
    ctx.lineTo(x - width * .41, y + 8);
    ctx.quadraticCurveTo(x - width * .49, y + 8, x - width / 2, y);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function lettuce(x, y, width, height) {
    ctx.beginPath();
    ctx.moveTo(x - width / 2, y + height / 2);
    ctx.quadraticCurveTo(x - width / 2, y, x - width * .43, y);
    ctx.lineTo(x + width * .43, y);
    ctx.quadraticCurveTo(x + width / 2, y, x + width / 2, y + height / 2);
    for (let i = 0; i < 6; i++) {
      const x1 = x + width / 2 - width * i / 6;
      ctx.quadraticCurveTo(x1 - width / 12, y + height * 1.35, x1 - width / 6, y + height / 2);
    }
    ctx.fillStyle = C.leaf;
    ctx.fill();
  }

  const offsets = [0, -16, -24, -35, -50, -69];
  const ingredients = ['아래 번', '양상추', '토마토', '치즈', '패티', '위 번'];
  const layerColors = [C.bun, C.leaf, C.tomato, C.butter, C.meat, C.bun];

  function layer(index, x, y, scale, topped = true) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const color = layerColors[index];
    switch (index) {
      case 0:
        box(-100, -9, 200, 24, 12, C.toast);
        box(-100, -10, 200, 17, 8, color);
        break;
      case 1:
        lettuce(0, 0, 212, 13);
        break;
      case 2:
        box(-100, -5, 98, 15, 7, color);
        box(1, -5, 99, 15, 7, color);
        break;
      case 3:
        polygon([[-101, -4], [101, -4], [88, 7], [26, 7], [8, 17], [-11, 7], [-92, 7]], color);
        break;
      case 4:
        box(-98, -12, 196, 23, 11, color);
        line([[-78, 2], [69, 2]], '#92573C', 2);
        break;
      case 5:
        dome(0, 0, 210, 53, color);
        if (topped) seeds(0, -24, 1.65);
        break;
    }
    ctx.restore();
  }

  function burger(x, y, scale) {
    for (const [i, offset] of offsets.entries()) layer(i, x, y + offset * scale, scale);
  }

  function plate(x, y, width, fill = C.sky) {
    oval(x, y, width / 2, width * .078, fill);
    oval(x, y, width * .38, width * .042, C.panel);
  }

  function icon(kind, x, y, s = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    switch (kind) {
      case 'flour':
        box(-20, -15, 40, 42, 8, C.wheat);
        box(-17, -21, 34, 8, 3, C.toast);
        line([[-6, 15], [7, -4]], C.toast);
        oval(-5, 5, 4, 7, C.toast, -.6);
        oval(6, 7, 7, 3, C.toast, -.55);
        break;
      case 'beef':
        box(-27, -20, 54, 40, 17, C.tomato);
        oval(13, -1, 8, 10, C.rose, -.55);
        oval(13, -1, 4, 5, C.sauce, -.55);
        line([[-19, -3], [-12, -8], [-5, -4]], C.rose, 2.5);
        break;
      case 'veg':
        oval(-10, 0, 15, 23, C.leaf, -.55);
        line([[-20, -12], [-5, 14]], C.green);
        oval(13, 6, 15, 13, C.tomato);
        line([[9, -5], [13, -8], [18, -4]], C.green);
        break;
      case 'cheese':
        polygon([[-24, -7], [10, -22], [26, -7], [26, 16], [-24, 16]], C.butter);
        polygon([[-24, -7], [26, -7], [26, 16], [-24, 16]], C.bun);
        oval(-9, 4, 4, 4, C.toast);
        oval(8, 10, 3, 3, C.toast);
        oval(17, -1, 4, 3, C.toast);
        break;
      case 'sesame':
        seeds(0, 0, .72, C.toast);
        seeds(1, 12, .55, '#9E643B');
        break;
      case 'sauce':
        box(-14, -10, 28, 34, 7, C.sauce);
        box(-8, -19, 16, 12, 3, C.toast);
        box(-9, 0, 18, 13, 3, C.wheat);
        break;
      case 'tomato':
        oval(0, 3, 20, 16, C.tomato);
        line([[-7, -12], [0, -8], [7, -12]], C.green, 3);
        break;
      case 'lettuce':
        oval(-5, 0, 15, 22, C.leaf, -.6);
        oval(9, -1, 12, 20, C.green, .6);
        line([[-11, -9], [0, 16], [11, -10]], C.mint);
        break;
      case 'farm':
        oval(0, 15, 37, 10, C.mint);
        box(-22, -16, 44, 35, 4, C.tomato);
        polygon([[-27, -13], [0, -34], [27, -13]], C.sauce);
        box(-8, 0, 16, 19, 3, C.wheat);
        break;
      case 'truck':
        box(-34, -15, 43, 31, 5, C.green);
        box(6, -7, 26, 23, 5, C.leaf);
        box(14, -3, 13, 8, 2, C.mint);
        oval(-20, 16, 6, 6, C.ink);
        oval(21, 16, 6, 6, C.ink);
        break;
      case 'shop':
        box(-24, -15, 48, 34, 4, C.wheat);
        box(-16, 2, 14, 13, 2, C.sky);
        box(5, 0, 11, 19, 2, C.green);
        box(-28, -24, 56, 13, 5, C.tomato);
        for (const dx of [-15, 0, 15]) box(dx - 4, -24, 8, 13, 2, C.rose);
        break;
    }
    ctx.restore();
  }

  function scTitle(t) {
    stage();
    box(504, 46, 410, 388, 21, C.green);
    oval(709, 238, 145, 145, '#406A54');
    plate(709, 360, 300, C.mint);
    const drop = easeO(seg(t, .03, .57));
    burger(709, 341 - (1 - drop) * 39, 1.35);
    accent(568, 152, C.butter);
    accent(842, 294, C.mint);
    tag('재료부터 차근차근', 56, 89, 154);
    text('수제버거가', 56, 191, 55);
    text('만들어지는 과정', 56, 257, 49);
    line([[56, 314], [440, 314]]);
    text('57초', 56, 354, 28, C.green);
    text('농장에서 식탁까지', 142, 354, 20, C.muted, 500);
  }

  const origins = [
    ['밀가루', '우리밀 농장', 'flour', C.wheat], ['소고기', '한우', 'beef', C.rose],
    ['양상추·토마토', '국내 농장', 'veg', C.mint], ['치즈', '국내산 우유', 'cheese', C.wheat],
    ['깨', '국내산', 'sesame', C.wheat], ['불고기 양념', '한국식 레시피', 'sauce', C.rose],
  ];

  function scOrigin(t) {
    heading('01', '재료는 어디서 왔을까?', '농장에서 주방까지');
    box(48, 104, 864, 135, 17, C.mint);
    line([[181, 161], [782, 161]], '#ABC0AA');
    const journey = easeIO(seg(t, .05, .82));
    arrow(180, 161, 600 * journey);
    for (const [x, glyph, name] of [[141, 'farm', '농장'], [480, 'truck', '운송'], [819, 'shop', '버거집']]) {
      oval(x, 158, 34, 34, C.panel);
      icon(glyph, x, 158, .73);
      center(name, x, 209, 18, C.dark);
    }
    origins.forEach(([name, detail, glyph, color], i) => {
      const x = 48 + i % 3 * 291, y = 252 + Math.floor(i / 3) * 94;
      const a = seg(t, .08 + i * .06, .33 + i * .06);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(0, (1 - easeO(a)) * 8);
      box(x, y, 282, 83, 14, C.cream);
      oval(x + 42, y + 41, 25, 25, color);
      icon(glyph, x + 42, y + 41, .70);
      text(name, x + 81, y + 29, 22);
      text(detail, x + 81, y + 56, 16, C.muted, 500);
      ctx.restore();
    });
  }

  const production = [
    ['한우', 30, '송아지 → 비육 → 도축', 'beef', C.meat],
    ['밀', 7, '파종(10월) → 월동 → 수확(5월)', 'flour', C.toast],
    ['토마토', 3, '육묘 → 정식 → 수확', 'tomato', C.tomato],
    ['참깨', 3, '파종(5월) → 개화 → 수확(8월)', 'sesame', C.toast],
    ['양상추', 2, '파종 → 수확', 'lettuce', C.green],
    ['치즈', 0, '착유 → 응고 → 가공', 'cheese', '#A57426'],
  ];

  function scTime(t) {
    heading('02', '자라는 데 걸리는 시간', '국내 일반적인 사육·재배 기준');
    const start = 418, span = 376;
    box(48, 104, 864, 289, 17, C.cream);
    for (const mark of [0, 10, 20, 30]) {
      const x = start + span * mark / 30;
      line([[x, 126], [x, 355]], C.line);
      center(mark === 0 ? '지금' : mark + '개월', x, 373, 15, C.muted, 500);
    }
    production.forEach(([name, months, stages, glyph, color], i) => {
      const y = 134 + i * 42;
      if (i > 0) line([[65, y - 21], [895, y - 21]], C.line, 1);
      icon(glyph, 85, y, .60);
      text(name, 115, y, 17);
      text(stages, 196, y, 15, C.muted, 500, 'left', start - 196 - 21);
      const p = easeO(seg(t, .07 + i * .073, .43 + i * .073));
      const length = p * (months === 0 ? 15 : span * months / 30);
      if (length > 0) box(start, y - 7, length, 14, 7, color);
      if (p > .83) text(months === 0 ? '단 며칠!' : months + '개월', start + length + 12, y, 17);
    });
    box(48, 402, 864, 39, 12, C.mint);
    center('소가 자라는 동안, 양상추는 열다섯 번 자랄 수 있어요', 480, 422, 18, C.dark);
  }

  function process(t, step, title, detail, stages, draw) {
    heading(step, title, detail);
    stages.forEach(([name, description, color], i) => {
      const x = 48 + i * 301, cx = x + 131;
      const p = seg(t, i / 3, (i + 1) / 3);
      box(x, 113, 262, 298, 17, C.cream);
      box(x + 12, 125, 238, 191, 13, color);
      tag('0' + (i + 1), x + 24, 137, 38, p > 0 ? C.green : C.panel, p > 0 ? C.white : C.ink);
      draw(i, cx, 233, p);
      center(name, cx, 347, 24);
      center(description, cx, 380, 16, C.muted, 500);
      box(x + 17, 423, 228, 4, 2, C.line);
      if (p > 0) box(x + 17, 423, 228 * p, 4, 2, C.green);
      if (i < 2) arrow(x + 271, 254, 20, C.muted);
    });
  }

  function scBun(t) {
    process(t, '03', '번을 만들어요', '우리밀 100%', [
      ['반죽', '우리밀에 물을 더해 반죽', C.sky],
      ['발효', '반죽이 부풀어 오르는 시간', C.wheat],
      ['굽기', '오븐에서 노릇하게', C.rose],
    ], (i, x, y, p) => {
      if (i === 0) {
        oval(x, y + 36, 76, 14, '#C4D8D7');
        ctx.beginPath();
        ctx.moveTo(x - 65, y + 2);
        ctx.quadraticCurveTo(x - 58, y + 45, x, y + 39);
        ctx.quadraticCurveTo(x + 58, y + 45, x + 65, y + 2);
        ctx.fillStyle = C.blue;
        ctx.fill();
        box(x - 66, y - 3, 132, 10, 5, '#365E62');
        oval(x, y - 1, 54, 10, C.wheat);
        const dy = Math.sin(p * Math.PI) * 24;
        polygon([[x - 2, y - 57 + dy], [x + 7, y - 43 + dy], [x - 11, y - 43 + dy]], C.blue);
        oval(x - 2, y - 42 + dy, 9, 8, C.blue);
      } else if (i === 1) {
        oval(x, y + 38, 79, 15, C.toast);
        oval(x, y + 36, 70, 11, '#F8D092');
        const height = lerp(32, 65, easeO(p));
        dome(x, y + 22, 115, height, C.bun);
        for (const [dx, dy] of [[-31, -2], [8, -13], [36, 5]]) oval(x + dx, y + dy - height / 4, 3, 3, C.toast);
        accent(x - 71, y - 35, C.toast);
        accent(x + 64, y - 44, C.toast);
      } else {
        box(x - 74, y - 62, 148, 124, 15, C.sauce);
        box(x - 62, y - 35, 124, 81, 8, '#512D24');
        box(x - 63, y - 43, 126, 7, 3, C.rose);
        oval(x + 51, y - 51, 4, 4, C.butter);
        line([[x - 50, y + 28], [x + 50, y + 28]], C.rose);
        dome(x, y + 21, 84, 36, p > .5 ? C.bun : '#F0BD77');
        seeds(x, y + 6, .8);
      }
    });
  }

  function scPatty(t) {
    process(t, '04', '패티를 만들어요', '한우', [
      ['다지기', '고기를 고르게 다져요', C.rose],
      ['빚기', '둥글고 납작하게 모양 잡기', C.wheat],
      ['굽기', '뜨거운 철판에 올려요', C.mint],
    ], (i, x, y, p) => {
      if (i === 0) {
        box(x - 72, y - 34, 144, 84, 14, '#D79A71');
        box(x - 65, y - 38, 130, 74, 10, C.wheat);
        oval(x - 49, y + 24, 4, 4, C.toast);
        for (const [dx, dy] of [[-17, -12], [10, -6], [26, 11], [-25, 13], [3, 16]]) {
          box(x + dx - 8, y + dy - 6, 17, 12, 4, C.tomato);
        }
        const chop = Math.sin(p * Math.PI * 4) * 5;
        polygon([[x - 42, y - 24 + chop], [x + 31, y - 47 + chop], [x + 32, y - 31 + chop], [x - 26, y - 10 + chop]], C.blue);
        line([[x + 28, y - 41 + chop], [x + 65, y - 53 + chop]], C.dark, 9);
      } else if (i === 1) {
        oval(x, y + 23, 74, 30, C.panel);
        const size = lerp(44, 54, easeO(p));
        oval(x, y + 13, size, 25, C.sauce);
        oval(x, y + 4, size, 23, C.tomato);
        for (const [dx, dy] of [[-27, 0], [-9, -7], [17, 0], [29, 8], [2, 12]]) {
          line([[x + dx - 4, y + dy], [x + dx + 4, y + dy + 1]], C.rose);
        }
      } else {
        box(x - 81, y + 1, 162, 56, 13, C.dark);
        box(x - 72, y - 5, 144, 45, 9, C.green);
        for (let j = -2; j <= 2; j++) line([[x + 22 * j, y + 3], [x + 22 * j, y + 32]], '#72917E');
        const flip = seg(p, .49, .74);
        oval(x, y + 8 - Math.sin(flip * Math.PI) * 28, 54, 4 + 13 * Math.abs(Math.cos(flip * Math.PI)), C.meat);
        for (const dx of [-29, 0, 29]) {
          const lift = Math.sin(p * Math.PI * 3 + dx) * 4;
          line([[x + dx, y - 26 + lift], [x + dx + 5, y - 35 + lift], [x + dx + 1, y - 45 + lift]], C.blue, 2.5);
        }
      }
    });
  }

  function scStack(t) {
    heading('05', '차곡차곡 쌓아요', '번 사이에 재료를 순서대로');
    box(48, 104, 500, 333, 19, C.mint);
    box(560, 104, 352, 333, 19, C.cream);
    oval(298, 278, 139, 139, '#CDDFC9');
    plate(298, 398, 265, C.panel);
    for (const [i, offset] of offsets.entries()) {
      const progress = seg(t, .10 * i, .18 + .10 * i);
      if (progress > 0) layer(i, 298, 372 + offset * 1.45 - (1 - easeO(progress)) * 75, 1.45);
      const y = 148 + i * 49, active = seg(t, i * .10 + .12, i * .10 + .20);
      if (i > 0) line([[582, y - 24], [888, y - 24]]);
      if (active > 0) numBadge(i + 1, 602, y, active);
      oval(645, y, 6, 6, layerColors[i]);
      text(ingredients[i], 664, y, 22, active > .5 ? C.ink : C.muted, active > .5 ? 700 : 500);
    }
  }

  function pattyGlaze(x, y, scale) {
    ctx.save();
    ctx.translate(x, y + (offsets[4] - 8) * scale);
    ctx.scale(scale, scale);
    line([[-82, 0], [-52, 1], [-34, -1], [2, 1], [27, 0], [53, 1], [82, 0]], C.glaze, 5);
    for (const [dx, drop] of [[-54, 7], [27, 9], [65, 5]]) {
      line([[dx, 1], [dx + 1, drop]], C.glaze, 5);
    }
    ctx.restore();
  }

  function scTwist(t) {
    heading('06', '한국식 한 끗', '특제 불고기 소스와 깨');
    box(48, 104, 520, 333, 18, C.wheat);
    oval(308, 267, 142, 142, '#EFDBB5');
    plate(308, 405, 294, C.panel);
    const scale = 1.28, bottom = 382, cx = 308;
    for (let i = 0; i < 5; i++) layer(i, cx, bottom + offsets[i] * scale, scale);
    const pour = seg(t, .14, .47), sauce = C.glaze, highlight = '#F3AB68';
    const ribbon = p => [lerp(202, 413, p), 309 + Math.sin(p * Math.PI * 4) * 4];
    if (pour > 0) {
      const stroke = Array.from({ length: 33 }, (_, i) => ribbon(pour * i / 32));
      line(stroke, sauce, 16);
      line(stroke.map(([x, y]) => [x, y - 3]), highlight, 3.5);
    }
    if (t > .06 && t < .53) {
      const [endX, endY] = ribbon(pour);
      const lift = 32 * (1 - seg(t, .06, .14) + seg(t, .47, .53));
      const nozzleX = endX - 36, nozzleY = 196 - lift;
      if (t >= .12 && t < .48) {
        line([[nozzleX, nozzleY], [endX - 15, 239], [endX, endY]], sauce, 14);
        line([[nozzleX - 2, nozzleY], [endX - 18, 239], [endX - 4, endY - 6]], highlight, 3.5);
      }
      ctx.save();
      ctx.translate(nozzleX, nozzleY);
      ctx.rotate(-.62);
      box(-39, -77, 54, 62, 12, C.sauce);
      box(-39, -63, 54, 26, 4, C.rose);
      box(-24, -19, 25, 14, 4, C.toast);
      box(-20, -7, 17, 11, 4, C.meat);
      ctx.restore();
    }
    const top = easeIO(seg(t, .50, .64));
    layer(5, lerp(475, cx, top), lerp(360, bottom + offsets[5] * scale, top) - Math.sin(top * Math.PI) * 42,
      lerp(.64, scale, top), false);
    if (t > .64) {
      const sprinkle = seg(t, .64, .88);
      const mouthX = lerp(238, 374, sprinkle), mouthY = 173;
      if (t < .91) {
        ctx.save();
        ctx.translate(mouthX, mouthY);
        ctx.rotate(-.38);
        box(-21, -50, 43, 44, 8, C.mint);
        box(-21, -18, 43, 16, 4, C.green);
        for (const dx of [-12, 0, 12]) oval(dx, -5, 2.5, 2.5, C.panel);
        ctx.restore();
      }
      const landing = [[252, 266], [267, 279], [277, 251], [290, 265], [301, 281], [309, 247],
        [324, 269], [336, 253], [349, 282], [356, 260], [373, 272]];
      for (const [i, [x, y]] of landing.entries()) {
        const start = .646 + i * .017;
        if (t < start) continue;
        const drop = seg(t, start, start + .095);
        const origin = lerp(238, 374, seg(start, .64, .88));
        const seedX = lerp(origin, x, drop) + Math.sin(drop * Math.PI) * ((i % 3) - 1) * 13;
        const seedY = lerp(mouthY + 5, y, drop * drop);
        const angle = (i % 3 - 1) * .62 + (1 - drop) * Math.PI;
        oval(seedX, seedY, 9, 5, '#A96B38', angle);
        oval(seedX, seedY - 1, 7, 3.5, C.panel, angle);
      }
    }
    for (const [i, glyph, title, subtitle, color] of [
      [0, 'sauce', '불고기 소스', '버거 위에 고르게', C.rose],
      [1, 'sesame', '깨', '마지막에 솔솔', C.mint],
    ]) {
      const y = 104 + i * 170;
      box(580, y, 332, 163, 16, color);
      oval(637, y + 80, 34, 34, C.panel);
      icon(glyph, 637, y + 80, 1.04);
      text(title, 688, y + 63, 26);
      text(subtitle, 688, y + 102, 18, C.muted, 500);
    }
  }

  function scDone(t) {
    stage();
    box(46, 46, 868, 389, 23, C.dark);
    oval(695, 229, 152, 152, '#3A5E4C');
    const settle = easeO(seg(t, .05, .64));
    plate(695, 376, 341, C.mint);
    const y = 358 - (1 - settle) * 34;
    burger(695, y, 1.48);
    pattyGlaze(695, y, 1.48);
    accent(560, 153, C.butter);
    accent(840, 295, C.mint);
    tag('완성', 78, 87, 67, C.butter, C.ink);
    text('맛있게', 78, 175, 60, C.panel);
    text('드세요!', 78, 248, 60, C.panel);
    line([[78, 296], [468, 296]], '#5D8070');
    text('우리밀 · 한우 · 국내 농장 채소', 78, 331, 21, C.mint, 500);
    text('재료부터 완성까지, 수제버거', 78, 373, 17, C.mint, 500);
  }

  const SCENES = [
    { dur: 4, cap: '수제버거가 만들어지는 과정', draw: scTitle },
    { dur: 8, cap: '먼저, 재료 소개. 밀가루는 우리밀, 소고기는 한우, 채소는 국내 농장에서 왔습니다', draw: scOrigin },
    { dur: 10, cap: '재료가 자라는 시간도 제각각. 한우는 30개월, 밀은 7개월, 양상추는 두 달이면 자랍니다', draw: scTime },
    { dur: 7, cap: '하나, 번. 우리밀을 반죽해 발효시키고 노릇하게 굽습니다', draw: scBun },
    { dur: 7, cap: '둘, 패티. 한우를 다져 빚고 뜨거운 철판에 굽습니다', draw: scPatty },
    { dur: 9, cap: '셋, 쌓기. 양상추, 토마토, 치즈, 패티를 순서대로 올립니다', draw: scStack },
    { dur: 7, cap: '넷, 한국 트위스트. 특제 불고기 소스를 뿌리고 깨를 솔솔', draw: scTwist },
    { dur: 5, cap: '완성! 맛있게 드세요 🍔', draw: scDone },
  ];
  return SCENES;
}

export { createBurgerScenes };
