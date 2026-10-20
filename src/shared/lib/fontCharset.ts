/**
 * F19: 갈무리11 부분 집합에 넣는 글자. 게임 HUD·단어 카드는 이 글자만 픽셀 글꼴로 그리고,
 * 나머지는 기본 글꼴로 대신 그린다(빠진 글자가 있어도 깨지지 않는다).
 * - 출력 가능한 ASCII 95자
 * - KS X 1001 완성형 한글 2,350자(일상 한글 대부분)
 * - 발음 기호: Latin-1 보충(æ·ð 등), IPA 확장, 간격 수식 문자(ː·ˈ 등). 원본에 없는 글자는 빠진다
 * - HUD 기호
 */
export const FONT_EXTRA_CHARS = '♥♡·…→←↑↓★☆';

export function fontCharset(): string {
  let out = '';
  for (let c = 32; c < 127; c++) out += String.fromCharCode(c);
  const euckr = new TextDecoder('euc-kr');
  for (let hi = 0xb0; hi <= 0xc8; hi++) {
    for (let lo = 0xa1; lo <= 0xfe; lo++) {
      const ch = euckr.decode(new Uint8Array([hi, lo]));
      if (ch.length === 1 && ch >= '가' && ch <= '힣') out += ch;
    }
  }
  const ranges: [number, number][] = [
    [0xa0, 0xff],
    [0x250, 0x2ff],
  ];
  for (const [a, b] of ranges) for (let c = a; c <= b; c++) out += String.fromCharCode(c);
  return out + FONT_EXTRA_CHARS;
}
