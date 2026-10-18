import { parseTiledMap } from '../../game/level/tiled';
import type { LevelDef } from '../../game/world';
import { parseStageData, type StageData } from '../../shared/stages/types';
import type { DevSettings } from '../devtools/devSettings';

/** 서버가 공통 오류 형태로 답했거나 네트워크가 끊긴 경우. */
export class ApiError extends Error {
  override name = 'ApiError';
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function absolute(path: string): string {
  return new URL(path, window.location.origin).toString();
}

async function readError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: unknown; message?: unknown } };
    const code = typeof body.error?.code === 'string' ? body.error.code : 'HTTP_' + res.status;
    const message =
      typeof body.error?.message === 'string' ? body.error.message : '요청에 실패했어요.';
    return new ApiError(res.status, code, message);
  } catch {
    return new ApiError(res.status, 'HTTP_' + res.status, '요청에 실패했어요.');
  }
}

/** GET /api/stages/:id (F01). delay·fail은 개발자 토글(F02) 값. */
export async function fetchStage(
  id: string,
  chaos: DevSettings,
  signal?: AbortSignal,
): Promise<StageData> {
  const url = new URL(absolute(`/api/stages/${encodeURIComponent(id)}`));
  if (chaos.delayMs) url.searchParams.set('delay', String(chaos.delayMs));
  if (chaos.failRate) url.searchParams.set('fail', String(chaos.failRate));
  let res: Response;
  try {
    res = await fetch(url, signal ? { signal } : {});
  } catch {
    throw new ApiError(0, 'NETWORK', '인터넷 연결을 확인해 주세요.');
  }
  if (!res.ok) throw await readError(res);
  return parseStageData(await res.json());
}

/** 스테이지 응답의 map 주소에서 Tiled 맵을 받아 게임 레벨로 만든다. */
export async function fetchLevel(stage: StageData, signal?: AbortSignal): Promise<LevelDef> {
  let res: Response;
  try {
    res = await fetch(absolute(stage.map), signal ? { signal } : {});
  } catch {
    throw new ApiError(0, 'NETWORK', '인터넷 연결을 확인해 주세요.');
  }
  if (!res.ok) throw new ApiError(res.status, 'MAP_UNAVAILABLE', '맵을 불러오지 못했어요.');
  const level = parseTiledMap((await res.json()) as unknown, stage.verbs);
  return { ...level, spellWord: stage.spellWord };
}
