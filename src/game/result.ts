import { clearMs, formatClock } from '../shared/rules/clock';
import { isWordComplete, spellMask } from '../shared/rules/letters';
import { score, type ScoreBreakdown } from '../shared/rules/score';
import type { VerbEntry } from '../shared/stages/types';
import { worldClock, type World } from './world';

export interface VerbReview {
  verb: string;
  entry: VerbEntry;
}

/** 결과 화면(F11)과 기록 등록(F18)에 쓰는 한 판 결과. */
export interface ResultData {
  /** 출근 시각 "8:59:41" */
  arrival: string;
  /** 시계 기준 클리어까지 걸린 시간(ms) — API의 clearMs. */
  clearMs: number;
  score: ScoreBreakdown;
  coins: number;
  word: string;
  wordComplete: boolean;
  /** "B _ E _ K" */
  spell: string;
  learned: VerbReview[];
  wrong: VerbReview[];
}

function reviews(world: World, verbs: readonly string[]): VerbReview[] {
  return verbs.flatMap((verb) => {
    const entry = world.level.verbs[verb];
    return entry ? [{ verb, entry }] : [];
  });
}

/** 클리어한 세계에서 결과를 만든다. 점수 계산은 shared/rules(서버도 같은 식)를 쓴다. */
export function buildResult(world: World): ResultData {
  const clock = worldClock(world);
  const wordComplete = isWordComplete(world.spellWord, world.letterGot);
  return {
    arrival: formatClock(clock),
    clearMs: clearMs(world.elapsedMs, world.clockPenaltyMs),
    score: score({ coins: world.coins, wordComplete, clock }),
    coins: world.coins,
    word: world.spellWord,
    wordComplete,
    spell: spellMask(world.spellWord, world.letterGot),
    learned: reviews(world, world.learnedVerbs),
    wrong: reviews(world, world.wrongVerbs),
  };
}
