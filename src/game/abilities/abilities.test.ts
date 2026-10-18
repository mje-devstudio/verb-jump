import { describe, expect, it, vi } from 'vitest';
import { SLEEP_CLOCK_PENALTY_MS, SLEEP_MS, FLOAT_MAX_FALL } from '../../shared/rules/abilities';
import { DEFAULT_TUNING as T, STEP_S, TILE } from '../../shared/rules/tuning';
import { NO_CONTROLS, type ControlSnapshot } from '../input';
import { parseAsciiMap, Tile, tileAt } from '../level/tilemap';
import type { LevelDef, World } from '../world';
import { createWorld, drainEvents, gainVerb, stepWorld } from '../world';
import { COMMUTE_VERBS } from '../data/verbs';
import { ABILITIES } from './registry';
import { ABILITY_IDS, type AbilityModule } from './types';

function level(lines: string[]): LevelDef {
  const { map, spawn } = parseAsciiMap(lines);
  return { map, spawn, enemies: [], checkpoints: [spawn], verbs: COMMUTE_VERBS };
}

function withVerb(lines: string[], verb: string): World {
  const w = createWorld(level(lines));
  for (let i = 0; i < 20; i++) stepWorld(w, NO_CONTROLS, T, STEP_S); // 착지
  stepWorldGain(w, verb);
  return w;
}

function stepWorldGain(w: World, verb: string) {
  // 적 없이 능력만 주기: world의 공개 함수로 같은 경로를 탄다.
  gainVerb(w, verb, {
    player: w.player,
    map: w.map,
    tuning: T,
    dt: STEP_S,
    verbHeld: false,
    breakCrackedAt: () => 0,
    emit: () => {},
  });
  drainEvents(w);
}

function run(
  w: World,
  n: number,
  input: Partial<ControlSnapshot> | ((i: number) => Partial<ControlSnapshot>),
) {
  for (let i = 0; i < n; i++) {
    const inp = typeof input === 'function' ? input(i) : input;
    stepWorld(w, { ...NO_CONTROLS, ...inp }, T, STEP_S);
  }
}

/** 7칸 높이, 3칸 폭 벽. */
const WALL = [
  '#               #',
  '#               #',
  '#               #',
  '#      ###      #',
  '#      ###      #',
  '#      ###      #',
  '#      ###      #',
  '#      ###      #',
  '#      ###      #',
  '#   P  ###      #',
  '#################',
];

describe('F07 능력 모듈 공통 틀', () => {
  it('6개 능력이 모두 등록되어 있고 공통 틀을 따른다', () => {
    expect(Object.keys(ABILITIES).sort()).toEqual([...ABILITY_IDS].sort());
    for (const id of ABILITY_IDS) {
      const mod: AbilityModule = ABILITIES[id];
      const a = mod.create();
      expect(a.id).toBe(id);
      for (const hook of [
        'onGain',
        'onVerbDown',
        'onVerbUp',
        'update',
        'onLose',
        'pose',
      ] as const) {
        expect(typeof a[hook]).toBe('function');
      }
    }
  });

  it('맞는 동사 3개와 오답 3개로 나뉜다', () => {
    const correct = ABILITY_IDS.filter((id) => ABILITIES[id].correct);
    expect(correct.sort()).toEqual(['break', 'climb', 'float']);
  });

  it('능력은 하나만: 새 동사를 얻으면 이전 능력과 바뀐다', () => {
    const w = withVerb(WALL, 'climb');
    expect(w.ability?.id).toBe('climb');
    stepWorldGain(w, 'dance');
    expect(w.ability?.id).toBe('joke-dance');
    expect(w.verb).toBe('dance');
  });
});

describe('F07 수명 주기 호출 순서', () => {
  it('바뀔 때 이전 능력 onLose → 새 능력 onGain, 버튼은 onVerbDown/onVerbUp, 매 프레임 update', () => {
    const w = withVerb(WALL, 'climb');
    const old = w.ability;
    if (!old) throw new Error('능력이 없습니다');
    const calls: string[] = [];
    const spy = <A extends unknown[], R>(name: string, fn: (...a: A) => R) =>
      vi.fn((...a: A): R => {
        calls.push(name);
        return fn(...a);
      });
    old.onVerbDown = spy('down', old.onVerbDown.bind(old));
    old.onVerbUp = spy('up', old.onVerbUp.bind(old));
    old.update = spy('update', old.update.bind(old));
    old.onLose = spy('lose', old.onLose.bind(old));
    run(w, 1, { verbPressed: true, verbHeld: true });
    run(w, 1, {});
    stepWorldGain(w, 'float');
    expect(calls).toEqual(['down', 'update', 'up', 'update', 'lose']);
    expect(w.ability).not.toBe(old);
  });
});

