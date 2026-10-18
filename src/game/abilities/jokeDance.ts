import { DANCE_MS } from '../../shared/rules/abilities';
import { NO_MODS } from '../physics/player';
import { noop, type AbilityModule } from './types';

/** 오답 dance · 춤추다: 누르면 제자리에서 춤만 춘다. */
export const jokeDance: AbilityModule = {
  id: 'joke-dance',
  correct: false,
  create() {
    let leftMs = 0;
    return {
      id: 'joke-dance',
      onGain: noop,
      onVerbDown(ctx) {
        leftMs = DANCE_MS;
        ctx.emit({ type: 'ability_used', ability: 'joke-dance', success: false });
      },
      onVerbUp: noop,
      update(ctx) {
        if (leftMs <= 0) return NO_MODS;
        leftMs = Math.max(0, leftMs - ctx.dt * 1000);
        if (ctx.player.onGround) ctx.player.vx = 0; // 제자리에서
        return { frozen: true };
      },
      onLose: () => {
        leftMs = 0;
      },
      pose: () => (leftMs > 0 ? 'dance' : 'none'),
    };
  },
};
