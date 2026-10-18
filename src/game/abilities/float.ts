import { FLOAT_MAX_FALL } from '../../shared/rules/abilities';
import { NO_MODS } from '../physics/player';
import { noop, type AbilityModule } from './types';

/** float · 뜨다: 공중에서 동사 버튼을 누르고 있으면 천천히 내려온다. */
export const float: AbilityModule = {
  id: 'float',
  correct: true,
  create() {
    let floating = false;
    return {
      id: 'float',
      onGain: noop,
      onVerbDown(ctx) {
        ctx.emit({ type: 'ability_used', ability: 'float', success: !ctx.player.onGround });
      },
      onVerbUp: noop,
      update(ctx) {
        floating = ctx.verbHeld && !ctx.player.onGround && ctx.player.vy > 0;
        return floating ? { maxFall: FLOAT_MAX_FALL } : NO_MODS;
      },
      onLose: () => {
        floating = false;
      },
      pose: () => (floating ? 'float' : 'none'),
    };
  },
};
