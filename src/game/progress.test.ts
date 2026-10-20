import { describe, expect, it } from 'vitest';
import { HURT_INVINCIBLE_MS, SLEEP_CLOCK_PENALTY_MS } from '../shared/rules/abilities';
import { formatClock } from '../shared/rules/clock';
import { LIVES_MAX, SPILL_MAX, SPILL_PICKUP_WINDOW_MS } from '../shared/rules/game';
import { DEFAULT_TUNING as T, STEP_S, TILE } from '../shared/rules/tuning';
import { ABILITIES } from './abilities/registry';
import { COMMUTE_VERBS } from './data/verbs';
import { NO_CONTROLS, type ControlSnapshot } from './input';
import { parseAsciiMap } from './level/tilemap';
import {
  createWorld,
  drainEvents,
  SPILLED_LIVE_MAX,
  stepWorld,
  worldClock,
  type LevelDef,
  type World,
} from './world';

const LINES = [
  '#                                        #',
  '#                                        #',
  '#                                        #',
  '#                                        #',
  '#                                        #',
  '#  P                                     #',
  '##########################################',
];

function lvl(extra: Partial<LevelDef> = {}): LevelDef {
  const { map, spawn } = parseAsciiMap(LINES);
  return { map, spawn, enemies: [], checkpoints: [spawn], verbs: COMMUTE_VERBS, ...extra };
}
function run(w: World, n: number, input: Partial<ControlSnapshot> = {}) {
  for (let i = 0; i < n; i++) stepWorld(w, { ...NO_CONTROLS, ...input }, T, STEP_S);
}
/** 주인공 옆으로 적을 붙여 한 번 맞게 한다. */
function hitOnce(w: World) {
  const e = w.enemies[0];
  if (!e) throw new Error('적이 없습니다');
  e.x = w.player.x + w.player.w - 1;
  e.y = w.player.y + w.player.h - e.h;
  run(w, 1);
}

describe('F26 코인과 피격 (게임 세계)', () => {
  it('코인을 지나가면 하나씩 줍는다', () => {
    const w = createWorld(lvl({ coins: [5, 6, 7].map((c) => ({ x: c * TILE, y: 5 * TILE })) }));
    run(w, 60, { right: true });
    expect(w.coins).toBe(3);
    expect(w.coinTaken).toEqual([true, true, true]);
  });

  it('코인 15개에서 맞으면 10개를 흘리고 5개와 생명을 지킨다', () => {
    const w = createWorld(lvl({ enemies: [{ verb: 'sleep', col: 30, row: 5 }] }));
    run(w, 10);
    w.coins = 15;
    hitOnce(w);
    expect(w.coins).toBe(5);
    expect(w.lives).toBe(3);
    expect(w.spilled).toHaveLength(10);
  });

  it('흘린 코인은 2초 안에만 다시 줍고, 그 뒤 사라진다', () => {
    const w = createWorld(lvl({ enemies: [{ verb: 'sleep', col: 30, row: 5 }] }));
    run(w, 10);
    w.coins = 3;
    hitOnce(w);
    expect(w.spilled).toHaveLength(3);
    run(w, Math.ceil(SPILL_PICKUP_WINDOW_MS / 1000 / STEP_S) + 2);
    expect(w.spilled).toHaveLength(0);
  });

  it('무적이 끝나자마자 또 맞아도 흘린 코인은 화면에 그릴 수 있는 수를 넘지 않는다', () => {
    const w = createWorld(lvl({ enemies: [{ verb: 'sleep', col: 30, row: 5 }] }));
    run(w, 10);
    w.coins = 30;
    hitOnce(w);
    // 흘린 코인을 줍지 않도록 멀리 옮겨 두고 무적이 끝날 때까지 기다린다
    w.player.x += 15 * TILE;
    w.prev.x = w.player.x;
    run(w, Math.ceil(HURT_INVINCIBLE_MS / 1000 / STEP_S) + 1);
    const first = w.spilled.length;
    hitOnce(w);
    expect(first).toBeGreaterThan(0);
    // 앞서 흘린 코인이 남아 있어 한 번에 흘리는 최대치(10)를 넘는다 → 렌더러 풀은 SPILLED_LIVE_MAX로 만든다
    expect(w.spilled.length).toBeGreaterThan(SPILL_MAX);
    expect(w.spilled.length).toBeLessThanOrEqual(SPILLED_LIVE_MAX);
  });

  it('흘린 코인 위를 지나가면 다시 줍는다', () => {
    const w = createWorld(lvl({ enemies: [{ verb: 'sleep', col: 30, row: 5 }] }));
    run(w, 10);
    w.coins = 10;
    hitOnce(w);
    for (const e of w.enemies) e.alive = false;
    run(w, 40); // 코인이 땅에 떨어질 때까지
    const xs = w.spilled.map((c) => c.x);
    w.player.x = Math.min(...xs) - 12;
    run(w, 30, { right: true });
    expect(w.coins).toBeGreaterThan(0);
  });

  it('코인 0개에서 맞으면 생명 -1, 1초 무적', () => {
    const w = createWorld(lvl({ enemies: [{ verb: 'sleep', col: 30, row: 5 }] }));
    run(w, 10);
    hitOnce(w);
    expect(w.lives).toBe(2);
    hitOnce(w);
    expect(w.lives).toBe(2);
  });

  it('생명이 0이 되면 체크포인트에서 생명 3개·코인 0개로 다시 시작하고, 시계와 철자는 그대로다', () => {
    const w = createWorld(
      lvl({
        enemies: [{ verb: 'sleep', col: 30, row: 5 }],
        letters: [{ char: 'B', x: 4 * TILE, y: 5 * TILE }],
        spellWord: 'BREAK',
      }),
    );
    run(w, 30, { right: true }); // B를 줍는다
    expect(w.letterGot[0]).toBe(true);
    w.lives = 1;
    const clockBefore = worldClock(w);
    hitOnce(w);
    expect(w.lives).toBe(3);
    expect(w.coins).toBe(0);
    expect(w.player.x).toBe(w.level.spawn.x);
    expect(w.letterGot[0]).toBe(true);
    expect(worldClock(w)).toBeGreaterThan(clockBefore);
    expect(drainEvents(w).map((e) => e.type)).toContain('game_over');
  });

  it('졸고 있는 중에 게임오버가 나면 다시 시작한 자리에서 바로 움직인다(동사는 유지, 리뷰 7)', () => {
    const w = createWorld(lvl({ enemies: [{ verb: 'sleep', col: 30, row: 5 }] }));
    run(w, 10);
    w.ability = ABILITIES['joke-sleep'].create();
    w.verb = 'sleep';
    run(w, 1, { verbPressed: true, verbHeld: true }); // 2초 졸기 시작
    w.lives = 1;
    w.coins = 0;
    hitOnce(w);
    expect(drainEvents(w).map((e) => e.type)).toContain('game_over');
    expect(w.verb).toBe('sleep');
    const x = w.player.x;
    run(w, 30, { right: true });
    expect(w.player.x).toBeGreaterThan(x + 5);
  });

  it('구멍에 빠지면 생명 -1이고 코인은 그대로다', () => {
    const { map, spawn } = parseAsciiMap(['#     #', '#P    #', '###  ##']);
    const w = createWorld({ map, spawn, enemies: [], checkpoints: [spawn], verbs: COMMUTE_VERBS });
    w.coins = 7;
    w.player.x = 3 * TILE;
    for (let i = 0; i < 200 && w.falls === 0; i++) run(w, 1);
    expect(w.lives).toBe(2);
    expect(w.coins).toBe(7);
  });
});

