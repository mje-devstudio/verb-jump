import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING, STEP_S, TILE, type Tuning } from '../../shared/rules/tuning';
import { parseAsciiMap, type TileMap } from '../level/tilemap';
import { createPlayer, NO_INPUT, stepPlayer, type PlayerInput, type PlayerState } from './player';

const T = DEFAULT_TUNING;

/** 넓은 평지. 시작 위치는 왼쪽. */
const FLAT = parseAsciiMap([
  '#                                                  #',
  '#                                                  #',
  '#                                                  #',
  '#                                                  #',
  '#                                                  #',
  '#                                                  #',
  '#                                                  #',
  '#                                                  #',
  '#P                                                 #',
  '####################################################',
]);

function settle(p: PlayerState, map: TileMap, t: Tuning = T) {
  for (let i = 0; i < 30; i++) stepPlayer(p, NO_INPUT, map, t, STEP_S);
  expect(p.onGround).toBe(true);
}

/** 입력 함수를 스텝마다 불러 n 스텝 진행. */
function run(p: PlayerState, map: TileMap, n: number, input: (i: number) => Partial<PlayerInput>) {
  for (let i = 0; i < n; i++) stepPlayer(p, { ...NO_INPUT, ...input(i) }, map, T, STEP_S);
}

/** 점프 뒤 가장 높이 올라간 높이(px). */
function apexHeight(holdSteps: number): number {
  const { map, spawn } = FLAT;
  const p = createPlayer(spawn);
  settle(p, map);
  const ground = p.y;
  let top = p.y;
  for (let i = 0; i < 120; i++) {
    stepPlayer(p, { ...NO_INPUT, jumpPressed: i === 0, jumpHeld: i < holdSteps }, map, T, STEP_S);
    top = Math.min(top, p.y);
  }
  return ground - top;
}

describe('F05 이동과 점프', () => {
  // 1/60초 시뮬레이션 값(실험실과 같은 계산). 연속 공식으로는 45.1px·7.2px다.
  it('끝까지 누르면 최고 높이가 42.75px이다(연속 공식 약 45px)', () => {
    expect(apexHeight(120)).toBeCloseTo(42.75, 2);
  });

  it('짧게 누르면(누르자마자 뗌) 6.3px만 뛴다(연속 공식 약 7px)', () => {
    expect(apexHeight(0)).toBeCloseTo(6.3, 2);
  });

  it('누르는 길이가 길수록 높이 뛴다', () => {
    const hs = [0, 5, 10, 20].map(apexHeight);
    for (let i = 1; i < hs.length; i++) expect(hs[i]).toBeGreaterThan(hs[i - 1] ?? 0);
  });

  it('가속해서 최고 속도에 닿고, 손을 떼면 감속해 멈춘다', () => {
    const { map, spawn } = FLAT;
    const p = createPlayer(spawn);
    settle(p, map);
    run(p, map, 1, () => ({ right: true }));
    expect(p.vx).toBeCloseTo(T.accel * STEP_S, 5);
    run(p, map, 60, () => ({ right: true }));
    expect(p.vx).toBe(T.maxSpeed);
    run(p, map, 30, () => ({}));
    expect(p.vx).toBe(0);
  });

  it('공중에서는 airControl 배율로 덜 가속한다', () => {
    const { map, spawn } = FLAT;
    const p = createPlayer(spawn);
    settle(p, map);
    run(p, map, 1, () => ({ jumpPressed: true, jumpHeld: true }));
    const before = p.vx;
    run(p, map, 1, () => ({ right: true, jumpHeld: true }));
    expect(p.vx - before).toBeCloseTo(T.accel * T.airControl * STEP_S, 5);
  });

  it('최대 낙하 속도를 넘지 않는다', () => {
    const tall = parseAsciiMap(['P', ...Array.from({ length: 200 }, () => ' '), '#']);
    const p = createPlayer(tall.spawn);
    let maxVy = 0;
    run(p, tall.map, 300, () => ({}));
    for (let i = 0; i < 100 && !p.onGround; i++) {
      stepPlayer(p, NO_INPUT, tall.map, T, STEP_S);
      maxVy = Math.max(maxVy, p.vy);
    }
    expect(maxVy).toBeLessThanOrEqual(T.maxFall);
    expect(maxVy).toBe(T.maxFall);
  });

  it('벽에 막히고 막힌 방향을 알려준다', () => {
    const { map, spawn } = parseAsciiMap(['#     #', '#P  # #', '#######']);
    const p = createPlayer(spawn);
    settle(p, map);
    run(p, map, 60, () => ({ right: true }));
    expect(p.x).toBe(4 * TILE - p.w);
    expect(p.wall).toBe(1);
  });

  it('천장에 머리를 부딪히면 올라가던 속도가 사라진다', () => {
    const { map, spawn } = parseAsciiMap(['#####', '#   #', '#   #', '#P  #', '#####']);
    const p = createPlayer(spawn);
    settle(p, map);
    run(p, map, 6, (i) => ({ jumpPressed: i === 0, jumpHeld: true }));
    expect(p.y).toBeGreaterThanOrEqual(TILE);
    expect(p.vy).toBeGreaterThanOrEqual(0);
  });
});

