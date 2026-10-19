// 자리표시 스프라이트(그림이 오기 전 파이프라인 확인용). 직접 그린 그림으로 바꿀 때는
// Aseprite에서 같은 태그 이름으로 내보내 public/sprites/*.png·*.json을 덮어쓰면 된다(docs/sprite-spec.md).
// 실행: npm run sprites:placeholder
import { writeFileSync } from 'node:fs';
import { png } from './lib/png.mjs';

/** 태그별 프레임을 받아 가로 한 줄 시트와 Aseprite 형식(JSON Array + frameTags) JSON을 만든다. */
function sheet(name, size, tags) {
  const frames = tags.flatMap((t) => t.frames.map((draw, i) => ({ tag: t.name, i, draw })));
  const W = size * frames.length;
  const px = Buffer.alloc(W * size * 4);
  frames.forEach((f, n) => {
    const set = (x, y, [r, g, b]) => {
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      px.set([r, g, b, 255], (y * W + n * size + x) * 4);
    };
    const rect = (x, y, w, h, c) => {
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, c);
    };
    f.draw(rect);
  });
  let from = 0;
  const json = {
    frames: frames.map((f, n) => ({
      filename: `${name} ${n}.aseprite`,
      frame: { x: n * size, y: 0, w: size, h: size },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: size, h: size },
      sourceSize: { w: size, h: size },
      duration: 150,
    })),
    meta: {
      app: 'scripts/gen-placeholder-sprites.mjs (Aseprite JSON Array 형식 흉내)',
      image: `${name}.png`,
      format: 'RGBA8888',
      size: { w: W, h: size },
      scale: '1',
      frameTags: tags.map((t) => {
        const tag = { name: t.name, from, to: from + t.frames.length - 1, direction: 'forward' };
        from += t.frames.length;
        return tag;
      }),
    },
  };
  writeFileSync(new URL(`../public/sprites/${name}.png`, import.meta.url), png(W, size, px));
  writeFileSync(
    new URL(`../public/sprites/${name}.json`, import.meta.url),
    JSON.stringify(json, null, 1) + '\n',
  );
  console.log(`${name}: ${frames.length} frames, tags ${tags.map((t) => t.name).join(' ')}`);
}

const SKIN = [0xf1, 0xc2, 0x7d];
const SHIRT = [0xe5, 0xe7, 0xeb];
const PANTS = [0x3b, 0x4a, 0x6b];
const DARK = [0x1f, 0x24, 0x30];
const YELLOW = [0xfa, 0xcc, 0x15];
const PINK = [0xf4, 0x72, 0xb6];

/** 16×16 주인공 자리표시: 발은 맨 아래 줄, 몸은 가운데 10px(충돌 상자 10×14). */
const hero =
  (o = {}) =>
  (rect) => {
    const dy = o.dy ?? 0;
    const lean = o.lean ?? 0;
    rect(5 + lean, 2 + dy, 6, 5, SKIN); // 머리
    rect(9 + lean, 4 + dy, 1, 1, DARK); // 눈(오른쪽을 본다)
    if (o.sleep) rect(6 + lean, 4 + dy, 4, 1, DARK);
    rect(4 + lean, 7 + dy, 8, 5, SHIRT); // 몸
    const [l, r] = o.legs ?? [0, 0];
    rect(5 + l, 12 + dy, 2, 4 - dy, PANTS);
    rect(9 + r, 12 + dy, 2, 4 - dy, PANTS);
    if (o.armUp) rect(11 + lean, 3 + dy, 2, 5, SKIN);
    if (o.punch) rect(12, 8, 4, 2, SKIN);
    if (o.umbrella) {
      rect(1, 0, 14, 2, YELLOW);
      rect(8, 1, 1, 6, DARK);
    }
    if (o.z) rect(13, 0, 2, 2, PINK);
    if (o.spark) rect(13, 14, 3, 2, YELLOW);
  };

sheet('hero', 16, [
  { name: 'idle', frames: [hero(), hero({ dy: 1 })] },
  { name: 'walk', frames: [hero({ legs: [-1, 1] }), hero(), hero({ legs: [1, -1] }), hero()] },
  { name: 'jump', frames: [hero({ legs: [-1, 1], armUp: true })] },
  { name: 'fall', frames: [hero({ legs: [1, -1] })] },
  {
    name: 'climb',
    frames: [hero({ armUp: true, legs: [0, -1] }), hero({ armUp: true, legs: [0, 1] })],
  },
  { name: 'float', frames: [hero({ umbrella: true }), hero({ umbrella: true, dy: 1 })] },
  { name: 'break', frames: [hero({ lean: 1 }), hero({ punch: true, lean: 1 })] },
  { name: 'sleep', frames: [hero({ sleep: true, dy: 2 }), hero({ sleep: true, dy: 2, z: true })] },
  { name: 'dance', frames: [hero({ lean: -1, armUp: true }), hero({ lean: 1, legs: [1, 0] })] },
  { name: 'skid', frames: [hero({ lean: -1, spark: true })] },
  { name: 'hurt', frames: [hero({ lean: -2, legs: [1, 1] })] },
]);

const GRAY = [0x9c, 0xa3, 0xaf];
const enemy = (step) => (rect) => {
  rect(2, 4, 12, 10, GRAY);
  rect(4, 7, 2, 2, DARK);
  rect(10, 7, 2, 2, DARK);
  rect(step ? 3 : 4, 14, 3, 2, DARK);
  rect(step ? 11 : 10, 14, 3, 2, DARK);
};
sheet('enemy', 16, [{ name: 'walk', frames: [enemy(0), enemy(1)] }]);

const coinFrame = (w) => (rect) => {
  rect(4 - w, 1, w * 2, 6, YELLOW);
  rect(4, 2, 1, 4, [0x8b, 0x73, 0x55]);
};
sheet('coin', 8, [
  { name: 'spin', frames: [coinFrame(3), coinFrame(2), coinFrame(1), coinFrame(2)] },
]);
