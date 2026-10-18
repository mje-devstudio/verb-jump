import { ABILITIES } from './abilities/registry';
import type { Ability, AbilityContext, AbilityEvent, AbilityId } from './abilities/types';
import type { VerbEntry } from './data/verbs';
import {
  createEnemy,
  resetEnemy,
  stepEnemy,
  type EnemySpawn,
  type VerbEnemy,
} from './entities/enemy';
import { mapHeightPx, Tile, tileAt, type Point, type TileMap } from './level/tilemap';
import { createPlayer, NO_MODS, stepPlayer, type PlayerState } from './physics/player';
import type { ControlSnapshot } from './input';
import {
  HURT_INVINCIBLE_MS,
  HURT_KNOCKBACK_VX,
  HURT_KNOCKBACK_VY,
  HURT_STUN_MS,
  ENEMY_RESPAWN_MS,
  STOMP_BOUNCE,
} from '../shared/rules/abilities';
import { judgeContact, overlaps, type Box } from '../shared/rules/stomp';
import { TILE, VIEW_W, type Tuning } from '../shared/rules/tuning';

/** 게임 루프 → 바깥(HUD·TTS·학습 이벤트)으로 나가는 알림. 프레임마다가 아니라 일이 생길 때만. */
export type WorldEvent =
  | { type: 'verb_gained'; verb: string; ability: AbilityId; correct: boolean }
  | { type: 'hurt' }
  | { type: 'fell' }
  | { type: 'checkpoint'; index: number }
  | { type: 'stage_clear' }
  | AbilityEvent;

/** 철자 코인 자리(F27에서 줍기·HUD를 붙인다). */
export interface LetterSpawn {
  char: string;
  x: number;
  y: number;
  /** 닿으려면 필요한 능력(레벨 점검용). 없으면 'none'. */
  ability?: 'climb' | 'float' | 'break' | 'none';
}

export interface LevelDef {
  map: TileMap;
  spawn: Point;
  enemies: readonly EnemySpawn[];
  /** 체크포인트 자리(시작 위치와 같은 형식: 서 있는 칸의 왼쪽 위). 구간마다 하나(PRD). 0번은 시작 위치. */
  checkpoints: readonly Point[];
  verbs: Readonly<Record<string, VerbEntry>>;
  /** 닿으면 클리어하는 회사 문. */
  door?: Box;
  letters?: readonly LetterSpawn[];
  /** float처럼 능력이 있어야 건너는 틈의 열 범위(레벨 점검이 의도된 틈으로 본다). */
  abilityGaps?: readonly (readonly [number, number])[];
}

/** 프레임마다 바뀌는 게임 상태. React 밖, 게임 루프 안에만 둔다. */
export interface World {
  readonly level: LevelDef;
  /** 부서지는 타일이 있어 레벨 원본과 따로 둔 작업용 맵. */
  readonly map: TileMap;
  /** 맵이 바뀔 때마다 1 증가 — 렌더러가 타일을 다시 그릴지 판단한다. */
  mapVersion: number;
  player: PlayerState;
  /** 그리기 보간용 직전 스텝 위치. */
  readonly prev: Point;
  readonly enemies: VerbEnemy[];
  verb: string | null;
  ability: Ability | null;
  verbWasHeld: boolean;
  invincibleMs: number;
  /** 맞은 직후 밀려나는 시간. 이 동안은 조작이 잠기고 넉백 속도가 유지된다. */
  hurtStunMs: number;
  /** sleep 같은 벌칙으로 시계가 더 흐른 시간. 시계 규칙(F09)이 더한다. */
  clockPenaltyMs: number;
  checkpoint: number;
  falls: number;
  /** 회사 문에 닿았는가. 클리어 뒤에는 세계가 멈춘다. */
  cleared: boolean;
  /** 이번 프레임까지 쌓인 알림. 소비하는 쪽이 drainEvents로 비운다. */
  readonly events: WorldEvent[];
}

export interface WorldOptions {
  /** 모바일 판정 완화: 밟기 판정 폭 배율. */
  stompWidthMul?: number;
}

function cloneMap(map: TileMap): TileMap {
  return { cols: map.cols, rows: map.rows, tiles: new Uint8Array(map.tiles) };
}

export function createWorld(level: LevelDef): World {
  const player = createPlayer(level.spawn);
  return {
    level,
    map: cloneMap(level.map),
    mapVersion: 0,
    player,
    prev: { x: player.x, y: player.y },
    enemies: level.enemies.map(createEnemy),
    verb: null,
    ability: null,
    verbWasHeld: false,
    invincibleMs: 0,
    hurtStunMs: 0,
    clockPenaltyMs: 0,
    checkpoint: 0,
    falls: 0,
    cleared: false,
    events: [],
  };
}

export function drainEvents(w: World): WorldEvent[] {
  return w.events.splice(0, w.events.length);
}

/** col,row에서 상하좌우로 이어진 금 간 벽을 모두 빈칸으로 바꾼다. */
function breakCracked(w: World, col: number, row: number): number {
  const { map } = w;
  const stack: [number, number][] = [[col, row]];
  let n = 0;
  while (stack.length > 0) {
    const [c, r] = stack.pop() ?? [0, 0];
    if (tileAt(map, c, r) !== Tile.Cracked || c < 0 || c >= map.cols) continue;
    map.tiles[r * map.cols + c] = Tile.Empty;
    n++;
    stack.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
  }
  if (n > 0) w.mapVersion++;
  return n;
}