describe('F05 발판 끝 유예와 미리 누른 점프', () => {
  /** 발판 끝으로 걸어가 땅을 떠난 스텝을 찾는다. */
  const LEDGE = parseAsciiMap([
    '#                            #',
    '#                            #',
    '#                            #',
    '#                            #',
    '#                            #',
    '#P                           #',
    '#####                        #',
    '#                            #',
    '#                            #',
    '#                            #',
    '#                            #',
    '#                            #',
    '#                            #',
    '##############################',
  ]);

  function jumpAfterLeaving(delayS: number): boolean {
    const { map, spawn } = LEDGE;
    const p = createPlayer(spawn);
    settle(p, map);
    let left = -1;
    for (let i = 0; i < 300; i++) {
      const pressNow = left >= 0 && i === left + Math.round(delayS / STEP_S);
      stepPlayer(
        p,
        { ...NO_INPUT, right: true, jumpPressed: pressNow, jumpHeld: pressNow },
        map,
        T,
        STEP_S,
      );
      if (pressNow) return p.vy < 0;
      if (left < 0 && !p.onGround) left = i;
    }
    throw new Error('발판 끝을 지나지 못했습니다');
  }

  it('발판 끝을 지나 0.09초 뒤 누르면 점프한다', () => {
    expect(jumpAfterLeaving(0.09)).toBe(true);
  });

  it('0.11초 뒤 누르면 점프하지 않는다', () => {
    expect(jumpAfterLeaving(0.11)).toBe(false);
  });

  it('모바일 유예(0.15초)에서는 0.11초 뒤 눌러도 점프한다', () => {
    const { map, spawn } = LEDGE;
    const mobile = { ...T, coyoteMs: 150 };
    const p = createPlayer(spawn);
    settle(p, map, mobile);
    let left = -1;
    let jumped = false;
    for (let i = 0; i < 300; i++) {
      const pressNow = left >= 0 && i === left + Math.round(0.11 / STEP_S);
      stepPlayer(
        p,
        { ...NO_INPUT, right: true, jumpPressed: pressNow, jumpHeld: true },
        map,
        mobile,
        STEP_S,
      );
      if (pressNow) {
        jumped = p.vy < 0;
        break;
      }
      if (left < 0 && !p.onGround) left = i;
    }
    expect(jumped).toBe(true);
  });

  it('유예 시간 안에 한 번 점프하면 공중에서 다시 점프할 수 없다', () => {
    const { map, spawn } = FLAT;
    const p = createPlayer(spawn);
    settle(p, map);
    run(p, map, 1, () => ({ jumpPressed: true, jumpHeld: true }));
    const vyAfterFirst = p.vy;
    run(p, map, 1, () => ({ jumpPressed: true, jumpHeld: true }));
    expect(p.vy).toBeGreaterThan(vyAfterFirst); // 중력만 더해짐
  });

  /** 높은 곳에서 떨어뜨려 착지 스텝을 찾은 뒤, 착지 delayS 전에 점프를 눌러 본다. */
  function bufferedJump(delayS: number): boolean {
    const { map, spawn } = FLAT;
    const drop = () => {
      const p = createPlayer(spawn);
      p.y -= 50;
      return p;
    };
    const probe = drop();
    let land = -1;
    for (let i = 0; i < 200 && land < 0; i++) {
      stepPlayer(probe, NO_INPUT, map, T, STEP_S);
      if (probe.onGround) land = i;
    }
    // 착지 판정은 스텝 land 끝에 나므로 착지 시각은 land+1 스텝째다.
    const pressAt = land + 1 - Math.round(delayS / STEP_S);
    const p = drop();
    for (let i = 0; i <= land + 1; i++) {
      stepPlayer(p, { ...NO_INPUT, jumpPressed: i === pressAt, jumpHeld: true }, map, T, STEP_S);
    }
    return p.vy < 0;
  }

  it('착지 0.09초 전에 누른 점프도 인정한다', () => {
    expect(bufferedJump(0.09)).toBe(true);
  });

  it('착지 0.11초 전에 누른 점프는 인정하지 않는다', () => {
    expect(bufferedJump(0.11)).toBe(false);
  });
});

