import { readJson, writeJson } from '../../shared/lib/storage';

/** 이 기기의 최고 기록(저장 상태: localStorage). 서버 랭킹은 F18. */
export interface BestRecord {
  score: number;
  arrival: string;
  clearMs: number;
}

const key = (stageId: string) => `verb-jump:best:${stageId}`;

export function loadBest(stageId: string): BestRecord | null {
  const v = readJson(key(stageId));
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (
    typeof o.score !== 'number' ||
    typeof o.arrival !== 'string' ||
    typeof o.clearMs !== 'number'
  ) {
    return null;
  }
  return { score: o.score, arrival: o.arrival, clearMs: o.clearMs };
}

/** 랭킹 규칙과 같다: 점수가 높은 순, 같으면 출근 시각(clearMs)이 빠른 순. */
export function isBetter(a: BestRecord, b: BestRecord | null): boolean {
  if (!b) return true;
  return a.score > b.score || (a.score === b.score && a.clearMs < b.clearMs);
}

/** 최고 기록이면 저장하고 true. */
export function saveIfBest(stageId: string, rec: BestRecord): boolean {
  if (!isBetter(rec, loadBest(stageId))) return false;
  writeJson(key(stageId), rec);
  return true;
}
