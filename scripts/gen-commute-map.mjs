// 1스테이지 '지각 직전 출근길' 구간 1~4 맵 초안을 Tiled JSON(.tmj)으로 만든다.
// 실행: npm run map:commute → public/maps/commute.tmj, public/maps/graybox-tiles.png
// 이 파일은 초안 생성용이다. Tiled에서 다듬은 뒤에는 .tmj가 원본이 되므로 다시 돌리면 덮어쓴다(주의).
import { writeFileSync } from 'node:fs';
import { png } from './lib/png.mjs';

const T = 10;
const COLS = 370;
const ROWS = 18;
const GROUND = 16; // 땅 윗면 행. 서 있는 칸은 15행.
const STAND = GROUND - 1;

const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(' '));
const fill = (c0, c1, r0, r1, ch = '#') => {
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) grid[r][c] = ch;
};

const objects = [];
const add = (type, col, row, props = {}, w = T, h = T) =>
  objects.push({ type, x: col * T, y: row * T, width: w, height: h, props });
const enemy = (verb, col) => add('enemy', col, STAND, { verb });
const letter = (char, col, row, ability) => add('letter', col, row, { char, ability });
// 코인: 권장 경로를 따라 줄지어 두어 어디로 어떻게 뛰면 되는지 알려 준다(PRD 코인 배치).
const coin = (col, row) => add('coin', col, row);
const coinRow = (c0, c1, row = STAND) => {
  for (let c = c0; c <= c1; c++) coin(c, row);
};
/** 벽 앞 세로 줄 — climb로 오르라는 힌트. 점프로도 닿는 높이(11~14행)까지만 둔다. */
const coinColumn = (col) => {
  for (let r = 11; r <= 14; r++) coin(col, r);
};
const gap = (c0, c1) => {
  fill(c0, c1, GROUND, ROWS - 1, ' ');
  return [c0, c1];
};

// 바닥과 좌우 끝 벽
fill(0, COLS - 1, GROUND, ROWS - 1);
fill(0, 0, 0, STAND);
fill(COLS - 1, COLS - 1, 0, STAND);

// ── 구간 1 · 집 앞 담장 (climb / 오답 sleep) ──────────────────────────
add('spawn', 3, STAND);
coinRow(6, 9);
enemy('climb', 14); // 소개: 오답 없이 한 번
coinColumn(21);
coinRow(22, 23, 10); // 낮은 담장 위
fill(22, 23, 11, STAND); // 낮은 담장 5칸(점프 42.75px로는 못 넘음)
// 고르기 앞 체크포인트: 지나가면 능력을 잃는다(소개에서 얻은 climb를 들고 지나가지 못하게)
const choose = (col) => add('checkpoint', col, STAND, { resetAbility: 'true' });
choose(27);
enemy('climb', 32); // 고르기
enemy('sleep', 38);
coinRow(29, 30);
coinColumn(49);
fill(50, 52, 8, STAND); // 높은 담장 8칸
letter('B', 51, 7, 'climb'); // B: 높은 담장 위

// ── 구간 2 · 옥상 사이 (float / 오답 dance) ───────────────────────────
add('checkpoint', 92, STAND);
enemy('float', 98); // 소개
const g1 = gap(108, 113); // 짧은 틈 6칸(달려 뛰기 51px로는 못 건넘)
[
  [107, 13],
  [109, 12],
  [111, 12],
  [113, 13],
].forEach(([c, r]) => coin(c, r)); // float 경로
choose(116);
enemy('float', 122); // 고르기
enemy('dance', 128);
const g2 = gap(138, 151); // 넓은 틈 14칸
[
  [137, 13],
  [140, 12],
  [148, 12],
  [151, 13],
].forEach(([c, r]) => coin(c, r));
// R: 넓은 틈 한가운데 공중. 11행이면 float 없이 끝에서 뛰어서는 닿지 않는다(levelCheck 테스트로 확인)
letter('R', 144, 11, 'float');

// ── 구간 3 · 공사장 (break / 오답 brake) ──────────────────────────────
add('checkpoint', 182, STAND);
enemy('break', 188); // 소개
fill(198, 199, 0, STAND, 'X'); // 금 간 벽(천장까지)
letter('E', 203, STAND, 'break'); // E: 금 간 벽 너머
coinRow(201, 202);
choose(206);
enemy('break', 210); // 고르기: break와 brake가 함께
enemy('brake', 216);
fill(232, 233, 0, STAND, 'X');
letter('A', 237, STAND, 'break'); // A: 두 번째 금 간 벽 너머
coinRow(235, 236);
coinRow(238, 239);

