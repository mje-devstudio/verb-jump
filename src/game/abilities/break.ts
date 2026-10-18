import { BREAK_POSE_MS, BREAK_REACH_PX } from '../../shared/rules/abilities';
import { TILE } from '../../shared/rules/tuning';
import { isSolid, Tile, tileAt } from '../level/tilemap';
import { NO_MODS } from '../physics/player';
import { noop, type AbilityModule } from './types';

/** break · 부수다: 금 간 벽 앞에서 동사 버튼을 누르면 이어진 금 간 벽을 부순다. */
export const breakAbility: AbilityModule = {
  id: 'break',
  correct: true,
  create() {
    let poseMs = 0;
    return {
      id: 'break',
      onGain: noop,
      onVerbDown(ctx) {
        poseMs = BREAK_POSE_MS;
        const p = ctx.player;
        const probeX = p.facing > 0 ? p.x + p.w + BREAK_REACH_PX : p.x - BREAK_REACH_PX;
        const col = Math.floor(probeX / TILE);
        let broken = 0;
        for (let r = Math.floor(p.y / TILE); r <= Math.floor((p.y + p.h - 1e-6) / TILE); r++) {
          const t = tileAt(ctx.map, col, r);
          if (t === Tile.Cracked) broken += ctx.breakCrackedAt(col, r);
          else if (isSolid(t)) break; // 단단한 벽이 먼저 막고 있으면 부수지 못한다
        }
        ctx.emit({ type: 'ability_used', ability: 'break', success: broken > 0 });
      },
      onVerbUp: noop,
      update(ctx) {
        poseMs = Math.max(0, poseMs - ctx.dt * 1000);
        return NO_MODS;
      },
      onLose: () => {
        poseMs = 0;
      },
      pose: () => (poseMs > 0 ? 'break' : 'none'),
    };
  },
};
