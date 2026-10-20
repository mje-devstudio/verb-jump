/**
 * 브라우저 TTS로 영어 단어를 읽는다(F06). 지원하지 않거나 꺼져 있으면 조용히 넘어간다.
 * 첫 사용자 동작(시작 버튼·키 입력) 전에는 브라우저가 소리를 막을 수 있다.
 */
let speaking: SpeechSynthesisUtterance | null = null;

export function speak(
  text: string,
  opts: { lang?: string; volume?: number; onStart?: () => void; onEnd?: () => void } = {},
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const lang = opts.lang ?? 'en-US';
  const synth = window.speechSynthesis;
  // 앞의 단어가 끝나기 전에 새 동사를 얻으면 새 단어를 바로 읽는다.
  // 취소된 앞 단어의 끝 알림이 새 단어 도중에 와서 효과음 볼륨을 되돌리지 않게 먼저 뗀다.
  if (speaking) {
    speaking.onend = null;
    speaking.onerror = null;
  }
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  speaking = u;
  u.lang = lang;
  u.rate = 0.85; // 한 단어라 조금 천천히, 또박또박
  u.volume = Math.min(1, Math.max(0, opts.volume ?? 1)); // 1이 브라우저 TTS의 최대값(더 키울 수 없다)
  const voice = pickVoice(synth.getVoices(), lang);
  if (voice) u.voice = voice;
  if (opts.onEnd) {
    u.onend = opts.onEnd;
    u.onerror = opts.onEnd;
  }
  opts.onStart?.();
  synth.speak(u);
}

/** 또렷하게 들리는 편인 영어 음성 이름(있으면 먼저 쓴다). */
const PREFERRED_VOICES = ['Google US English', 'Samantha', 'Microsoft Aria', 'Microsoft Jenny'];

/**
 * 읽을 음성을 고른다: 선호 목록 → 같은 언어(en-US)의 기기 내장 음성 → 같은 언어 아무거나 → 없으면 브라우저 기본.
 * 기본 음성이 한국어로 잡힌 기기에서 영어 단어를 한국어 음성으로 읽어 작게·뭉개져 들리는 것을 피한다.
 */
export function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | null {
  const same = voices.filter((v) => v.lang.replace('_', '-') === lang);
  for (const name of PREFERRED_VOICES) {
    const v = same.find((x) => x.name.startsWith(name));
    if (v) return v;
  }
  return same.find((v) => v.localService) ?? same[0] ?? null;
}

/**
 * 첫 사용자 동작(시작 버튼)에서 한 번 불러 브라우저 음성 출력을 깨운다.
 * iOS Safari 등은 사용자 동작 안에서 처음 재생해야 이후 재생을 허용한다.
 */
export function unlockSpeech(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  window.speechSynthesis.speak(u);
}
