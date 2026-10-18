import { secondsLeft, isOnTime } from './clock';
import { COIN_POINTS, TIME_BONUS_PER_SEC, WORD_BONUS } from './game';

export interface ScoreInput {
  /** 클리어할 때 갖고 있는 코인 수. */
  coins: number;
  wordComplete: boolean;
  /** 클리어 순간의 시계(하루 기준 ms). */
  clock: number;
}

export interface ScoreBreakdown {
  coin: number;
  word: number;
  time: number;
  total: number;
  onTime: boolean;
}

/** 점수 = 보유 코인 × 10 + 철자 완성 500 + 정시 출근이면 남은 초(버림) × 10. 서버(F18)도 같은 식으로 다시 계산한다. */
export function score({ coins, wordComplete, clock }: ScoreInput): ScoreBreakdown {
  const onTime = isOnTime(clock);
  const coin = coins * COIN_POINTS;
  const word = wordComplete ? WORD_BONUS : 0;
  const time = onTime ? secondsLeft(clock) * TIME_BONUS_PER_SEC : 0;
  return { coin, word, time, total: coin + word + time, onTime };
}
