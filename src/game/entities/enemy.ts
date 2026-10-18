import { ENEMY_H, ENEMY_SPEED, ENEMY_W } from '../../shared/rules/abilities';
import { TILE } from '../../shared/rules/tuning';
import { isSolid, Tile, tileAt, type TileMap } from '../level/tilemap';

/** 머리 위에 동사가 뜨는 적(F06). 동사만 바꿔 한 종류로 쓴다. */
export interface VerbEnemy {
  readonly verb: string;
  /** 체크포인트에서 다시 생길 자리. */
  readonly home: { x: number; y: number };
  x: number;
  y: number;
  readonly w: number;
  readonly h: number;
  dir: -1 | 1;
  alive: boolean;
  /** 밟힌 뒤 다시 생기기까지 남은 시간(ms). */
  respawnInMs: number;
  /** 다시 생긴 직후 닿아도 아무 일이 없는 남은 시간(ms). */
  graceMs: number;
}

export interface EnemySpawn {
  verb: string;
  /** 적이 서 있는 칸(발이 이 칸 바닥에 닿는다). */
  col: number;
  row: number;
}

export function createEnemy(s: EnemySpawn): VerbEnemy {
  const x = s.col * TILE + (TILE - ENEMY_W) / 2;
  const y = (s.row + 1) * TILE - ENEMY_H;
  return {
    verb: s.verb,
    home: { x, y },
    x,
    y,
    w: ENEMY_W,
    h: ENEMY_H,
    dir: -1,
    alive: true,
    respawnInMs: 0,
    graceMs: 0,
  };
}

export function resetEnemy(e: VerbEnemy): void {
  e.x = e.home.x;
  e.y = e.home.y;
  e.dir = -1;
  e.alive = true;
  e.respawnInMs = 0;
  e.graceMs = 0;
}

/** 발판 위를 좌우로 순찰한다. 앞이 벽이거나 발밑이 끊기면 돌아선다(떨어지지 않는다). */
export function stepEnemy(e: VerbEnemy, map: TileMap, dt: number): void {
  if (!e.alive) return;
  const nx = e.x + e.dir * ENEMY_SPEED * dt;
  const frontX = e.dir > 0 ? nx + e.w : nx;
  const col = Math.floor((e.dir > 0 ? frontX - 1e-6 : frontX) / TILE);
  const bodyRow = Math.floor((e.y + e.h - 1e-6) / TILE);
  const footRow = bodyRow + 1;
  const blocked = isSolid(tileAt(map, col, bodyRow));
  const below = tileAt(map, col, footRow);
  const noFloor = !(isSolid(below) || below === Tile.OneWay);
  if (blocked || noFloor) e.dir = e.dir > 0 ? -1 : 1;
  else e.x = nx;
}
