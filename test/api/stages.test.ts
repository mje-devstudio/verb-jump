import { describe, expect, it, vi } from 'vitest';
import { parseStageData } from '../../src/shared/stages/types';
import { readChaos, type Deps } from '../../api/_lib/http';
import { handleGetStage } from '../../api/stages/[id]';

const deps = (random = 0.99): Deps & { sleep: ReturnType<typeof vi.fn> } => ({
  sleep: vi.fn(() => Promise.resolve()),
  random: () => random,
});
const get = (path: string, d: Deps = deps()) =>
  handleGetStage(new Request(`http://localhost${path}`), d);

describe('F01 GET /api/stages/:id', () => {
  it('200: PRD 명세 형태의 스테이지(검증 통과)', async () => {
    const res = await get('/api/stages/commute');
    expect(res.status).toBe(200);
    const stage = parseStageData(await res.json());
    expect(stage).toMatchObject({ id: 'commute', map: '/maps/commute.tmj', spellWord: 'BREAK' });
    expect(stage.verbs.break).toMatchObject({
      alsoMeans: '휴식 (take a break)',
      confusedWith: 'brake',
    });
    expect(stage.verbs.brake?.ability).toBe('joke-brake');
  });

  it('404: 없는 스테이지는 공통 오류 형태', async () => {
    const res = await get('/api/stages/moon');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: 'STAGE_NOT_FOUND', message: '없는 스테이지예요.' },
    });
  });
});

describe('F02 지연·실패 재현', () => {
  it('fail=1이면 항상 500 STAGE_UNAVAILABLE', async () => {
    const res = await get('/api/stages/commute?fail=1');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: { code: 'STAGE_UNAVAILABLE', message: '스테이지를 불러오지 못했어요.' },
    });
  });

  it('fail=0.5는 난수가 0.5보다 작을 때만 실패', async () => {
    expect((await get('/api/stages/commute?fail=0.5', deps(0.49))).status).toBe(500);
    expect((await get('/api/stages/commute?fail=0.5', deps(0.5))).status).toBe(200);
  });

  it('delay만큼 기다린 뒤 응답한다(최대 3000ms)', async () => {
    const d = deps();
    await get('/api/stages/commute?delay=1000', d);
    expect(d.sleep).toHaveBeenCalledWith(1000);
    expect(readChaos(new URL('http://x/?delay=99999')).delayMs).toBe(3000);
  });

  it('잘못된 값은 지연·실패 없음으로 본다', () => {
    expect(readChaos(new URL('http://x/?delay=abc&fail=0.3'))).toEqual({ delayMs: 0, failRate: 0 });
    expect(readChaos(new URL('http://x/?delay=-5'))).toEqual({ delayMs: 0, failRate: 0 });
  });
});
