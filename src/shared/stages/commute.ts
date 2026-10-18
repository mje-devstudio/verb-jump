import type { StageData, VerbEntry } from './types';

/**
 * 1스테이지 '지각 직전 출근길' 목업(서버 응답 원본). PRD API 명세의 예시 형태 그대로다.
 * break·brake는 PRD 그대로, 나머지 넷은 초안이다.
 * ⚠ P0 리뷰 "학습 콘텐츠 검수"(사전 대조) 전이므로 확정 콘텐츠가 아니다.
 */
const verbs: Record<string, VerbEntry> = {
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

export const COMMUTE_STAGE: StageData = {
  id: 'commute',
  title: 'STAGE 1 · 지각 직전 출근길',
  clock: { start: '08:57', deadline: '09:00' },
  map: '/maps/commute.tmj',
  spellWord: 'BREAK',
  verbs,
};

/** 서버가 가진 스테이지 목록. */
export const STAGES: Readonly<Record<string, StageData>> = { commute: COMMUTE_STAGE };
