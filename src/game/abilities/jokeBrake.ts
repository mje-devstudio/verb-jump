import { BRAKE_POSE_MS } from '../../shared/rules/abilities';
import { NO_MODS } from '../physics/player';
import { noop, type AbilityModule } from './types';

/** 오답 brake · 브레이크를 밟다: 달리다 누르면 끼익 그 자리에 멈추기만 한다(벽은 그대로). */
export const jokeBrake: AbilityModule = {
  id: 'joke-brake',
  correct: false,
  create() {
    let poseMs = 0;
    return {
      id: 'joke-brake',
      onGain: noop,
      onVerbDown(ctx) {
        ctx.player.vx = 0;
        poseMs = BRAKE_POSE_MS;
        ctx.emit({ type: 'ability_used', ability: 'joke-brake', success: false });
      },
      onVerbUp: noop,
      update(ctx) {
        if (poseMs <= 0) return NO_MODS;
        poseMs = Math.max(0, poseMs - ctx.dt * 1000);
        return { frozen: true };
      },
      onLose: () => {
        poseMs = 0;
      },
      pose: () => (poseMs > 0 ? 'skid' : 'none'),
    };
  },
};
