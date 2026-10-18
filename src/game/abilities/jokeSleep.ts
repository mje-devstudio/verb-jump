import { SLEEP_CLOCK_PENALTY_MS, SLEEP_MS } from '../../shared/rules/abilities';
import { NO_MODS } from '../physics/player';
import { noop, type AbilityModule } from './types';

/** 오답 sleep · 자다: 누르면 2초 동안 꾸벅 졸고 시계가 3초 더 흐른다. 점수 감점은 없다. */
export const jokeSleep: AbilityModule = {
  id: 'joke-sleep',
  correct: false,
  create() {
    let leftMs = 0;
    return {
      id: 'joke-sleep',
      onGain: noop,
      onVerbDown(ctx) {
        if (leftMs > 0) return; // 자는 동안 다시 눌러도 벌칙이 겹치지 않는다
        leftMs = SLEEP_MS;
        ctx.emit({ type: 'ability_used', ability: 'joke-sleep', success: false });
        ctx.emit({ type: 'clock_penalty', ms: SLEEP_CLOCK_PENALTY_MS });
      },
      onVerbUp: noop,
      update(ctx) {
        if (leftMs <= 0) return NO_MODS;
        leftMs = Math.max(0, leftMs - ctx.dt * 1000);
        return { frozen: true };
      },
      onLose: () => {
        leftMs = 0;
      },
      pose: () => (leftMs > 0 ? 'sleep' : 'none'),
    };
  },
};
