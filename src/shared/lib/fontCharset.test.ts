import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COMMUTE_STAGE } from '../stages/commute';
import { fontCharset } from './fontCharset';

/** 픽셀 글꼴로 그리는 곳: 게임 HUD·단어 카드(font-pixel). */
const PIXEL_FONT_SOURCES = ['src/features/hud/Hud.tsx', 'src/features/hud/WordCard.tsx'];

function missing(text: string, charset: Set<string>) {
  return [...new Set(text)].filter((c) => c.trim() && !charset.has(c));
}

describe('F19 갈무리 부분 집합', () => {
  const charset = new Set(fontCharset());

  it('ASCII, KS X 1001 한글 2,350자, 발음 기호를 담는다', () => {
    expect([...charset].filter((c) => c >= '가' && c <= '힣')).toHaveLength(2350);
    expect(['A', '~', '♥', 'ː', 'ɪ', 'æ'].every((c) => charset.has(c))).toBe(true);
  });

  it('스테이지 동사 데이터의 글자가 모두 들어 있다', () => {
    const text = Object.entries(COMMUTE_STAGE.verbs)
      .map(([verb, e]) => [verb, ...Object.values(e)].join(' '))
      .join(' ');
    expect(missing(text + COMMUTE_STAGE.spellWord, charset)).toEqual([]);
  });

  it('HUD·단어 카드 화면 글자(한글)가 모두 들어 있다', () => {
    const hangul = PIXEL_FONT_SOURCES.map((f) => readFileSync(f, 'utf8'))
      .join('')
      .replace(/[^가-힣]/g, '');
    expect(missing(hangul, charset)).toEqual([]);
  });
});
