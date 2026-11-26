const C = {
  panel: '#FFFDF7', cream: '#F4EADD', line: '#E5D8C7', ink: '#2E2921', muted: '#685C4E',
  green: '#315947', leaf: '#74A766', mint: '#DEEBDD', dark: '#254638',
  sky: '#DDEAE9', blue: '#53797C', white: '#FFFFFF', tomato: '#CB5944',
};
const pages = ['첫 장', '다음 장', '마지막 장'];

export function draw(t, ctx, kit) {
  const { rr, label, seg, lerp, TYPE } = kit;

  function box(x, y, w, h, r, color) {
    rr(x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function oval(x, y, rx, ry, color) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function line(points, color, width = 2) {
    ctx.beginPath();
    for (const [i, [x, y]] of points.entries()) i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function tag(value, x, y, w, fill, color) {
    box(x, y, w, 30, 15, fill);
    label(value, x + w / 2, y + 15, TYPE.note, color, 700);
  }

  function document(progress) {
    const position = progress * pages.length;
    const page = Math.min(Math.floor(position), pages.length - 1);
    const scanY = lerp(183, 276, position - page);
    oval(286, 293, 103, 10, '#ABC0AA');
    box(224, 142, 144, 150, 12, C.green);
    box(214, 136, 144, 150, 12, C.leaf);
    box(204, 130, 144, 150, 12, C.white);
    label(pages[page], 276, 158, TYPE.note, C.ink, 700);

    for (let i = 0; i < 5; i++) {
      const length = 102 - ((i + page) % 3) * 14;
      box(222, 183 + i * 18, length, 4, 2, C.line);
    }
    box(213, scanY - 4, 126, 8, 4, C.mint);
    line([[213, scanY], [339, scanY]], C.green);
    oval(339, scanY, 4, 4, C.green);
  }

  function clock() {
    const x = 729, y = 215, turn = 2 * Math.PI;
    oval(x, 291, 79, 8, '#C4D8D7');
    oval(x, y, 72, 72, C.blue);
    oval(x, y, 62, 62, C.white);
    for (let i = 0; i < 12; i++) {
      const angle = i * turn / 12;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      const inner = i % 3 === 0 ? 47 : 51;
      line([[x + dx * inner, y + dy * inner], [x + dx * 54, y + dy * 54]], C.blue);
    }
    const minutes = turn * (2.5 * t - .25);
    const hours = turn * (.4 * t - .08);
    line([[x, y], [x + 29 * Math.cos(hours), y + 29 * Math.sin(hours)]], C.dark, 6);
    line([[x, y], [x + 43 * Math.cos(minutes), y + 43 * Math.sin(minutes)]], C.tomato, 4);
    oval(x, y, 5, 5, C.dark);
  }

  const repeated = t >= .5;
  const pass = repeated ? 2 * t - 1 : 2 * t;
  const progress = seg(pass, .12, .94);

  box(18, 18, 924, 444, 26, C.panel);
  tag('AI', 48, 42, 48, C.mint, C.dark);
  label('긴 문서, 늦은 답변', 246, 57, TYPE.label, C.ink);
  tag(repeated ? '다시 질문' : '질문', 798, 42, 114,
    repeated ? C.green : C.mint, repeated ? C.white : C.dark);
  line([[48, 88], [912, 88]], C.line);

  box(48, 104, 464, 280, 17, C.cream);
  box(60, 116, 440, 208, 13, C.mint);
  document(progress);
  label('문서 스캔', 144, 358, TYPE.caption, C.ink);
  if (repeated) tag('첫 장부터 다시', 340, 343, 148, C.mint, C.dark);

  line([[520, 214], [538, 214], [532, 208]], C.muted);
  line([[538, 214], [532, 220]], C.muted);
  box(546, 104, 366, 280, 17, C.cream);
  box(558, 116, 342, 208, 13, C.sky);
  clock();
  label('응답 대기 중', 729, 358, TYPE.caption, C.ink);

  box(48, 396, 864, 54, 13, C.cream);
  label('계산 진행', 129, 423, TYPE.note, C.dark, 700);
  box(215, 420, 530, 14, 7, C.line);
  const fill = 530 * progress;
  if (fill > 0) box(215, 420, fill, 14, Math.min(fill / 2, 7), C.green);
  label(progress === 0 ? '0%' : '계산 중', 830, 423, TYPE.note, C.dark, 700);
}
