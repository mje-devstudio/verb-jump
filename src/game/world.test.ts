import { describe, expect, it } from 'vitest';
import { ENEMY_RESPAWN_MS, HURT_INVINCIBLE_MS } from '../shared/rules/abilities';
import { DEFAULT_TUNING as T, STEP_S, TILE } from '../shared/rules/tuning';
import { COMMUTE_VERBS } from './data/verbs';
import { NO_CONTROLS, type ControlSnapshot } from './input';
import { parseAsciiMap } from './level/tilemap';
import { createWorld, drainEvents, stepWorld, type LevelDef, type World } from './world';

const LINES = [
  '#                              #',
  '#                              #',
  '#                              #',
  '#                              #',
  '#                              #',
  '#  P                           #',
  '#############    ###############',
];

function lvl(enemies: LevelDef['enemies']): LevelDef {
  const { map, spawn } = parseAsciiMap(LINES);
  return { map, spawn, enemies, checkpoints: [spawn], verbs: COMMUTE_VERBS };
}

function enemy(w: World) {
  const e = w.enemies[0];
  if (!e) throw new Error('적이 없습니다');
  return e;
}

function run(w: World, n: number, input: Partial<ControlSnapshot>) {
  for (let i = 0; i < n; i++) stepWorld(w, { ...NO_CONTROLS, ...input }, T, STEP_S);
}

describe('F06 밟기와 동사 얻기', () => {
  it('위에서 밟으면 적이 사라지고 동사 능력을 얻으며 알림이 나간다', () => {
    const w = createWorld(lvl([{ verb: 'climb', col: 3, row: 5 }]));
    // 적 바로 위에서 떨어뜨린다
    w.player.x = enemy(w).x + 1;
    w.player.y = enemy(w).y - 30;
    run(w, 30, {});
    expect(enemy(w).alive).toBe(false);
    expect(w.verb).toBe('climb');
    expect(w.ability?.id).toBe('climb');
    expect(drainEvents(w)).toContainEqual({
      type: 'verb_gained',
      verb: 'climb',
      ability: 'climb',
      correct: true,
    });
  });

  it('겹친 두 적을 위에서 밟으면 하나의 동사만 얻고 피격되지 않는다(리뷰 1)', () => {
    const w = createWorld(
      lvl([
        { verb: 'climb', col: 3, row: 5 },
        { verb: 'sleep', col: 3, row: 5 },
      ]),
    );
    const e = enemy(w);
    w.player.x = e.x + 1;
    w.player.y = e.y - 30;
    run(w, 30, {});
    const events = drainEvents(w);
    // 처음 밟은 climb을 얻고, 튀어 오른 뒤 다시 떨어져 sleep을 밟을 수는 있지만 피격은 없다
    expect(events.find((ev) => ev.type === 'verb_gained')).toMatchObject({ verb: 'climb' });
    expect(events.map((ev) => ev.type)).not.toContain('hurt');
    expect(w.lives).toBe(3);
  });

  it('옆에 닿으면 피격: 1초 무적 동안은 다시 맞지 않는다', () => {
    const w = createWorld(lvl([{ verb: 'sleep', col: 8, row: 5 }]));
    run(w, 10, {});
    let firstHurt = -1;
    for (let i = 0; i < 120 && firstHurt < 0; i++) {
      run(w, 1, { right: true });
      if (drainEvents(w).some((e) => e.type === 'hurt')) firstHurt = i;
    }
    expect(firstHurt).toBeGreaterThanOrEqual(0);
    expect(w.verb).toBeNull(); // 옆에서 닿으면 능력을 얻지 않는다
    expect(w.invincibleMs).toBe(HURT_INVINCIBLE_MS);
    // 무적 시간(1초 = 60스텝) 안에는 적이 다가와 닿아도 다시 맞지 않는다
    let again = 0;
    for (let i = 0; i < 59; i++) {
      run(w, 1, {});
      again += drainEvents(w).filter((e) => e.type === 'hurt').length;
    }
    expect(again).toBe(0);
  });

  it('옆에서 맞고 밀려난 뒤 다가오던 적 위로 떨어져 원치 않은 동사를 얻지 않는다(이슈 003)', () => {
    const w = createWorld(lvl([{ verb: 'sleep', col: 9, row: 5 }]));
    run(w, 10, {});
    // 가만히 서 있는 주인공에게 적이 걸어와 옆에서 닿는다
    w.player.x = enemy(w).x - w.player.w - 1;
    const events: string[] = [];
    for (let i = 0; i < 240; i++) {
      run(w, 1, {});
      for (const e of drainEvents(w)) events.push(e.type);
    }
    expect(events).toContain('hurt');
    expect(events).not.toContain('verb_gained');
    expect(w.verb).toBeNull();
  });

  it('맞으면 경직 동안 넉백 속도가 유지돼 실제로 밀려난다(이슈 003)', () => {
    const w = createWorld(lvl([{ verb: 'sleep', col: 9, row: 5 }]));
    run(w, 10, {});
    w.player.x = enemy(w).x - w.player.w - 1;
    let hurtX: number | null = null;
    for (let i = 0; i < 60 && hurtX === null; i++) {
      run(w, 1, {});
      if (drainEvents(w).some((e) => e.type === 'hurt')) hurtX = w.player.x;
    }
    expect(hurtX).not.toBeNull();
    run(w, 20, {});
    expect((hurtX ?? 0) - w.player.x).toBeGreaterThan(15);
  });

  it('벽에 몰려 있어도 적이 돌아서서 밑으로 파고들지 않는다(이슈 003)', () => {
    const w = createWorld(lvl([{ verb: 'sleep', col: 3, row: 5 }]));
    w.player.x = 1 * TILE; // 왼쪽 벽에 붙어 있다
    run(w, 10, {});
    const events: string[] = [];
    for (let i = 0; i < 300; i++) {
      run(w, 1, {});
      for (const e of drainEvents(w)) events.push(e.type);
    }
    expect(events).not.toContain('verb_gained');
  });

  it('구멍에 빠지면 체크포인트에서 다시 시작하고 동사 적이 같은 자리에 다시 생긴다', () => {
    const w = createWorld(lvl([{ verb: 'float', col: 8, row: 5 }]));
    w.player.x = enemy(w).x + 1;
    w.player.y = enemy(w).y - 30;
    run(w, 30, {});
    expect(enemy(w).alive).toBe(false);
    // 구멍(13~16열)으로 떨어뜨린다
    w.player.x = 14 * TILE;
    w.player.y = 5 * TILE;
    for (let i = 0; i < 200 && w.falls === 0; i++) run(w, 1, {});
    expect(w.falls).toBe(1);
    expect(enemy(w).alive).toBe(true);
    expect(w.player.x).toBe(w.level.spawn.x);
  });

  it('적은 발판 끝에서 돌아서 떨어지지 않는다', () => {
    const w = createWorld(lvl([{ verb: 'dance', col: 11, row: 5 }]));
    w.player.x = 25 * TILE; // 멀리 떨어뜨려 두기
    run(w, 600, {});
    expect(enemy(w).alive).toBe(true);
    expect(enemy(w).x + enemy(w).w).toBeLessThanOrEqual(13 * TILE);
  });
});

