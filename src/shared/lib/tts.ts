/**
 * 브라우저 TTS로 영어 단어를 읽는다(F06). 지원하지 않거나 꺼져 있으면 조용히 넘어간다.
 * 첫 사용자 동작(시작 버튼·키 입력) 전에는 브라우저가 소리를 막을 수 있다.
 */
export function speak(text: string, lang = 'en-US'): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel(); // 앞의 단어가 끝나기 전에 새 동사를 얻으면 새 단어를 바로 읽는다
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.9;
  synth.speak(u);
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
