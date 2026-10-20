import { STAGES } from '../../src/shared/stages/commute.js';
import { applyChaos, error, json, readChaos, realDeps, type Deps } from '../_lib/http.js';

/** URL 경로 /api/stages/:id 에서 id를 꺼낸다. 깨진 퍼센트 인코딩이면 null(리뷰 3). */
export function stageIdFrom(url: URL): string | null {
  try {
    return decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1) ?? '');
  } catch {
    return null;
  }
}

/** GET /api/stages/:id — 스테이지 정보, 맵 주소, 동사 데이터(F01). 200 · 404 · 500. */
export async function handleGetStage(request: Request, deps: Deps = realDeps): Promise<Response> {
  const url = new URL(request.url);
  if (await applyChaos(readChaos(url), deps)) {
    return error(500, 'STAGE_UNAVAILABLE', '스테이지를 불러오지 못했어요.');
  }
  const id = stageIdFrom(url);
  // 자기 키만 본다: __proto__·constructor 같은 이름으로 객체 기본 속성이 나가지 않게(리뷰 3)
  if (id === null || !Object.hasOwn(STAGES, id)) {
    return error(404, 'STAGE_NOT_FOUND', '없는 스테이지예요.');
  }
  return json(STAGES[id]);
}

/** Vercel 서버리스 함수(Web 표준 핸들러). 실제 Vercel 실행은 F13 배포 때 확인한다. */
export function GET(request: Request): Promise<Response> {
  return handleGetStage(request);
}