describe('F25 한 방향 발판', () => {
  const ONE_WAY = parseAsciiMap([
    '#          #',
    '#          #',
    '#          #',
    '#   ----   #',
    '#          #',
    '#          #',
    '#  P       #',
    '############',
  ]);

  it('아래에서 뛰면 뚫고 올라가 위에 선다', () => {
    const { map } = ONE_WAY;
    const p = createPlayer({ x: 4 * TILE, y: 6 * TILE });
    settle(p, map);
    let passedAbove = false;
    for (let i = 0; i < 90; i++) {
      stepPlayer(p, { ...NO_INPUT, jumpPressed: i === 0, jumpHeld: true }, map, T, STEP_S);
      if (p.y + p.h < 3 * TILE) passedAbove = true;
    }
    expect(passedAbove).toBe(true);
    expect(p.onGround).toBe(true);
    expect(p.y + p.h).toBe(3 * TILE);
  });

  it('위에서 내려오면 착지한다', () => {
    const { map } = ONE_WAY;
    const p = createPlayer({ x: 5 * TILE, y: 0 });
    run(p, map, 60, () => ({}));
    expect(p.onGround).toBe(true);
    expect(p.y + p.h).toBe(3 * TILE);
  });

  it('옆으로는 막지 않는다', () => {
    const { map } = ONE_WAY;
    // 몸통이 발판 높이에 걸치도록 공중에 띄운 채 옆으로 지나간다
    const p = createPlayer({ x: 1 * TILE, y: 3 * TILE });
    p.y = 3 * TILE - 4;
    p.vx = T.maxSpeed;
    stepPlayer(p, { ...NO_INPUT, right: true }, map, { ...T, gravity: 0 }, STEP_S);
    for (let i = 0; i < 50; i++) {
      stepPlayer(p, { ...NO_INPUT, right: true }, map, { ...T, gravity: 0 }, STEP_S);
    }
    expect(p.wall).toBe(0);
    expect(p.x).toBeGreaterThan(8 * TILE);
  });

  it('발판 위에서 걸어 나가면 떨어진다', () => {
    const { map } = ONE_WAY;
    const p = createPlayer({ x: 5 * TILE, y: 0 });
    run(p, map, 30, () => ({}));
    run(p, map, 60, () => ({ right: true }));
    expect(p.y + p.h).toBe(7 * TILE);
  });
});
