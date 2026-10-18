import { isAbilityId, type AbilityId } from '../rules/abilities';

/** GET /api/stages/:id 응답의 verbs 항목(PRD API 명세). */
export interface VerbEntry {
  meaning: string;
  alsoMeans?: string;
  phonetic: string;
  example: string;
  ability: AbilityId;
  confusedWith?: string;
}

/** GET /api/stages/:id 응답(PRD API 명세). */
export interface StageData {
  id: string;
  title: string;
  clock: { start: string; deadline: string };
  /** Tiled 맵(.tmj) 주소. */
  map: string;
  spellWord: string;
  verbs: Record<string, VerbEntry>;
}

/** 모든 API가 같이 쓰는 오류 응답. */
export interface ApiErrorBody {
  error: { code: string; message: string };
}

export class StageFormatError extends Error {
  override name = 'StageFormatError';
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
function str(o: Rec, k: string, where: string): string {
  const v = o[k];
  if (typeof v !== 'string' || v === '')
    throw new StageFormatError(`${where}.${k}: 문자열이 아닙니다.`);
  return v;
}
function optStr(o: Rec, k: string, where: string): string | undefined {
  return o[k] === undefined ? undefined : str(o, k, where);
}

/** 서버 응답을 믿지 않고 하나씩 확인해 StageData로 만든다. */
export function parseStageData(raw: unknown): StageData {
  if (!isRec(raw)) throw new StageFormatError('스테이지: 객체가 아닙니다.');
  const clock = raw.clock;
  if (!isRec(clock)) throw new StageFormatError('스테이지.clock: 객체가 아닙니다.');
  if (!isRec(raw.verbs)) throw new StageFormatError('스테이지.verbs: 객체가 아닙니다.');
  const verbs: Record<string, VerbEntry> = {};
  for (const [verb, v] of Object.entries(raw.verbs)) {
    const where = `verbs.${verb}`;
    if (!isRec(v)) throw new StageFormatError(`${where}: 객체가 아닙니다.`);
    if (!isAbilityId(v.ability)) throw new StageFormatError(`${where}.ability: 모르는 능력입니다.`);
    const alsoMeans = optStr(v, 'alsoMeans', where);
    const confusedWith = optStr(v, 'confusedWith', where);
    verbs[verb] = {
      meaning: str(v, 'meaning', where),
      phonetic: str(v, 'phonetic', where),
      example: str(v, 'example', where),
      ability: v.ability,
      ...(alsoMeans ? { alsoMeans } : {}),
      ...(confusedWith ? { confusedWith } : {}),
    };
  }
  return {
    id: str(raw, 'id', '스테이지'),
    title: str(raw, 'title', '스테이지'),
    clock: { start: str(clock, 'start', 'clock'), deadline: str(clock, 'deadline', 'clock') },
    map: str(raw, 'map', '스테이지'),
    spellWord: str(raw, 'spellWord', '스테이지'),
    verbs,
  };
}
