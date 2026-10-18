/**
 * 철자 코인(F27). 모은 상태는 단어 길이만큼의 불리언 배열로 둔다(같은 글자가 두 번 나오는 단어도 다룰 수 있게).
 */

/** 단어에서 아직 안 모은 char 자리 하나를 채운다. 이미 다 모은 글자면 그대로. */
export function collectLetter(word: string, got: readonly boolean[], index: number): boolean[] {
  const next = [...got];
  if (index >= 0 && index < word.length) next[index] = true;
  return next;
}

export function isWordComplete(word: string, got: readonly boolean[]): boolean {
  return word.length > 0 && [...word].every((_, i) => got[i] === true);
}

/** HUD 표시 "B _ E _ K". */
export function spellMask(word: string, got: readonly boolean[]): string {
  return [...word].map((ch, i) => (got[i] ? ch : '_')).join(' ');
}
