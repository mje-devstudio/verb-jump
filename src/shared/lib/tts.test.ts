import { describe, expect, it } from 'vitest';
import { pickVoice } from './tts';

const v = (name: string, lang: string, localService = false) =>
  ({ name, lang, localService, default: false, voiceURI: name }) as SpeechSynthesisVoice;

describe('동사 발음 음성 고르기', () => {
  it('선호 음성이 있으면 그것을 쓴다', () => {
    const voices = [
      v('Yuna', 'ko-KR', true),
      v('Alex', 'en-US', true),
      v('Samantha', 'en-US', true),
    ];
    expect(pickVoice(voices, 'en-US')?.name).toBe('Samantha');
  });

  it('없으면 같은 언어의 기기 내장 음성, 그다음 같은 언어 아무거나', () => {
    expect(pickVoice([v('Remote', 'en-US'), v('Fred', 'en-US', true)], 'en-US')?.name).toBe('Fred');
    expect(pickVoice([v('Remote', 'en_US')], 'en-US')?.name).toBe('Remote');
  });

  it('영어 음성이 없으면 고르지 않고 브라우저에 맡긴다(lang은 en-US)', () => {
    expect(pickVoice([v('Yuna', 'ko-KR', true)], 'en-US')).toBeNull();
  });
});
