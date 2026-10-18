import { breakAbility } from './break';
import { climb } from './climb';
import { float } from './float';
import { jokeBrake } from './jokeBrake';
import { jokeDance } from './jokeDance';
import { jokeSleep } from './jokeSleep';
import type { AbilityId, AbilityModule } from './types';

/**
 * 능력 id → 모듈. Record<AbilityId, …>라서 ABILITY_IDS에 새 id를 넣고 모듈을 빠뜨리면 타입 오류가 난다.
 */
export const ABILITIES: Readonly<Record<AbilityId, AbilityModule>> = {
  climb,
  float,
  break: breakAbility,
  'joke-sleep': jokeSleep,
  'joke-dance': jokeDance,
  'joke-brake': jokeBrake,
};
