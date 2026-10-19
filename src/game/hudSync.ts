import { formatClock, isOnTime } from '../shared/rules/clock';
import { spellMask } from '../shared/rules/letters';
import { buildResult } from './result';
import type { GameStore } from './store';
import { drainEvents, worldClock, type World, type WorldEvent } from './world';

/** 게임 루프 → HUD 동기화(F09). 그리기 프레임마다 불러도, 저장소는 값이 바뀐 필드가 있을 때만 알린다. */
export function syncHud(
  world: World,
  store: GameStore,
  opts: {
    nextCardId: () => number;
    onVerbGained?: (verb: string) => void;
    /** 모든 알림(효과음·학습 이벤트 F20). */
    onEvent?: (e: WorldEvent) => void;
  },
): void {
  for (const e of drainEvents(world)) {
    opts.onEvent?.(e);
    if (e.type === 'verb_gained') {
      const entry = world.level.verbs[e.verb];
      if (!entry) continue;
      store.update({
        verb: e.verb,
        meaning: entry.meaning,
        card: { id: opts.nextCardId(), verb: e.verb, entry, correct: e.correct },
      });
      opts.onVerbGained?.(e.verb);
    } else if (e.type === 'ability_lost') {
      store.update({ verb: null, meaning: null });
    } else if (e.type === 'word_completed') {
      // 철자를 다 모으면 그 단어의 단어 카드(발음·뜻·예문)
      const verb = e.word.toLowerCase();
      const entry = world.level.verbs[verb];
      if (entry) {
        store.update({ card: { id: opts.nextCardId(), verb, entry, correct: true } });
        opts.onVerbGained?.(verb);
      }
    }
  }
  const clock = worldClock(world);
  store.update({
    lives: world.lives,
    coins: world.coins,
    spell: spellMask(world.spellWord, world.letterGot),
    clock: formatClock(clock),
    late: !isOnTime(clock),
  });
  if (world.cleared && !store.getSnapshot().result) store.update({ result: buildResult(world) });
}
