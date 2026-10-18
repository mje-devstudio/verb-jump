import type { TileMap } from '../level/tilemap';
import type { PlayerState, StepMods } from '../physics/player';
import type { Tuning } from '../../shared/rules/tuning';

import type { AbilityId } from '../../shared/rules/abilities';

// 능력 id 목록은 서버(스테이지 API)도 쓰므로 shared에 둔다.
export { ABILITY_IDS, type AbilityId } from '../../shared/rules/abilities';

/** 그리기(F12)와 HUD가 쓰는 지금 동작. 색만이 아니라 동작으로 능력을 구분한다(접근성). */
export type AbilityPose = 'none' | 'climb' | 'float' | 'break' | 'sleep' | 'dance' | 'skid';

export type AbilityEvent =
  | { type: 'ability_used'; ability: AbilityId; success: boolean }
  | { type: 'clock_penalty'; ms: number };

/** 능력이 게임 세계에 할 수 있는 일. 게임 루프는 이 문맥만 넘기고 능력의 종류는 모른다. */
export interface AbilityContext {
  readonly player: PlayerState;
  readonly map: TileMap;
  readonly tuning: Readonly<Tuning>;
  /** 이번 스텝 길이(초). */
  readonly dt: number;
  /** 지금 동사 버튼을 누르고 있는가. */
  readonly verbHeld: boolean;
  /** col,row에서 이어진 금 간 벽을 모두 부수고 부순 칸 수를 돌려준다. */
  breakCrackedAt(col: number, row: number): number;
  emit(event: AbilityEvent): void;
}

/**
 * 능력 공통 틀(F07): 얻을 때 · 매 프레임 · 동사 버튼 입력 · 잃을 때.
 * 새 동사는 이 틀을 따르는 모듈 하나와 동사 데이터 한 줄로 추가한다.
 */
export interface Ability {
  readonly id: AbilityId;
  onGain(ctx: AbilityContext): void;
  /** 동사 버튼을 누른 스텝에 한 번. */
  onVerbDown(ctx: AbilityContext): void;
  /** 동사 버튼을 뗀 스텝에 한 번. */
  onVerbUp(ctx: AbilityContext): void;
  /** 매 프레임(물리 스텝 직전). 이번 스텝의 물리 변경을 돌려준다. */
  update(ctx: AbilityContext): Readonly<StepMods>;
  onLose(ctx: AbilityContext): void;
  pose(): AbilityPose;
}

export interface AbilityModule {
  readonly id: AbilityId;
  /** 맞는 동사(길을 여는 능력)인가, 뜻을 보여 주는 웃긴 오답인가. */
  readonly correct: boolean;
  create(): Ability;
}

/** 아무것도 하지 않는 기본 구현 — 모듈은 필요한 훅만 덮어쓴다. */
export const noop = (): void => {};
