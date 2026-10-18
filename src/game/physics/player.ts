import type { TileMap, Point } from '../level/tilemap';
import { PLAYER_H, PLAYER_W, type Tuning } from '../../shared/rules/tuning';
import { moveX, moveY, type Body } from './collision';

/** 한 스텝 동안의 입력. 키 상태는 게임 루프가 스텝마다 한 번 샘플링한다. */
export interface PlayerInput {
  left: boolean;
  right: boolean;
  /** 지난 샘플 이후 점프 키를 새로 눌렀는가(눌렀다 뗀 짧은 탭도 포함). */
  jumpPressed: boolean;
  /** 지금 점프 키를 누르고 있는가 — 떼는 순간 점프가 잘린다. */
  jumpHeld: boolean;
}

export const NO_INPUT: Readonly<PlayerInput> = Object.freeze({
  left: false,
  right: false,
  jumpPressed: false,
  jumpHeld: false,
});

export interface PlayerState extends Body {
  onGround: boolean;
  /** 마지막으로 땅에 있던 뒤 흐른 시간(ms). 땅 위면 0. 발판 끝 유예에 쓴다. */
  airMs: number;
  /** 점프 입력이 남아 있는 시간(ms). 착지 직전 미리 누른 점프 인정에 쓴다. */
  bufferMs: number;
  /** 점프로 올라가는 중이고 아직 잘리지 않았는가. */
  rising: boolean;
  /** 바라보는 방향 — 그리기와 능력(F07)에서 쓴다. */
  facing: -1 | 1;
  /** 이번 스텝에 벽에 막힌 방향. climb(F07)이 쓴다. */
  wall: -1 | 0 | 1;
}

export function createPlayer(spawn: Point): PlayerState {
  return {
    x: spawn.x,
    y: spawn.y + 10 - PLAYER_H, // 시작 타일 바닥에 발을 맞춘다
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: false,
    airMs: Number.POSITIVE_INFINITY,
    bufferMs: 0,
    rising: false,
    facing: 1,
    wall: 0,
  };
}

/** 부동소수 누적 오차로 경계 시간이 살아남지 않게 하는 여유(ms). */
const TIME_EPS = 1e-6;

function approach(v: number, target: number, maxDelta: number): number {
  if (v < target) return Math.min(v + maxDelta, target);
  if (v > target) return Math.max(v - maxDelta, target);
  return v;
}

/**
 * 플레이어를 고정 간격 dt(초)만큼 진행한다. 순수 로직: PixiJS·React·시간 API를 쓰지 않는다.
 * 순서: 좌우 속도 → 점프(버퍼·유예) → 점프 자르기 → 중력 → x 충돌 → y 충돌 → 타이머.
 */
export function stepPlayer(
  p: PlayerState,
  input: Readonly<PlayerInput>,
  map: TileMap,
  t: Readonly<Tuning>,
  dt: number,
): void {
  const dtMs = dt * 1000;

  // 1) 좌우: 같은 방향으로 밀면 accel, 손을 떼거나 반대로 밀면 decel. 공중에서는 airControl 배율.
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) p.facing = dir > 0 ? 1 : -1;
  const control = p.onGround ? 1 : t.airControl;
  const speedingUp = dir !== 0 && (p.vx === 0 || Math.sign(p.vx) === dir);
  const rate = (speedingUp ? t.accel : t.decel) * control;
  p.vx = approach(p.vx, dir * t.maxSpeed, rate * dt);

  // 2) 점프: 누른 입력은 bufferMs 동안 남고, 땅을 떠난 뒤 coyoteMs 동안은 땅으로 친다.
  if (input.jumpPressed) p.bufferMs = t.bufferMs;
  const canJump = p.onGround || p.airMs < t.coyoteMs - TIME_EPS;
  if (p.bufferMs > TIME_EPS && canJump) {
    p.vy = -t.jumpVel;
    p.bufferMs = 0;
    p.airMs = Number.POSITIVE_INFINITY; // 한 번 쓴 유예는 다시 못 쓴다
    p.onGround = false;
    p.rising = true;
  }

  // 3) 누르는 길이: 올라가는 중에 키를 떼면 한 번만 속도를 jumpCut 배로 줄인다.
  if (p.rising) {
    if (p.vy >= 0) p.rising = false;
    else if (!input.jumpHeld) {
      p.vy *= t.jumpCut;
      p.rising = false;
    }
  }

  // 4) 중력: 떨어질 때 fallMul 배로 무겁게, 최대 낙하 속도 제한.
  //    속도를 먼저 바꾸고 그 속도로 옮긴다(semi-implicit Euler) — 점프 손맛 실험실과 같은 방식.
  //    앞뒤 속도 평균으로 옮기면 공중에 1프레임 더 떠서 레벨 규칙 거리와 어긋난다(docs/issues/002).
  const g = p.vy > 0 ? t.gravity * t.fallMul : t.gravity;
  p.vy = Math.min(p.vy + g * dt, t.maxFall);

  // 5) 충돌: 축을 나눠 x 먼저, y 다음.
  p.wall = moveX(p, map, p.vx * dt);
  const hit = moveY(p, map, p.vy * dt);
  if (hit === 'ceiling') p.rising = false;
  p.onGround = hit === 'ground';

  // 6) 타이머
  if (p.onGround) p.airMs = 0;
  else if (Number.isFinite(p.airMs)) p.airMs += dtMs;
  p.bufferMs = Math.max(0, p.bufferMs - dtMs);
}
