import type { AbilityId } from '../abilities/types';

/** GET /api/stages/:id 응답의 verbs 항목(PRD API 명세). F01에서 서버 응답으로 바뀐다. */
export interface VerbEntry {
  meaning: string;
  alsoMeans?: string;
  phonetic: string;
  example: string;
  ability: AbilityId;
  confusedWith?: string;
}

/**
 * 1스테이지 동사 목업. break·brake는 PRD 그대로, 나머지 넷은 초안이다.
 * ⚠ P0 리뷰 "학습 콘텐츠 검수"(사전 대조) 전이므로 확정 콘텐츠가 아니다.
 */
export const COMMUTE_VERBS: Readonly<Record<string, VerbEntry>> = {
  climb: { meaning: '오르다', phonetic: '/klaɪm/', example: 'Climb the wall.', ability: 'climb' },
  float: { meaning: '뜨다', phonetic: '/floʊt/', example: 'Float over the gap.', ability: 'float' },
  break: {
    meaning: '부수다',
    alsoMeans: '휴식 (take a break)',
    phonetic: '/breɪk/',
    example: 'Break the wall.',
    ability: 'break',
    confusedWith: 'brake',
  },
  sleep: {
    meaning: '자다',
    phonetic: '/sliːp/',
    example: "Don't sleep on the subway.",
    ability: 'joke-sleep',
  },
  dance: { meaning: '춤추다', phonetic: '/dæns/', example: "Let's dance!", ability: 'joke-dance' },
  brake: {
    meaning: '브레이크를 밟다',
    phonetic: '/breɪk/',
    example: 'Brake at the red light.',
    ability: 'joke-brake',
    confusedWith: 'break',
  },
};
