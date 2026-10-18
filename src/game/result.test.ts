import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING as T, STEP_S, TILE } from '../shared/rules/tuning';
import { COMMUTE_VERBS } from './data/verbs';
import { NO_CONTROLS } from './input';
import { parseAsciiMap } from './level/tilemap';
import { buildResult } from './result';
import { createWorld, stepWorld, type World } from './world';

function stomp(w: World, i: number) {
  const e = w.enemies[i];
  if (!e) throw new Error('적이 없습니다');
  w.player.x = e.x + 1;
  w.player.y = e.y - 30;
  for (let k = 0; k < 40 && e.alive; k++) stepWorld(w, NO_CONTROLS, T, STEP_S);
}

describe('F11 결과 데이터', () => {
  it('얻은 맞는 동사·오답 동사를 처음 얻은 순서로, 중복 없이 모은다', () => {
    const { map, spawn } = parseAsciiMap([
      '#                                        #',
      '#                                        #',
      '#                                        #',
      '#P                                       #',
      '##########################################',
    ]);
    const w = createWorld({
      map,
      spawn,
      checkpoints: [spawn],
      verbs: COMMUTE_VERBS,
      enemies: [
        { verb: 'brake', col: 8, row: 3 },
        { verb: 'break', col: 20, row: 3 },
        { verb: 'brake', col: 32, row: 3 },
      ],
      door: { x: 38 * TILE, y: 0, w: 10, h: 40 },
      spellWord: 'BREAK',
    });
    stomp(w, 0);
    stomp(w, 1);
    stomp(w, 2);
    w.coins = 12;
    w.player.x = 37 * TILE;
    for (let i = 0; i < 30 && !w.cleared; i++)
      stepWorld(w, { ...NO_CONTROLS, right: true }, T, STEP_S);
    expect(w.cleared).toBe(true);
    const r = buildResult(w);
    expect(r.learned.map((v) => v.verb)).toEqual(['break']);
    expect(r.wrong.map((v) => v.verb)).toEqual(['brake']);
    expect(r.wrong[0]?.entry.confusedWith).toBe('break');
    expect(r.coins).toBe(12);
    expect(r.score.coin).toBe(120);
    expect(r.wordComplete).toBe(false);
    expect(r.spell).toBe('_ _ _ _ _');
    expect(r.score.onTime).toBe(true);
    expect(r.arrival.startsWith('8:57:')).toBe(true);
  });
});