describe('F08 클리어와 적 재등장', () => {
  it('고르기 앞 체크포인트를 지나면 능력을 잃고 알림이 나간다', () => {
    const base = lvl([{ verb: 'climb', col: 4, row: 5 }]);
    const w = createWorld({
      ...base,
      checkpoints: [base.spawn, { x: 8 * TILE, y: 5 * TILE, resetAbility: true }],
    });
    w.player.x = enemy(w).x + 1;
    w.player.y = enemy(w).y - 30;
    run(w, 30, {});
    expect(w.verb).toBe('climb');
    drainEvents(w);
    run(w, 60, { right: true });
    expect(w.checkpoint).toBe(1);
    expect(w.verb).toBeNull();
    expect(w.ability).toBeNull();
    expect(drainEvents(w)).toContainEqual({ type: 'ability_lost', reason: 'checkpoint' });
  });

  it('회사 문에 닿으면 클리어 알림이 한 번 나가고 세계가 멈춘다', () => {
    const base = lvl([]);
    const w = createWorld({ ...base, door: { x: 9 * TILE, y: 3 * TILE, w: 20, h: 30 } });
    const events: string[] = [];
    for (let i = 0; i < 600 && !w.cleared; i++) {
      run(w, 1, { right: true });
      for (const e of drainEvents(w)) events.push(e.type);
    }
    expect(w.cleared).toBe(true);
    const x = w.player.x;
    run(w, 30, { right: true });
    expect(w.player.x).toBe(x);
    expect(events.filter((t) => t === 'stage_clear')).toHaveLength(1);
  });

  it('밟힌 적은 5초 뒤, 주인공이 그 자리에서 떨어져 있으면 다시 생기고 1초 동안은 닿아도 아무 일이 없다', () => {
    const w = createWorld(lvl([{ verb: 'climb', col: 8, row: 5 }]));
    w.player.x = enemy(w).x + 1;
    w.player.y = enemy(w).y - 30;
    run(w, 30, {});
    expect(enemy(w).alive).toBe(false);
    // 원래 자리 바로 위에 서 있으면 시간이 지나도 다시 생기지 않는다
    w.player.x = enemy(w).home.x;
    run(w, Math.ceil(ENEMY_RESPAWN_MS / 1000 / STEP_S), {});
    expect(enemy(w).alive).toBe(false);
    // 조금(3칸 남짓) 떨어지면 다시 생긴다 — 화면 밖일 필요는 없다(이슈 004)
    w.player.x = enemy(w).home.x - 4 * TILE;
    run(w, 1, {});
    expect(enemy(w).alive).toBe(true);
    expect(enemy(w).graceMs).toBeGreaterThan(0);
    // 등장 직후 몸에 닿아도 피격·밟기 없음
    drainEvents(w);
    w.player.x = enemy(w).x;
    w.player.y = enemy(w).y;
    const events: string[] = [];
    for (let i = 0; i < 10; i++) {
      run(w, 1, {});
      for (const e of drainEvents(w)) events.push(e.type);
    }
    expect(events).not.toContain('hurt');
    expect(events).not.toContain('verb_gained');
  });
});
