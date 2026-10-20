import { afterEach, describe, expect, it, vi } from 'vitest';
import { DUCK_LEVEL, DUCK_MAX_MS, Sfx } from './sfx';

/** 볼륨 목표값만 기록하는 가짜 AudioContext. */
function fakeAudio() {
  const targets: number[] = [];
  class FakeContext {
    currentTime = 0;
    state = 'running';
    destination = {};
    createGain() {
      return { gain: { setTargetAtTime: (v: number) => targets.push(v) }, connect() {} };
    }
    resume() {
      return Promise.resolve();
    }
  }
  vi.stubGlobal('AudioContext', FakeContext);
  vi.stubGlobal('window', { AudioContext: FakeContext });
  return targets;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('동사 발음을 읽는 동안 효과음 줄이기', () => {
  it('읽기 시작하면 줄이고, 끝나면 되돌린다', () => {
    const targets = fakeAudio();
    const s = new Sfx();
    s.unlock();
    s.duck(true);
    s.duck(false);
    expect(targets).toEqual([DUCK_LEVEL, 1]);
  });

  it('끝 알림이 오지 않아도 정해진 시간 뒤에는 되돌린다', () => {
    vi.useFakeTimers();
    const targets = fakeAudio();
    const s = new Sfx();
    s.unlock();
    s.duck(true);
    vi.advanceTimersByTime(DUCK_MAX_MS);
    expect(targets).toEqual([DUCK_LEVEL, 1]);
  });
});
