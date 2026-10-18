import { mapHeightPx, type Point, type TileMap } from './level/tilemap';
import { createPlayer, stepPlayer, type PlayerInput, type PlayerState } from './physics/player';
import type { Tuning } from '../shared/rules/tuning';

/** 프레임마다 바뀌는 게임 상태. React 밖, 게임 루프 안에만 둔다. */
export interface World {
  map: TileMap;
  spawn: Point;
  player: PlayerState;
  /** 그리기 보간용 직전 스텝 위치. */
  prev: Point;
  falls: number;
}

export function createWorld(map: TileMap, spawn: Point): World {
  const player = createPlayer(spawn);
  return { map, spawn, player, prev: { x: player.x, y: player.y }, falls: 0 };
}

export function stepWorld(
  w: World,
  input: Readonly<PlayerInput>,
  tuning: Readonly<Tuning>,
  dt: number,
): void {
  w.prev.x = w.player.x;
  w.prev.y = w.player.y;
  stepPlayer(w.player, input, w.map, tuning, dt);
  // 구멍: 맵 아래로 완전히 빠지면 시작 위치로. 생명·체크포인트는 F08·F26에서 붙인다.
  if (w.player.y > mapHeightPx(w.map) + 20) {
    w.falls++;
    w.player = createPlayer(w.spawn);
    w.prev.x = w.player.x;
    w.prev.y = w.player.y;
  }
}
