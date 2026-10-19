import { describe, expect, it } from 'vitest';
import { SFX_DEFS } from './sfxDefs';
import { soundFor } from './soundFor';

describe('F12 효과음 연결', () => {
  it('맞는 동사와 오답 동사는 다른 소리', () => {
    expect(soundFor({ type: 'verb_gained', verb: 'climb', ability: 'climb', correct: true })).toBe(
      'verb',
    );
    expect(
      soundFor({ type: 'verb_gained', verb: 'sleep', ability: 'joke-sleep', correct: false }),
    ).toBe('joke');
  });

  it('break는 부쉈을 때만 부수는 소리, 오답 능력은 웃긴 소리', () => {
    expect(soundFor({ type: 'ability_used', ability: 'break', success: true })).toBe('breakWall');
    expect(soundFor({ type: 'ability_used', ability: 'break', success: false })).toBeNull();
    expect(soundFor({ type: 'ability_used', ability: 'joke-brake', success: false })).toBe('joke');
  });

  it('소리 이름은 모두 정의되어 있다', () => {
    const events = [
      { type: 'jump' },
      { type: 'coin' },
      { type: 'letter_collected', char: 'B' },
      { type: 'hurt', spilled: 0, lifeLost: true },
      { type: 'fell' },
      { type: 'stage_clear' },
    ] as const;
    for (const e of events) {
      const name = soundFor(e);
      expect(name).not.toBeNull();
      expect(name && name in SFX_DEFS).toBe(true);
    }
  });
});
