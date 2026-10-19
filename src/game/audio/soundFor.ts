import type { WorldEvent } from '../world';
import type { SfxName } from './sfxDefs';

/**
 * 게임 알림 → 효과음. 능력과 오답은 색만이 아니라 소리로도 구분한다(PRD 접근성).
 * 소리가 없는 알림은 null.
 */
export function soundFor(e: WorldEvent): SfxName | null {
  switch (e.type) {
    case 'jump':
      return 'jump';
    case 'coin':
      return 'coin';
    case 'letter_collected':
      return 'letter';
    case 'verb_gained':
      return e.correct ? 'verb' : 'joke';
    case 'ability_used':
      if (e.ability === 'break') return e.success ? 'breakWall' : null;
      if (e.ability.startsWith('joke-')) return 'joke';
      return e.success ? 'ability' : null;
    case 'hurt':
      return 'hurt';
    case 'fell':
      return 'fall';
    case 'stage_clear':
    case 'word_completed':
      return 'clear';
    default:
      return null;
  }
}
