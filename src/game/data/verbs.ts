import { COMMUTE_STAGE } from '../../shared/stages/commute';

export type { VerbEntry } from '../../shared/stages/types';

/** 테스트·회색 상자 맵용. 게임은 스테이지 API(F01) 응답의 verbs를 쓴다. */
export const COMMUTE_VERBS = COMMUTE_STAGE.verbs;
