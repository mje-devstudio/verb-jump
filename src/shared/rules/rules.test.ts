import { describe, expect, it } from 'vitest';
import { clearMs, clockMs, formatClock, isOnTime, secondsLeft } from './clock';
import { CLOCK_DEADLINE_MS, LIVES_MAX } from './game';
import { collectLetter, isWordComplete, spellMask } from './letters';
import { applyFall, applyHit, gainLife } from './life';
import { score } from './score';

const at = (h: number, m: number, s: number) => ((h * 60 + m) * 60 + s) * 1000;

describe('게임 규칙 · 시계', () => {
  it('8:57:00에서 시작해 실제 시간과 벌칙만큼 흐른다', () => {
    expect(formatClock(clockMs(0, 0))).toBe('8:57:00');
    expect(formatClock(clockMs(65_400, 3000))).toBe('8:58:08');
    expect(clearMs(144_800, 0)).toBe(144_800);
  });

  it('8:59:59.9 도착은 정시, 9:00:00.0은 지각이다', () => {
    expect(isOnTime(at(8, 59, 59) + 900)).toBe(true);
    expect(isOnTime(CLOCK_DEADLINE_MS)).toBe(false);
  });

  it('남은 초는 소수점 아래를 버린다', () => {
    expect(secondsLeft(at(8, 59, 39) + 999)).toBe(20);
    expect(secondsLeft(at(9, 0, 5))).toBe(0);
  });
});

describe('게임 규칙 · 점수', () => {
  it('코인 38개, 철자 완성, 남은 20초면 1,080점', () => {
    const s = score({ coins: 38, wordComplete: true, clock: at(8, 59, 40) });
    expect(s).toEqual({ coin: 380, word: 500, time: 200, total: 1080, onTime: true });
  });

  it('지각이면 시간 보너스가 없다(클리어는 된다)', () => {
    expect(score({ coins: 10, wordComplete: false, clock: at(9, 0, 0) }).total).toBe(100);
  });
});

describe('F26 코인과 피격', () => {
  it('코인 15개에서 맞으면 10개를 흘리고 5개와 생명을 지킨다', () => {
    expect(applyHit({ coins: 15, lives: 3 })).toEqual({
      coins: 5,
      lives: 3,
      spilled: 10,
      gameOver: false,
    });
  });

  it('코인이 10개보다 적으면 있는 만큼만 흘린다', () => {
    expect(applyHit({ coins: 4, lives: 2 }).spilled).toBe(4);
  });

  it('0개에서 맞으면 생명 -1', () => {
    expect(applyHit({ coins: 0, lives: 3 })).toEqual({
      coins: 0,
      lives: 2,
      spilled: 0,
      gameOver: false,
    });
  });

  it('생명이 0이 되면 생명 3개·코인 0개로 다시 시작한다', () => {
    expect(applyHit({ coins: 0, lives: 1 })).toMatchObject({ lives: 3, coins: 0, gameOver: true });
    expect(applyFall({ coins: 12, lives: 1 })).toMatchObject({
      lives: 3,
      coins: 0,
      gameOver: true,
    });
  });

  it('구멍에 빠지면 생명 -1, 코인은 그대로', () => {
    expect(applyFall({ coins: 12, lives: 3 })).toMatchObject({
      lives: 2,
      coins: 12,
      gameOver: false,
    });
  });
});

describe('F27 철자 코인', () => {
  it('다섯 개를 모으면 완성이고 HUD는 B _ E _ K처럼 보인다', () => {
    let got: boolean[] = [];
    for (const i of [0, 2, 4]) got = collectLetter('BREAK', got, i);
    expect(spellMask('BREAK', got)).toBe('B _ E _ K');
    expect(isWordComplete('BREAK', got)).toBe(false);
    for (const i of [1, 3]) got = collectLetter('BREAK', got, i);
    expect(isWordComplete('BREAK', got)).toBe(true);
  });

  it('완성하면 생명 +1, 최대 5개', () => {
    expect(gainLife(3)).toBe(4);
    expect(gainLife(LIVES_MAX)).toBe(LIVES_MAX);
  });
});