describe('F07 climb', () => {
  it('벽 앞에서 누르고 있는 동안 오르고, 꼭대기에 올라선다', () => {
    const w = withVerb(WALL, 'climb');
    run(w, 60, { right: true }); // 벽까지 걸어가기
    const y0 = w.player.y;
    run(w, 10, { right: true, verbHeld: true, verbPressed: false });
    expect(w.player.y).toBeLessThan(y0 - 5);
    expect(w.ability?.pose()).toBe('climb');
    let stoodOnTop = false;
    for (let i = 0; i < 200 && !stoodOnTop; i++) {
      run(w, 1, { right: true, verbHeld: true });
      stoodOnTop = w.player.onGround && w.player.y + w.player.h === 3 * TILE; // 7칸 벽 꼭대기
    }
    expect(stoodOnTop).toBe(true);
  });

  it('버튼을 떼면 더 오르지 않고 떨어진다', () => {
    const w = withVerb(WALL, 'climb');
    run(w, 60, { right: true });
    run(w, 20, { right: true, verbHeld: true });
    run(w, 1, { right: true });
    run(w, 5, { right: true });
    expect(w.player.vy).toBeGreaterThan(0);
  });

  it('climb가 없으면 벽 앞에서 X를 눌러도 오르지 못한다', () => {
    const w = withVerb(WALL, 'sleep');
    run(w, 60, { right: true });
    const y0 = w.player.y;
    run(w, 30, { right: true, verbHeld: true });
    expect(w.player.y).toBe(y0);
  });
});

describe('F07 float', () => {
  const SKY = ['P', ...Array.from({ length: 40 }, () => ' '), '#'];
  it('공중에서 누르고 있으면 낙하 속도가 제한된다', () => {
    const w = withVerb(SKY, 'float');
    run(w, 30, { verbHeld: true });
    expect(w.player.vy).toBeLessThanOrEqual(FLOAT_MAX_FALL);
    expect(w.ability?.pose()).toBe('float');
    run(w, 30, {});
    expect(w.player.vy).toBeGreaterThan(FLOAT_MAX_FALL);
  });
});

describe('F07 break와 오답 brake', () => {
  const CRACKED = ['#         #', '#     X   #', '#     X   #', '#  P  X   #', '###########'];
  it('break는 금 간 벽 앞에서 누르면 이어진 금 간 벽을 모두 부순다', () => {
    const w = withVerb(CRACKED, 'break');
    run(w, 60, { right: true });
    run(w, 1, { verbPressed: true, verbHeld: true });
    for (const r of [1, 2, 3]) expect(tileAt(w.map, 6, r)).toBe(Tile.Empty);
    expect(w.mapVersion).toBe(1);
    expect(drainEvents(w)).toContainEqual({
      type: 'ability_used',
      ability: 'break',
      success: true,
    });
  });

  it('break를 허공에 쓰면 아무것도 부수지 않는다', () => {
    const w = withVerb(CRACKED, 'break');
    run(w, 1, { verbPressed: true, verbHeld: true });
    expect(tileAt(w.map, 6, 3)).toBe(Tile.Cracked);
    expect(w.mapVersion).toBe(0);
  });

  it('brake는 달리다 즉시 멈추기만 하고 벽은 그대로다', () => {
    const w = withVerb(CRACKED, 'brake');
    run(w, 8, { right: true });
    expect(w.player.vx).toBeGreaterThan(0);
    run(w, 1, { right: true, verbPressed: true, verbHeld: true });
    expect(w.player.vx).toBe(0);
    expect(w.ability?.pose()).toBe('skid');
    run(w, 60, { right: true });
    run(w, 1, { verbPressed: true, verbHeld: true });
    expect(tileAt(w.map, 6, 3)).toBe(Tile.Cracked);
  });

  it('레벨 원본 맵은 부서지지 않는다(다시 시작하면 벽이 돌아온다)', () => {
    const w = withVerb(CRACKED, 'break');
    run(w, 60, { right: true });
    run(w, 1, { verbPressed: true, verbHeld: true });
    expect(tileAt(w.level.map, 6, 3)).toBe(Tile.Cracked);
  });
});

describe('F07 오답 sleep·dance', () => {
  const FLAT = ['#                    #', '#  P                 #', '######################'];
  it('sleep은 2초 동안 움직이지 못하고 시계가 3초 더 흐른다', () => {
    const w = withVerb(FLAT, 'sleep');
    run(w, 1, { verbPressed: true, verbHeld: true });
    expect(w.clockPenaltyMs).toBe(SLEEP_CLOCK_PENALTY_MS);
    const x0 = w.player.x;
    run(w, Math.round(SLEEP_MS / 1000 / STEP_S) - 2, { right: true });
    expect(w.player.x).toBe(x0);
    expect(w.ability?.pose()).toBe('sleep');
    run(w, 10, { right: true });
    expect(w.player.x).toBeGreaterThan(x0);
  });

  it('자는 동안 다시 눌러도 벌칙이 겹치지 않는다', () => {
    const w = withVerb(FLAT, 'sleep');
    run(w, 1, { verbPressed: true, verbHeld: true });
    run(w, 10, (i) => ({ verbPressed: i % 3 === 0, verbHeld: true }));
    expect(w.clockPenaltyMs).toBe(SLEEP_CLOCK_PENALTY_MS);
  });

  it('dance는 제자리에서 춤만 춘다', () => {
    const w = withVerb(FLAT, 'dance');
    run(w, 20, { right: true });
    run(w, 1, { right: true, verbPressed: true, verbHeld: true });
    const x0 = w.player.x;
    run(w, 30, { right: true, jumpPressed: true, jumpHeld: true });
    expect(w.player.x).toBe(x0);
    expect(w.player.onGround).toBe(true);
    expect(w.ability?.pose()).toBe('dance');
  });
});