function abilityContext(
  w: World,
  input: Readonly<ControlSnapshot>,
  tuning: Readonly<Tuning>,
  dt: number,
): AbilityContext {
  return {
    player: w.player,
    map: w.map,
    tuning,
    dt,
    verbHeld: input.verbHeld,
    breakCrackedAt: (c, r) => breakCracked(w, c, r),
    emit: (e) => {
      if (e.type === 'clock_penalty') w.clockPenaltyMs += e.ms;
      w.events.push(e);
    },
  };
}

/** 동사를 얻는다. 능력은 하나만: 이전 능력은 onLose 뒤 새 능력으로 바뀐다. */
export function gainVerb(w: World, verb: string, ctx: AbilityContext): void {
  const entry = w.level.verbs[verb];
  if (!entry) return;
  const mod = ABILITIES[entry.ability];
  w.ability?.onLose(ctx);
  w.ability = mod.create();
  w.verb = verb;
  w.ability.onGain(ctx);
  w.events.push({ type: 'verb_gained', verb, ability: mod.id, correct: mod.correct });
}

function respawnAtCheckpoint(w: World): void {
  w.player = createPlayer(w.level.checkpoints[w.checkpoint] ?? w.level.spawn);
  w.prev.x = w.player.x;
  w.prev.y = w.player.y;
  w.invincibleMs = 0;
  w.hurtStunMs = 0;
  // PRD: 동사 적은 같은 자리에 다시 생긴다. 능력·코인·생명 처리는 F26에서 붙인다.
  for (const e of w.enemies) resetEnemy(e);
}

export function stepWorld(
  w: World,
  input: Readonly<ControlSnapshot>,
  tuning: Readonly<Tuning>,
  dt: number,
  opts: WorldOptions = {},
): void {
  if (w.cleared) return;
  w.prev.x = w.player.x;
  w.prev.y = w.player.y;
  const ctx = abilityContext(w, input, tuning, dt);

  // 1) 능력: 동사 버튼 입력 → 매 프레임 갱신. 게임 루프는 어떤 능력인지 모른다.
  if (w.ability) {
    if (input.verbPressed) w.ability.onVerbDown(ctx);
    if (w.verbWasHeld && !input.verbHeld) w.ability.onVerbUp(ctx);
  }
  w.verbWasHeld = input.verbHeld;
  const abilityMods = w.ability ? w.ability.update(ctx) : NO_MODS;
  const mods = w.hurtStunMs > 0 ? { ...abilityMods, frozen: true, keepVx: true } : abilityMods;

  // 2) 물리
  const prevBottom = w.player.y + w.player.h;
  stepPlayer(w.player, input, w.map, tuning, dt, mods);
  w.invincibleMs = Math.max(0, w.invincibleMs - dt * 1000);
  w.hurtStunMs = Math.max(0, w.hurtStunMs - dt * 1000);

  // 3) 적과 밟기·피격
  for (const e of w.enemies) {
    if (!e.alive) {
      e.respawnInMs = Math.max(0, e.respawnInMs - dt * 1000);
      const offScreen =
        Math.abs(e.home.x + e.w / 2 - (w.player.x + w.player.w / 2)) > VIEW_W / 2 + 2 * TILE;
      if (e.respawnInMs <= 0 && offScreen) resetEnemy(e);
      continue;
    }
    stepEnemy(e, w.map, dt);
    const contact = judgeContact(
      w.player,
      prevBottom,
      w.player.vy,
      e,
      tuning.stompPx,
      opts.stompWidthMul ?? 1,
    );
    if (contact === 'stomp') {
      e.alive = false;
      e.respawnInMs = ENEMY_RESPAWN_MS;
      w.player.vy = -tuning.jumpVel * STOMP_BOUNCE;
      w.player.onGround = false;
      gainVerb(w, e.verb, ctx);
    } else if (contact === 'hurt' && w.invincibleMs <= 0) {
      w.invincibleMs = HURT_INVINCIBLE_MS;
      w.hurtStunMs = HURT_STUN_MS;
      const away = w.player.x + w.player.w / 2 < e.x + e.w / 2 ? -1 : 1;
      w.player.vx = away * HURT_KNOCKBACK_VX;
      w.player.vy = -HURT_KNOCKBACK_VY;
      // 적도 돌아선다: 벽에 몰린 주인공 밑으로 계속 걸어 들어와 밟히는 일을 막는다(이슈 003).
      e.dir = away > 0 ? -1 : 1;
      w.events.push({ type: 'hurt' }); // 코인 흘리기·생명은 F26
    }
  }

  // 4) 체크포인트와 구멍
  const next = w.level.checkpoints[w.checkpoint + 1];
  if (next !== undefined && w.player.x >= next.x) {
    w.checkpoint++;
    w.events.push({ type: 'checkpoint', index: w.checkpoint });
  }
  if (w.level.door && overlaps(w.player, w.level.door)) {
    w.cleared = true;
    w.events.push({ type: 'stage_clear' });
    return;
  }
  if (w.player.y > mapHeightPx(w.map) + 2 * TILE) {
    w.falls++;
    w.events.push({ type: 'fell' });
    respawnAtCheckpoint(w);
  }
}
