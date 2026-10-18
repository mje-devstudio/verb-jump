import { useQuery } from '@tanstack/react-query';
import { useDevSettings } from '../devtools/devSettings';
import { fetchLevel, fetchStage } from './api';

/** queryKey 팩토리: 요청을 결정하는 입력(스테이지 id, 지연·실패 설정)을 모두 넣는다. */
export const stageKeys = {
  stage: (id: string, delayMs: number, failRate: number) =>
    ['stage', id, { delayMs, failRate }] as const,
  level: (id: string, map: string) => ['level', id, map] as const,
};

/** PRD F01: 자동 재시도 1회. */
export const STAGE_RETRY = 1;

/**
 * 스테이지(API) → 맵(.tmj) 순서로 받는다. 스테이지 데이터는 한 판 동안 바뀌지 않아 staleTime을 무한으로 둔다.
 */
export function useStage(id: string) {
  const chaos = useDevSettings();
  const stage = useQuery({
    queryKey: stageKeys.stage(id, chaos.delayMs, chaos.failRate),
    queryFn: ({ signal }) => fetchStage(id, chaos, signal),
    retry: STAGE_RETRY,
    staleTime: Infinity,
  });
  const level = useQuery({
    queryKey: stageKeys.level(id, stage.data?.map ?? ''),
    queryFn: ({ signal }) => {
      if (!stage.data) throw new Error('스테이지가 아직 없습니다');
      return fetchLevel(stage.data, signal);
    },
    enabled: stage.data !== undefined,
    retry: STAGE_RETRY,
    staleTime: Infinity,
  });
  const error = stage.error ?? level.error;
  return {
    stage: stage.data,
    level: level.data,
    status: error ? ('error' as const) : level.data ? ('ready' as const) : ('loading' as const),
    error,
    retry: () => (stage.error ? stage.refetch() : level.refetch()),
  };
}
