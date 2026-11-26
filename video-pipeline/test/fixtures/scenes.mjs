export const episode = {
  createScenes: ctx => [
    { dur: 1, cap: '오류', draw() { throw new Error('broken scene'); } },
    { dur: 1, cap: '정상', draw() { ctx.fillRect(100, 100, 100, 100); } },
    { dur: 1, cap: '빈 장면', draw() {} },
    { dur: 1, cap: '시간 초과', draw() { while (true) {} } },
  ],
};
