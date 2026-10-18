import { CLIMB_LEDGE_HOP_VEL, CLIMB_LEDGE_NUDGE_VX } from '../../shared/rules/abilities';
import { adjacentWallCol } from '../physics/collision';
import { NO_MODS } from '../physics/player';
import { noop, type AbilityModule } from './types';

/** climb · 오르다: 벽 앞에서 동사 버튼을 누르고 있으면 climbSpeed로 오른다. */
export const climb: AbilityModule = {
  id: 'climb',
  correct: true,
  create() {
    let climbing = false;
    return {
      id: 'climb',
      onGain: noop,
      onVerbDown: noop,
      onVerbUp: () => {
        climbing = false;
      },
      update(ctx) {
        const p = ctx.player;
        const touching = ctx.verbHeld && adjacentWallCol(p, ctx.map, p.facing) !== null;
        if (touching) {
          if (!climbing) ctx.emit({ type: 'ability_used', ability: 'climb', success: true });
          climbing = true;
          return { holdVy: -ctx.tuning.climbSpeed };
        }
        if (climbing && ctx.verbHeld) {
          // 벽 꼭대기를 넘었다: 살짝 튀어 올라 벽 위로 올라서게 한다.
          p.vy = -CLIMB_LEDGE_HOP_VEL;
          p.vx = p.facing * CLIMB_LEDGE_NUDGE_VX;
        }
        climbing = false;
        return NO_MODS;
      },
      onLose: () => {
        climbing = false;
      },
      pose: () => (climbing ? 'climb' : 'none'),
    };
  },
};
