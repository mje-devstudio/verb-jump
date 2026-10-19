import { describe, expect, it } from 'vitest';
import { collectLetter } from './letters';
import { DEFAULT_TUNING, MOBILE_COYOTE_MS, mobileTuning, scaleTuning } from './tuning';

describe('손맛 수치 변환', () => {
  it('타일을 16px로 바꾸면 길이·속도·가속도는 ×1.6, 시간(ms)·배율은 그대로(PRD)', () => {
    const t = scaleTuning(DEFAULT_TUNING, 16);
    expect(t.maxSpeed).toBeCloseTo(144);
    expect(t.gravity).toBeCloseTo(1440);
    expect(t.jumpVel).toBeCloseTo(456);
    expect(t.stompPx).toBeCloseTo(6.4);
    expect(t.coyoteMs).toBe(DEFAULT_TUNING.coyoteMs);
    expect(t.jumpCut).toBe(DEFAULT_TUNING.jumpCut);
  });

  it('모바일은 발판 끝 유예만 0.15초로 늘린다', () => {
    const m = mobileTuning();
    expect(m.coyoteMs).toBe(MOBILE_COYOTE_MS);
    expect({ ...m, coyoteMs: DEFAULT_TUNING.coyoteMs }).toEqual(DEFAULT_TUNING);
  });

  it('철자 자리 번호가 단어 밖이면 바꾸지 않는다', () => {
    expect(collectLetter('BREAK', [], 9)).toEqual([]);
    expect(collectLetter('BREAK', [], -1)).toEqual([]);
  });
});