// ── 구간 4 · 회사 앞 골목 (세 동사를 바꿔 가며) ────────────────────────
add('checkpoint', 272, STAND);
enemy('climb', 278);
enemy('sleep', 283);
coinColumn(291);
fill(292, 293, 9, STAND); // 담장 7칸
enemy('float', 300);
enemy('dance', 305);
const g3 = gap(312, 321); // 틈 10칸
[
  [311, 13],
  [314, 12],
  [317, 12],
  [320, 12],
  [322, 13],
].forEach(([c, r]) => coin(c, r));
enemy('break', 328);
enemy('brake', 333);
fill(344, 345, 0, STAND, 'X'); // 금 간 벽
coinRow(340, 342);
fill(350, 352, 12, 12, '-'); // 한 방향 발판 계단(짧게: 끝에서 걸어 내려온다)
coinRow(350, 352, 11);
fill(355, 357, 9, 9, '-');
letter('K', 356, 8, 'none'); // K: 골목에서 가장 높은 발판
add('door', 362, 12, {}, 2 * T, 4 * T); // 회사 문

for (const [c0, c1] of [g1, g2, g3]) add('ability-gap', c0, GROUND, {}, (c1 - c0 + 1) * T, 2 * T);

// ── 타일셋: 0 solid · 1 oneway · 2 cracked (회색 상자, 도트는 F12) ─────
const KINDS = { '#': 1, '-': 2, X: 3 }; // gid = firstgid(1) + tile id
const data = grid.flat().map((ch) => KINDS[ch] ?? 0);

const W = 3 * T;
const px = Buffer.alloc(W * T * 4);
const set = (x, y, [r, g, b, a = 255]) => px.set([r, g, b, a], (y * W + x) * 4);
for (let y = 0; y < T; y++) {
  for (let x = 0; x < T; x++) {
    set(x, y, [0x6b, 0x72, 0x80]); // solid
    if (y < 3) set(T + x, y, [0xa3, 0xa9, 0xb5]); // oneway(위 3px)
    set(2 * T + x, y, [0x8b, 0x73, 0x55]); // cracked
  }
}
for (let y = 2; y < 8; y++) set(2 * T + 2, y, [0x3b, 0x2f, 0x22]);
for (let x = 3; x < 7; x++) set(2 * T + x, 5, [0x3b, 0x2f, 0x22]);

const strProps = (props) =>
  Object.entries(props).map(([name, value]) => ({ name, type: 'string', value }));

const tmj = {
  compressionlevel: -1,
  width: COLS,
  height: ROWS,
  infinite: false,
  orientation: 'orthogonal',
  renderorder: 'right-down',
  tiledversion: '1.11.2',
  type: 'map',
  version: '1.10',
  tilewidth: T,
  tileheight: T,
  nextlayerid: 3,
  nextobjectid: objects.length + 1,
  properties: [{ name: 'note', type: 'string', value: 'scripts/gen-commute-map.mjs로 만든 초안' }],
  layers: [
    {
      id: 1,
      name: 'tiles',
      type: 'tilelayer',
      width: COLS,
      height: ROWS,
      x: 0,
      y: 0,
      opacity: 1,
      visible: true,
      data,
    },
    {
      id: 2,
      name: 'objects',
      type: 'objectgroup',
      draworder: 'topdown',
      x: 0,
      y: 0,
      opacity: 1,
      visible: true,
      objects: objects.map((o, i) => ({
        id: i + 1,
        name: o.props.verb ?? o.props.char ?? o.type,
        type: o.type,
        x: o.x,
        y: o.y,
        width: o.width,
        height: o.height,
        rotation: 0,
        visible: true,
        ...(Object.keys(o.props).length ? { properties: strProps(o.props) } : {}),
      })),
    },
  ],
  tilesets: [
    {
      firstgid: 1,
      name: 'graybox',
      image: 'graybox-tiles.png',
      imagewidth: W,
      imageheight: T,
      tilewidth: T,
      tileheight: T,
      tilecount: 3,
      columns: 3,
      margin: 0,
      spacing: 0,
      tiles: ['solid', 'oneway', 'cracked'].map((kind, id) => ({
        id,
        properties: [{ name: 'kind', type: 'string', value: kind }],
      })),
    },
  ],
};

writeFileSync(
  new URL('../public/maps/commute.tmj', import.meta.url),
  JSON.stringify(tmj, null, 1) + '\n',
);
writeFileSync(new URL('../public/maps/graybox-tiles.png', import.meta.url), png(W, T, px));
// 사람이 읽는 배치도(문서·리뷰용)
const ascii = grid.map((r) => r.join('')).join('\n');
writeFileSync(new URL('../docs/maps/commute.txt', import.meta.url), ascii + '\n');
console.log(`commute.tmj: ${COLS}x${ROWS} tiles, ${objects.length} objects`);
