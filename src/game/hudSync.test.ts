import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_TUNING as T, STEP_S, TILE } from '../shared/rules/tuning';
import { COMMUTE_VERBS } from './data/verbs';
import { syncHud } from './hudSync';
import { NO_CONTROLS } from './input';
import { parseAsciiMap } from './level/tilemap';
import { createGameStore } from './store';
import { createWorld, stepWorld } from './world';

function setup() {
  const { map, spawn } = parseAsciiMap(['#            #', '#P           #', '##############']);
  const world = createWorld({
    map,
    spawn,
    enemies: [],
    checkpoints: [spawn],
    verbs: COMMUTE_VERBS,
    letters: [{ char: 'B', x: 3 * TILE, y: TILE }],
    spellWord: 'BREAK',
  });
  const store = createGameStore();
  const listener = vi.fn();
  store.subscribe(listener);
  let id = 0;
  const sync = () => syncHud(world, store, { nextCardId: () => ++id });
  return { world, store, listener, sync };
}

describe('F09 게임 루프 → HUD', () => {
  it('그리기 프레임마다 불러도 값이 바뀔 때만 알린다(시계는 초가 바뀔 때만)', () => {
    const { world, listener, sync } = setup();
    sync(); // 처음: 철자 표시가 채워진다
    const first = listener.mock.calls.length;
    for (let i = 0; i < 30; i++) {
      stepWorld(world, NO_CONTROLS, T, STEP_S);
      sync();
    }
    expect(listener.mock.calls.length).toBe(first); // 0.5초: 시계 문자열 그대로
    for (let i = 0; i < 31; i++) {
      stepWorld(world, NO_CONTROLS, T, STEP_S);
      sync();
    }
    expect(listener.mock.calls.length).toBe(first + 1); // 1초가 넘어가 시계만 한 번
  });

  it('철자 코인을 주우면 철자 표시가 바뀐다', () => {
    const { world, store, sync } = setup();
    for (let i = 0; i < 40; i++) stepWorld(world, { ...NO_CONTROLS, right: true }, T, STEP_S);
    sync();
    expect(store.getSnapshot().spell).toBe('B _ _ _ _');
  });
});