describe('F27 철자 코인 (게임 세계)', () => {
  const letters = 'BREAK'
    .split('')
    .map((char, i) => ({ char, x: (5 + i * 2) * TILE, y: 5 * TILE }));

  it('다섯 개를 모두 모으면 단어 완성 알림, 생명 +1', () => {
    const w = createWorld(lvl({ letters, spellWord: 'BREAK' }));
    const events: string[] = [];
    for (let i = 0; i < 120; i++) {
      run(w, 1, { right: true });
      for (const e of drainEvents(w)) events.push(e.type);
    }
    expect(events.filter((t) => t === 'letter_collected')).toHaveLength(5);
    expect(events).toContain('word_completed');
    expect(w.lives).toBe(4);
  });

  it('생명은 최대 5개를 넘지 않는다', () => {
    const w = createWorld(lvl({ letters, spellWord: 'BREAK' }));
    w.lives = LIVES_MAX;
    run(w, 120, { right: true });
    expect(w.lives).toBe(LIVES_MAX);
  });

  it('맞아도 철자는 그대로다', () => {
    const w = createWorld(
      lvl({ letters, spellWord: 'BREAK', enemies: [{ verb: 'sleep', col: 30, row: 5 }] }),
    );
    run(w, 60, { right: true });
    const got = [...w.letterGot];
    w.coins = 5;
    hitOnce(w);
    expect(w.letterGot).toEqual(got);
  });

  it('spellWord가 없으면 철자 코인을 x 순서로 이은 단어를 쓴다', () => {
    const w = createWorld(lvl({ letters: [...letters].reverse() }));
    expect(w.spellWord).toBe('BREAK');
  });
});

describe('시계 (게임 세계)', () => {
  it('진행한 시간만큼 흐르고 sleep 벌칙만큼 더 흐른다', () => {
    const w = createWorld(lvl());
    expect(formatClock(worldClock(w))).toBe('8:57:00');
    run(w, 60);
    expect(formatClock(worldClock(w))).toBe('8:57:01');
    w.clockPenaltyMs += SLEEP_CLOCK_PENALTY_MS;
    expect(formatClock(worldClock(w))).toBe('8:57:04');
  });

  it('클리어 뒤에는 시계가 멈춘다', () => {
    const w = createWorld(lvl({ door: { x: 6 * TILE, y: 3 * TILE, w: 10, h: 30 } }));
    run(w, 120, { right: true });
    expect(w.cleared).toBe(true);
    const c = worldClock(w);
    run(w, 120);
    expect(worldClock(w)).toBe(c);
  });
});
